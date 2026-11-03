import { GitHubRepoConfig, GitHubUser, GitHubRepoInfo } from '../types/forex';

const STORAGE_KEY = 'forexhub_github_config';

export function getSavedGitHubConfig(): GitHubRepoConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return {
    token: '',
    owner: '',
    repo: '',
    branch: 'main',
    workflowFileName: 'deploy.yml',
  };
}

export function saveGitHubConfig(config: GitHubRepoConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export async function verifyGitHubToken(token: string): Promise<GitHubUser> {
  const cleanToken = token.trim();
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Invalid GitHub token or token has expired.');
    }
    throw new Error(`GitHub user verification failed (Status ${res.status})`);
  }

  const user = await res.json();
  return {
    login: user.login,
    name: user.name || user.login,
    avatar_url: user.avatar_url,
    html_url: user.html_url,
  };
}

export async function getRepoInfo(token: string, owner: string, repo: string): Promise<GitHubRepoInfo> {
  const cleanToken = token.trim();
  const cleanOwner = owner.trim();
  const cleanRepo = repo.trim();

  const res = await fetch(`https://api.github.com/repos/${cleanOwner}/${cleanRepo}`, {
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Repository ${cleanOwner}/${cleanRepo} was not found or token lacks permissions.`);
    }
    throw new Error(`Could not access repository (Status ${res.status})`);
  }

  const data = await res.json();

  let hasPages = false;
  let pagesUrl: string | undefined = undefined;

  try {
    const pagesRes = await fetch(`https://api.github.com/repos/${cleanOwner}/${cleanRepo}/pages`, {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (pagesRes.ok) {
      const pagesData = await pagesRes.json();
      hasPages = true;
      pagesUrl = pagesData.html_url;
    }
  } catch (e) {
    // Pages not configured
  }

  return {
    name: data.name,
    full_name: data.full_name,
    default_branch: data.default_branch,
    has_pages: hasPages,
    pages_url: pagesUrl || `https://${cleanOwner.toLowerCase()}.github.io/${cleanRepo}/`,
    permissions: data.permissions,
  };
}

/**
 * Commits updated rates JSON file to GitHub repository
 */
export async function commitRatesToGitHub(
  config: GitHubRepoConfig,
  ratesData: any
): Promise<{ commitSha: string; htmlUrl: string }> {
  const { token, owner, repo, branch } = config;
  const filePath = 'public/data/rates.json';

  const headers = {
    Authorization: `Bearer ${token.trim()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // 1. Check if file already exists to get its current SHA
  let existingSha: string | undefined;
  try {
    const fileRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
      { headers }
    );
    if (fileRes.ok) {
      const fileData = await fileRes.json();
      existingSha = fileData.sha;
    }
  } catch (err) {
    // New file
  }

  // 2. Prepare payload
  const contentString = JSON.stringify(ratesData, null, 2);
  const contentBase64 = btoa(unescape(encodeURIComponent(contentString)));

  const payload: any = {
    message: `chore(forex): sync latest Yahoo Finance currency rates [skip ci]`,
    content: contentBase64,
    branch: branch || 'main',
  };

  if (existingSha) {
    payload.sha = existingSha;
  }

  const putRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!putRes.ok) {
    const errJson = await putRes.json().catch(() => ({}));
    throw new Error(errJson.message || `Failed to commit to GitHub (Status ${putRes.status})`);
  }

  const result = await putRes.json();
  return {
    commitSha: result.commit?.sha || '',
    htmlUrl: result.commit?.html_url || `https://github.com/${owner}/${repo}/commits/${branch}`,
  };
}

/**
 * Dispatches a GitHub Action workflow
 */
export async function triggerWorkflowDispatch(
  config: GitHubRepoConfig
): Promise<boolean> {
  const { token, owner, repo, branch, workflowFileName } = config;
  const workflowId = workflowFileName || 'deploy.yml';

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: branch || 'main',
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Could not trigger workflow ${workflowId} (Status ${res.status})`);
  }

  return true;
}
