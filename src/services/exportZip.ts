import JSZip from 'jszip';
import { CurrencyPair } from '../types/forex';

export const GITHUB_WORKFLOW_YML = `name: Deploy Forex Portal to GitHub Pages

on:
  push:
    branches:
      - main
  schedule:
    # Optional: Automatically refresh rates twice daily
    - cron: '0 0,12 * * *'
  workflow_dispatch:

permissions:
  contents: write
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: false

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci || npm install

      - name: Fetch Fresh Yahoo Finance Snapshot
        run: node scripts/fetch-rates.cjs || echo "Fallback to cached rates"

      - name: Build static site
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

export const FETCH_RATES_SCRIPT = `/**
 * Standalone rates updater for CI/CD & GitHub Actions
 * Pulls latest rates from Yahoo Finance and updates public/data/rates.json
 */
const fs = require('fs');
const path = require('path');

const PAIRS = [
  { symbol: 'USDIDR=X', base: 'USD', quote: 'IDR', name: 'US Dollar / Indonesian Rupiah', priority: 'featured' },
  { symbol: 'USDINR=X', base: 'USD', quote: 'INR', name: 'US Dollar / Indian Rupee', priority: 'featured' },
  { symbol: 'EURUSD=X', base: 'EUR', quote: 'USD', name: 'Euro / US Dollar', priority: 'major' },
  { symbol: 'GBPUSD=X', base: 'GBP', quote: 'USD', name: 'British Pound / US Dollar', priority: 'major' },
  { symbol: 'USDJPY=X', base: 'USD', quote: 'JPY', name: 'US Dollar / Japanese Yen', priority: 'major' },
  { symbol: 'AUDUSD=X', base: 'AUD', quote: 'USD', name: 'Australian Dollar / US Dollar', priority: 'major' },
  { symbol: 'USDCAD=X', base: 'USD', quote: 'CAD', name: 'US Dollar / Canadian Dollar', priority: 'major' },
  { symbol: 'USDCHF=X', base: 'USD', quote: 'CHF', name: 'US Dollar / Swiss Franc', priority: 'major' },
  { symbol: 'NZDUSD=X', base: 'NZD', quote: 'USD', name: 'New Zealand Dollar / US Dollar', priority: 'major' },
  { symbol: 'EURGBP=X', base: 'EUR', quote: 'GBP', name: 'Euro / British Pound', priority: 'major' },
];

async function updateRates() {
  console.log('Fetching live currency rates from Yahoo Finance...');
  const results = [];

  for (const pair of PAIRS) {
    try {
      const url = \`https://query1.finance.yahoo.com/v8/finance/chart/\${encodeURIComponent(pair.symbol)}?interval=15m&range=1d\`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (!res.ok) continue;
      const json = await res.json();
      const meta = json.chart?.result?.[0]?.meta;
      if (!meta) continue;

      const price = meta.regularMarketPrice || 0;
      const prevClose = meta.chartPreviousClose || price;
      const change = price - prevClose;
      const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

      results.push({
        ...pair,
        price,
        previousClose: prevClose,
        change,
        changePct,
        dayHigh: meta.regularMarketDayHigh || price,
        dayLow: meta.regularMarketDayLow || price,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
        currency: meta.currency,
        marketTime: meta.regularMarketTime,
        lastUpdated: new Date().toISOString()
      });
      console.log(\`  ✓ \${pair.symbol}: \${price}\`);
    } catch (err) {
      console.warn(\`  ✗ Error fetching \${pair.symbol}:\`, err.message);
    }
  }

  if (results.length > 0) {
    const payload = {
      generatedAt: new Date().toISOString(),
      source: 'Yahoo Finance via GitHub Action',
      pairsCount: results.length,
      pairs: results
    };

    const outDir = path.resolve(__dirname, '../public/data');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const outFile = path.join(outDir, 'rates.json');
    fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
    console.log(\`Successfully updated \${outFile} with \${results.length} pairs.\`);
  }
}

updateRates().catch(console.error);
`;

export const GITHUB_README_MD = `# ForexHub — Static Currency Dashboard with GitHub Integration

A lightning-fast, production-ready currency monitoring dashboard powered by live Yahoo Finance data, designed for 100% static hosting on **GitHub Pages**, Cloudflare Pages, Netlify, or Vercel.

## Features
- **Spotlight Currencies**: Live rates for **USD/IDR** (Indonesian Rupiah) and **USD/INR** (Indian Rupee) with day/52-week ranges.
- **Major Currency Pairs**: EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, USD/CHF, NZD/USD, EUR/GBP.
- **Interactive Financial Charts**: 1D, 5D, 1M, 6M, 1Y, 5Y with candlestick, line, and volume metrics.
- **Multi-Currency Converter**: Live calculations, inversion, cross-rates, and retail spread estimations.
- **Correlation Matrix**: Compare USD/IDR and USD/INR sensitivity against major currency trends.
- **GitHub Integration**:
  - Automated deployment workflow included (\`.github/workflows/deploy.yml\`).
  - Browser-to-repo sync using GitHub Personal Access Token.
  - Direct workflow dispatch trigger.
- **Resilient Static Architecture**:
  - Works offline or online with triple-fallback engine (Server API -> CORS Proxies -> Static snapshot).

## Quick GitHub Pages Setup (Free)
1. Push this project to your GitHub repository (e.g. \`https://github.com/your-username/forex-portal\`).
2. Go to **Settings** > **Pages** in your repository.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. That's it! GitHub will automatically trigger the \`.github/workflows/deploy.yml\` pipeline and publish your live static site at \`https://<your-username>.github.io/<repo-name>/\`.

## Local Development
\`\`\`bash
npm install
npm run dev
\`\`\`
Visit \`http://localhost:3000\`.
`;

/**
 * Generates and downloads a complete zip bundle for GitHub deployment
 */
export async function downloadGitHubStaticZip(pairs: CurrencyPair[]) {
  const zip = new JSZip();

  // 1. Add workflow file
  zip.file('.github/workflows/deploy.yml', GITHUB_WORKFLOW_YML);

  // 2. Add scripts
  zip.file('scripts/fetch-rates.cjs', FETCH_RATES_SCRIPT);

  // 3. Add documentation
  zip.file('README.md', GITHUB_README_MD);

  // 4. Add static snapshot
  const snapshotData = {
    generatedAt: new Date().toISOString(),
    source: 'Yahoo Finance Static Bundle',
    pairsCount: pairs.length,
    pairs,
  };
  zip.file('public/data/rates.json', JSON.stringify(snapshotData, null, 2));

  // 5. Generate zip blob
  const content = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(content);

  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `forexhub-github-static-bundle.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
