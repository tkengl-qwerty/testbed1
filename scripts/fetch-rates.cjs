/**
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
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(pair.symbol)}?interval=15m&range=1d`;
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
      console.log(`  ✓ ${pair.symbol}: ${price}`);
    } catch (err) {
      console.warn(`  ✗ Error fetching ${pair.symbol}:`, err.message);
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
    console.log(`Successfully updated ${outFile} with ${results.length} pairs.`);
  }
}

updateRates().catch(console.error);
