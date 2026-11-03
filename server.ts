import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Target currency pairs requested by user
export const CURRENCY_PAIRS = [
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

interface QuoteCache {
  data: any;
  timestamp: number;
}

const quotesCache: Map<string, QuoteCache> = new Map();
const chartCache: Map<string, QuoteCache> = new Map();
const CACHE_TTL_MS = 15000; // 15 seconds cache for snappy updates without hitting rate limits

// Helper to fetch from Yahoo Finance with user-agent
async function fetchYahoo(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance responded with status ${response.status}`);
  }

  return response.json();
}

// API endpoint for batch quotes
app.get('/api/fx/quotes', async (req, res) => {
  const now = Date.now();
  const cached = quotesCache.get('all_quotes');
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return res.json({ success: true, source: 'cache', data: cached.data });
  }

  try {
    const results = await Promise.allSettled(
      CURRENCY_PAIRS.map(async (pair) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${pair.symbol}?interval=15m&range=1d`;
        const json = await fetchYahoo(url);
        const meta = json.chart?.result?.[0]?.meta;
        if (!meta) throw new Error('Missing meta');

        const price = meta.regularMarketPrice ?? 0;
        const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
        const change = price - previousClose;
        const changePct = previousClose > 0 ? (change / previousClose) * 100 : 0;

        return {
          symbol: pair.symbol,
          base: pair.base,
          quote: pair.quote,
          name: pair.name,
          priority: pair.priority,
          price,
          previousClose,
          change,
          changePct,
          dayHigh: meta.regularMarketDayHigh ?? price,
          dayLow: meta.regularMarketDayLow ?? price,
          fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
          currency: meta.currency,
          marketTime: meta.regularMarketTime,
          lastUpdated: new Date().toISOString(),
        };
      })
    );

    const successfulData = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value);

    if (successfulData.length > 0) {
      quotesCache.set('all_quotes', { data: successfulData, timestamp: now });
      return res.json({ success: true, source: 'live', data: successfulData });
    }

    if (cached) {
      return res.json({ success: true, source: 'stale_cache', data: cached.data });
    }

    res.status(500).json({ success: false, error: 'Could not fetch foreign exchange rates from Yahoo Finance' });
  } catch (error: any) {
    if (cached) {
      return res.json({ success: true, source: 'stale_cache', data: cached.data });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint for historical chart data
app.get('/api/fx/chart/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const range = (req.query.range as string) || '1d';
  const interval = (req.query.interval as string) || (range === '1d' ? '5m' : range === '5d' ? '15m' : range === '1mo' ? '1h' : '1d');

  const cacheKey = `${symbol}_${range}_${interval}`;
  const now = Date.now();
  const cached = chartCache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS * 2) {
    return res.json({ success: true, source: 'cache', data: cached.data });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
    const json = await fetchYahoo(url);
    const result = json.chart?.result?.[0];

    if (!result) {
      throw new Error('Chart data not available');
    }

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const opens = quotes.open || [];
    const highs = quotes.high || [];
    const lows = quotes.low || [];
    const closes = quotes.close || [];

    const points = timestamps
      .map((t: number, i: number) => {
        const close = closes[i];
        if (close === null || close === undefined) return null;
        return {
          time: t,
          open: opens[i] ?? close,
          high: highs[i] ?? close,
          low: lows[i] ?? close,
          close: close,
        };
      })
      .filter(Boolean);

    const payload = {
      symbol,
      meta: result.meta,
      range,
      interval,
      points,
      lastUpdated: new Date().toISOString(),
    };

    chartCache.set(cacheKey, { data: payload, timestamp: now });
    res.json({ success: true, source: 'live', data: payload });
  } catch (err: any) {
    if (cached) {
      return res.json({ success: true, source: 'stale_cache', data: cached.data });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// Static rates snapshot generator (used for static export / GitHub repo sync)
app.get('/api/fx/snapshot', async (_req, res) => {
  try {
    const cached = quotesCache.get('all_quotes');
    let quotes = cached?.data;

    if (!quotes || quotes.length === 0) {
      const response = await fetch(`http://localhost:${PORT}/api/fx/quotes`);
      const json = await response.json();
      quotes = json.data;
    }

    const snapshot = {
      generatedAt: new Date().toISOString(),
      source: 'Yahoo Finance',
      pairsCount: quotes?.length || 0,
      pairs: quotes || [],
    };

    res.json(snapshot);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Setup Vite middleware in dev or static server in prod
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ForexHub Server running on http://0.0.0.0:${PORT} (mode: ${isDev ? 'dev' : 'production'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
