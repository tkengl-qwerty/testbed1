import React, { useState, useEffect } from 'react';
import {
  Github,
  CheckCircle2,
  AlertCircle,
  Download,
  Play,
  UploadCloud,
  ExternalLink,
  Copy,
  Check,
  Shield,
  FileCode,
  BookOpen,
} from 'lucide-react';
import { CurrencyPair, GitHubRepoConfig, GitHubUser, GitHubRepoInfo } from '../types/forex';
import {
  getSavedGitHubConfig,
  saveGitHubConfig,
  verifyGitHubToken,
  getRepoInfo,
  commitRatesToGitHub,
  triggerWorkflowDispatch,
} from '../services/githubApi';
import { downloadGitHubStaticZip, GITHUB_WORKFLOW_YML } from '../services/exportZip';

interface GitHubDeploySectionProps {
  pairs: CurrencyPair[];
}

export const GitHubDeploySection: React.FC<GitHubDeploySectionProps> = ({ pairs }) => {
  const [config, setConfig] = useState<GitHubRepoConfig>(getSavedGitHubConfig());
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repoInfo, setRepoInfo] = useState<GitHubRepoInfo | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string; link?: string } | null>(null);
  const [copiedWorkflow, setCopiedWorkflow] = useState(false);
  const [activeTab, setActiveTab] = useState<'sync' | 'workflow' | 'guide'>('sync');

  // Verify on initial load if config has token and owner/repo
  useEffect(() => {
    if (config.token && config.owner && config.repo) {
      handleVerify(false);
    }
  }, []);

  const handleVerify = async (showSuccessMsg = true) => {
    if (!config.token.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a GitHub Personal Access Token.' });
      return;
    }
    setIsVerifying(true);
    setStatusMessage(null);

    try {
      const verifiedUser = await verifyGitHubToken(config.token);
      setUser(verifiedUser);

      if (config.owner && config.repo) {
        const repo = await getRepoInfo(config.token, config.owner, config.repo);
        setRepoInfo(repo);
        if (showSuccessMsg) {
          setStatusMessage({
            type: 'success',
            text: `Connected to repository ${repo.full_name} (${repo.has_pages ? 'GitHub Pages Enabled' : 'Ready for Pages'})`,
            link: repo.pages_url,
          });
        }
      } else {
        if (showSuccessMsg) {
          setStatusMessage({
            type: 'success',
            text: `Authenticated as @${verifiedUser.login}. Enter your repository details below.`,
          });
        }
      }
      saveGitHubConfig(config);
    } catch (err: any) {
      setUser(null);
      setRepoInfo(null);
      setStatusMessage({ type: 'error', text: err.message || 'Verification failed.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSyncToRepo = async () => {
    if (!config.token || !config.owner || !config.repo) {
      setStatusMessage({ type: 'error', text: 'Please specify your token, owner, and repository.' });
      return;
    }

    setIsSyncing(true);
    setStatusMessage(null);

    try {
      const snapshot = {
        generatedAt: new Date().toISOString(),
        source: 'Yahoo Finance via ForexHub GitHub Integration',
        pairsCount: pairs.length,
        pairs,
      };

      const result = await commitRatesToGitHub(config, snapshot);
      setStatusMessage({
        type: 'success',
        text: `Successfully committed latest rates to ${config.owner}/${config.repo}!`,
        link: result.htmlUrl,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to push rates to GitHub.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTriggerWorkflow = async () => {
    if (!config.token || !config.owner || !config.repo) {
      setStatusMessage({ type: 'error', text: 'Please configure repository connection first.' });
      return;
    }

    setIsTriggering(true);
    setStatusMessage(null);

    try {
      await triggerWorkflowDispatch(config);
      setStatusMessage({
        type: 'success',
        text: `Triggered '${config.workflowFileName}' workflow on GitHub Actions! Check Actions tab in your repository.`,
        link: `https://github.com/${config.owner}/${config.repo}/actions`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Could not dispatch workflow.' });
    } finally {
      setIsTriggering(false);
    }
  };

  const handleCopyWorkflow = () => {
    navigator.clipboard.writeText(GITHUB_WORKFLOW_YML);
    setCopiedWorkflow(true);
    setTimeout(() => setCopiedWorkflow(false), 2000);
  };

  const handleDownloadZip = () => {
    downloadGitHubStaticZip(pairs);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Github className="w-5 h-5" />
            GitHub Static Hosting & CI/CD Integration
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span>Automated GitHub Pages Deployment</span>
            <span aria-hidden="true">·</span>
            <span>Direct Repository Sync</span>
            <span aria-hidden="true">·</span>
            <span>Zero Hosting Cost</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800/90 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'sync'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Repo Sync
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'workflow'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Workflow File
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'guide'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Setup Guide
          </button>
        </div>
      </div>

      {/* Tab 1: Repo Sync */}
      {activeTab === 'sync' && (
        <div className="mt-6 space-y-6">
          {/* Quick Action Download Banner */}
          <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-sky-500" />
                Ready-to-Deploy Static Repo Bundle
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Download a complete ZIP with `.github/workflows/deploy.yml`, latest rates snapshot, and automated CI/CD scripts.
              </div>
            </div>
            <button
              onClick={handleDownloadZip}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download GitHub ZIP (.zip)
            </button>
          </div>

          {/* GitHub Credentials & Connection Form */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Direct GitHub API Integration
              </span>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Shield className="w-3 h-3 text-emerald-500" />
                Tokens are stored locally in your browser
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  GitHub Personal Access Token (PAT)
                </label>
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={config.token}
                  onChange={(e) => setConfig({ ...config, token: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
                <span className="block text-[11px] text-slate-400 mt-1">
                  Required scope: <code className="font-mono text-sky-500">repo</code> or Fine-grained <code className="font-mono text-sky-500">Contents: Read & Write</code>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Repository Owner
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. tkengl"
                    value={config.owner}
                    onChange={(e) => setConfig({ ...config, owner: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Repository Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. forex-portal"
                    value={config.repo}
                    onChange={(e) => setConfig({ ...config, repo: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Branch
                </label>
                <input
                  type="text"
                  placeholder="main"
                  value={config.branch}
                  onChange={(e) => setConfig({ ...config, branch: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Actions Workflow File
                </label>
                <input
                  type="text"
                  placeholder="deploy.yml"
                  value={config.workflowFileName}
                  onChange={(e) => setConfig({ ...config, workflowFileName: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Connection Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => handleVerify(true)}
                disabled={isVerifying}
                className="px-4 py-2 text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
              >
                {isVerifying ? 'Verifying...' : 'Verify Connection'}
              </button>

              <button
                onClick={handleSyncToRepo}
                disabled={isSyncing || !config.token}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                {isSyncing ? 'Committing...' : 'Commit Latest Rates to Repo'}
              </button>

              <button
                onClick={handleTriggerWorkflow}
                disabled={isTriggering || !config.token}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-sky-500 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 text-sky-500" />
                {isTriggering ? 'Dispatching...' : 'Trigger Deploy Workflow'}
              </button>
            </div>

            {/* Status Message Notification */}
            {statusMessage && (
              <div
                className={`p-3.5 rounded-lg text-xs flex items-start gap-2.5 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                )}
                <div>
                  <div>{statusMessage.text}</div>
                  {statusMessage.link && (
                    <a
                      href={statusMessage.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold underline mt-1"
                    >
                      View on GitHub <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Authenticated User Status Box */}
            {user && (
              <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <img
                    src={user.avatar_url}
                    alt={user.login}
                    className="w-7 h-7 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {user.name} (@{user.login})
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Targeting repo: {config.owner ? `${config.owner}/${config.repo}` : 'Not set'}
                    </div>
                  </div>
                </div>
                {repoInfo && repoInfo.has_pages && repoInfo.pages_url && (
                  <a
                    href={repoInfo.pages_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    Open Live Pages Site <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Workflow File Inspector */}
      {activeTab === 'workflow' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-sky-500" />
              <span>Location: <code>.github/workflows/deploy.yml</code></span>
            </div>
            <button
              onClick={handleCopyWorkflow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-800 hover:border-sky-500 text-slate-700 dark:text-slate-300 transition-colors"
            >
              {copiedWorkflow ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy YAML
                </>
              )}
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono overflow-x-auto leading-relaxed max-h-[420px]">
            {GITHUB_WORKFLOW_YML}
          </pre>
        </div>
      )}

      {/* Tab 3: Step-by-Step GitHub Pages Setup Guide */}
      {activeTab === 'guide' && (
        <div className="mt-6 space-y-5 text-xs text-slate-600 dark:text-slate-400">
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-500" />
              Hosting on GitHub Pages in 3 Steps
            </h3>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Create a GitHub Repository
                  </div>
                  <div className="mt-0.5">
                    Create a new repository on GitHub (public or private). Download the project zip or push your commits.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Enable GitHub Pages (Actions Source)
                  </div>
                  <div className="mt-0.5">
                    Navigate to your repo on GitHub &gt; <strong>Settings</strong> &gt; <strong>Pages</strong>. Under <strong>Build and deployment</strong>, change <strong>Source</strong> to <strong>GitHub Actions</strong>.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Automatic Continuous Deployment
                  </div>
                  <div className="mt-0.5">
                    Every time you push or trigger a sync, GitHub Actions automatically executes <code className="text-sky-500 font-mono">.github/workflows/deploy.yml</code>, fetches the latest Yahoo Finance data, builds the static bundle, and serves it live at <code className="text-sky-500 font-mono">https://&lt;username&gt;.github.io/&lt;repo&gt;/</code>!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
