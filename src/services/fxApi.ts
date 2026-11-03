import { CurrencyPair, ChartData, TimeRange } from '../types/forex';

export type DataSourceTransport = 'server' | 'cors_proxy' | 'static_seed';

export let currentTransport: DataSourceTransport = 'server';

export const TRACKED_SYMBOLS = [
  { symbol: 'USDIDR=X', base: 'USD', quote: 'IDR', name: 'US Dollar / Indonesian Rupiah', priority: 'featured' as const },
  { symbol: 'USDINR=X', base: 'USD', quote: 'INR', name: 'US Dollar / Indian Rupee', priority: 'featured' as const },
  { symbol: 'EURUSD=X', base: 'EUR', quote: 'USD', name: 'Euro / US Dollar', priority: 'major' as const },
  { symbol: 'GBPUSD=X', base: 'GBP', quote: 'USD', name: 'British Pound / US Dollar', priority: 'major' as const },
  { symbol: 'USDJPY=X', base: 'USD', quote: 'JPY', name: 'US Dollar / Japanese Yen', priority: 'major' as const },
  { symbol: 'AUDUSD=X', base: 'AUD', quote: 'USD', name: 'Australian Dollar / US Dollar', priority: 'major' as const },
  { symbol: 'USDCAD=X', base: 'USD', quote: 'CAD', name: 'US Dollar / Canadian Dollar', priority: 'major' as const },
  { symbol: 'USDCHF=X', base: 'USD', quote: 'CHF', name: 'US Dollar / Swiss Franc', priority: 'major' as const },
  { symbol: 'NZDUSD=X', base: 'NZD', quote: 'USD', name: 'New Zealand Dollar / US Dollar', priority: 'major' as const },
  { symbol: 'EURGBP=X', base: 'EUR', quote: 'GBP', name: 'Euro / British Pound', priority: 'major' as const },
];

/**
 * Fetch quotes for all currency pairs
 */
export async function fetchAllQuotes(): Promise<{ pairs: CurrencyPair[]; transport: DataSourceTransport }> {
  // Strategy 1: Try local Express server endpoint
  try {
    const res = await fetch('/api/fx/quotes', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        currentTransport = 'server';
        return { pairs: data.data, transport: 'server' };
      }
    }
  } catch (err) {
    console.warn('Backend proxy /api/fx/quotes unavailable, attempting static hosting fallbacks...');
  }

  // Strategy 2: Client-side CORS Proxy direct to Yahoo Finance (For static hosting like GitHub Pages)
  try {
    const promises = TRACKED_SYMBOLS.map(async (item) => {
      const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.symbol)}?interval=15m&range=1d`;
      // Use corsproxy.io
      const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error('CORS proxy failed');
      const json = await res.json();
      const meta = json.chart?.result?.[0]?.meta;
      if (!meta) throw new Error('No meta');

      const price = meta.regularMarketPrice ?? 0;
      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
      const change = price - prevClose;
      const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

      return {
        symbol: item.symbol,
        base: item.base,
        quote: item.quote,
        name: item.name,
        priority: item.priority,
        price,
        previousClose: prevClose,
        change,
        changePct,
        dayHigh: meta.regularMarketDayHigh ?? price,
        dayLow: meta.regularMarketDayLow ?? price,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
        currency: meta.currency,
        marketTime: meta.regularMarketTime,
        lastUpdated: new Date().toISOString(),
      } as CurrencyPair;
    });

    const results = await Promise.allSettled(promises);
    const validPairs = results
      .filter((r): r is PromiseFulfilledResult<CurrencyPair> => r.status === 'fulfilled')
      .map((r) => r.value);

    if (validPairs.length > 0) {
      currentTransport = 'cors_proxy';
      return { pairs: validPairs, transport: 'cors_proxy' };
    }
  } catch (proxyErr) {
    console.warn('CORS proxy failed, reading static offline seed data...');
  }

  // Strategy 3: Read static /data/rates.json bundled snapshot
  try {
    const res = await fetch('/data/rates.json');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.pairs) && data.pairs.length > 0) {
        currentTransport = 'static_seed';
        return { pairs: data.pairs, transport: 'static_seed' };
      }
    }
  } catch (seedErr) {
    console.error('Failed to load static rates file', seedErr);
  }

  throw new Error('Unable to retrieve foreign exchange data. Please check connection.');
}

/**
 * Fetch chart data for a symbol and range
 */
export async function fetchChartData(symbol: string, range: TimeRange): Promise<ChartData> {
  const intervalMap: Record<TimeRange, string> = {
    '1d': '5m',
    '5d': '15m',
    '1mo': '1h',
    '3mo': '1d',
    '6mo': '1d',
    '1y': '1d',
    '5y': '1wk',
  };
  const interval = intervalMap[range] || '1d';

  // Strategy 1: Server proxy
  try {
    const res = await fetch(`/api/fx/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    // Fallback to CORS proxy
  }

  // Strategy 2: CORS Proxy
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;

  const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(7000) });
  if (!res.ok) {
    throw new Error(`Chart fetch failed: status ${res.status}`);
  }

  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error('No chart result');

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

  return {
    symbol,
    meta: result.meta,
    range,
    interval,
    points,
    lastUpdated: new Date().toISOString(),
  };
}
