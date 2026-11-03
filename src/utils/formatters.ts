export const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸',
  IDR: '🇮🇩',
  INR: '🇮🇳',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  JPY: '🇯🇵',
  AUD: '🇦🇺',
  CAD: '🇨🇦',
  CHF: '🇨🇭',
  NZD: '🇳🇿',
};

export const CURRENCY_NAMES: Record<string, string> = {
  USD: 'US Dollar',
  IDR: 'Indonesian Rupiah',
  INR: 'Indian Rupee',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  CHF: 'Swiss Franc',
  NZD: 'New Zealand Dollar',
};

export function formatRate(price: number, quoteCurrency: string): string {
  if (price === undefined || price === null || isNaN(price)) return '—';

  if (quoteCurrency === 'IDR') {
    return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  if (quoteCurrency === 'JPY') {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  }
  if (quoteCurrency === 'INR') {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 5 });
}

export function formatChange(change: number, quoteCurrency: string): string {
  if (change === undefined || isNaN(change)) return '—';
  const sign = change > 0 ? '+' : '';
  if (quoteCurrency === 'IDR') {
    return `${sign}${change.toFixed(1)}`;
  }
  if (quoteCurrency === 'JPY') {
    return `${sign}${change.toFixed(2)}`;
  }
  return `${sign}${change.toFixed(4)}`;
}

export function formatPercent(pct: number): string {
  if (pct === undefined || isNaN(pct)) return '0.00%';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatTimestamp(ts: string | number): string {
  try {
    const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return 'Just now';
  }
}
