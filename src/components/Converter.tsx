import React, { useState, useMemo } from 'react';
import { ArrowLeftRight, Calculator, Info } from 'lucide-react';
import { CurrencyPair } from '../types/forex';
import { CURRENCY_FLAGS, CURRENCY_NAMES, formatRate } from '../utils/formatters';

interface ConverterProps {
  pairs: CurrencyPair[];
  initialBase?: string;
  initialQuote?: string;
}

export const Converter: React.FC<ConverterProps> = ({
  pairs,
  initialBase = 'USD',
  initialQuote = 'IDR',
}) => {
  const [base, setBase] = useState(initialBase);
  const [quote, setQuote] = useState(initialQuote);
  const [amount, setAmount] = useState<number>(1000);

  // Available unique currencies
  const availableCurrencies = ['USD', 'IDR', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'];

  // Calculate rate between any base and quote via USD hub
  const conversionRate = useMemo(() => {
    if (base === quote) return 1;

    // Helper: get rate of USD -> target
    const getUsdTo = (curr: string): number => {
      if (curr === 'USD') return 1;
      // Is there a direct USD/CURR pair? (e.g. USDIDR=X, USDINR=X, USDJPY=X)
      const direct = pairs.find((p) => p.base === 'USD' && p.quote === curr);
      if (direct) return direct.price;
      // Is there an inverse CURR/USD pair? (e.g. EURUSD=X, GBPUSD=X, AUDUSD=X)
      const inverse = pairs.find((p) => p.base === curr && p.quote === 'USD');
      if (inverse && inverse.price > 0) return 1 / inverse.price;
      return 1;
    };

    const usdToBase = getUsdTo(base);
    const usdToQuote = getUsdTo(quote);

    if (usdToBase <= 0) return 0;
    // Rate: 1 Base = (1 / usdToBase) USD = (usdToQuote / usdToBase) Quote
    return usdToQuote / usdToBase;
  }, [base, quote, pairs]);

  const convertedValue = amount * conversionRate;
  const inverseRate = conversionRate > 0 ? 1 / conversionRate : 0;

  const handleSwap = () => {
    setBase(quote);
    setQuote(base);
  };

  const setPreset = (val: number, newBase?: string) => {
    setAmount(val);
    if (newBase) setBase(newBase);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-4 h-4 text-sky-500" />
            Live Currency Converter & Cross Rates
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time conversion for IDR, INR & major FX pairs
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {/* Converter Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-3">
          {/* Base Currency Box */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              You Send
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="any"
                value={isNaN(amount) ? '' : amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full text-xl sm:text-2xl font-bold font-mono tabular-nums bg-transparent text-slate-900 dark:text-white focus:outline-hidden"
                placeholder="0.00"
              />
              <select
                value={base}
                onChange={(e) => setBase(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white cursor-pointer hover:border-sky-500"
              >
                {availableCurrencies.map((c) => (
                  <option key={c} value={c}>
                    {CURRENCY_FLAGS[c]} {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
              {CURRENCY_NAMES[base] || base}
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSwap}
              title="Swap Currencies"
              className="p-2.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-sky-500 hover:border-sky-500 transition-all shadow-xs"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quote Currency Box */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Recipient Gets (Interbank Estimate)
            </label>
            <div className="flex items-center gap-2">
              <div className="w-full text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white truncate">
                {formatRate(convertedValue, quote)}
              </div>
              <select
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white cursor-pointer hover:border-sky-500"
              >
                {availableCurrencies.map((c) => (
                  <option key={c} value={c}>
                    {CURRENCY_FLAGS[c]} {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
              {CURRENCY_NAMES[quote] || quote}
            </div>
          </div>
        </div>

        {/* Rate Summary Strip */}
        <div className="p-3.5 rounded-lg bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">
              1 {base} = {formatRate(conversionRate, quote)} {quote}
            </span>
            <span className="text-slate-400 dark:text-slate-500">·</span>
            <span className="text-slate-500 dark:text-slate-400">
              1 {quote} = {formatRate(inverseRate, base)} {base}
            </span>
          </div>
          <div className="text-slate-500 dark:text-slate-400 text-[11px] font-sans">
            Mid-market exchange rate
          </div>
        </div>

        {/* Quick Amount Presets */}
        <div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2">
            Quick Amount Presets
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPreset(100, 'USD')}
              className="px-2.5 py-1 text-xs font-mono rounded-md border border-slate-200 dark:border-slate-800 hover:border-sky-500 text-slate-700 dark:text-slate-300"
            >
              $100 USD
            </button>
            <button
              onClick={() => setPreset(500, 'USD')}
              className="px-2.5 py-1 text-xs font-mono rounded-md border border-slate-200 dark:border-slate-800 hover:border-sky-500 text-slate-700 dark:text-slate-300"
            >
              $500 USD
            </button>
            <button
              onClick={() => setPreset(1000, 'USD')}
              className="px-2.5 py-1 text-xs font-mono rounded-md border border-slate-200 dark:border-slate-800 hover:border-sky-500 text-slate-700 dark:text-slate-300"
            >
              $1,000 USD
            </button>
            <button
              onClick={() => setPreset(10000000, 'IDR')}
              className="px-2.5 py-1 text-xs font-mono rounded-md border border-slate-200 dark:border-slate-800 hover:border-sky-500 text-slate-700 dark:text-slate-300"
            >
              10M IDR
            </button>
            <button
              onClick={() => setPreset(100000, 'INR')}
              className="px-2.5 py-1 text-xs font-mono rounded-md border border-slate-200 dark:border-slate-800 hover:border-sky-500 text-slate-700 dark:text-slate-300"
            >
              100k INR
            </button>
          </div>
        </div>

        {/* Bank Markup & Fee Comparison Breakdown */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 space-y-1">
          <div className="flex items-center justify-between">
            <span>Interbank Mid-Market Total:</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              {formatRate(convertedValue, quote)} {quote}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span>Standard Retail Bank Est. (~1.5% spread):</span>
            <span className="font-mono">
              {formatRate(convertedValue * 0.985, quote)} {quote}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
