import React from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, BarChart2 } from 'lucide-react';
import { CurrencyPair } from '../types/forex';
import { formatRate, formatPercent, formatChange, CURRENCY_FLAGS } from '../utils/formatters';

interface FeaturedCardsProps {
  pairs: CurrencyPair[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onOpenConvert: (base: string, quote: string) => void;
}

export const FeaturedCards: React.FC<FeaturedCardsProps> = ({
  pairs,
  selectedSymbol,
  onSelectSymbol,
  onOpenConvert,
}) => {
  // Focus pairs: USDIDR and USDINR, followed by EURUSD and USDJPY
  const prioritySymbols = ['USDIDR=X', 'USDINR=X', 'EURUSD=X', 'USDJPY=X'];
  const spotlightPairs = prioritySymbols
    .map((sym) => pairs.find((p) => p.symbol === sym))
    .filter((p): p is CurrencyPair => Boolean(p));

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Spotlight Pairs & Major Benchmarks
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span>Primary Focus: USD/IDR & USD/INR</span>
            <span aria-hidden="true">·</span>
            <span>Live Yahoo Finance Feeds</span>
            <span aria-hidden="true">·</span>
            <span>Tabular Tick Resolution</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {spotlightPairs.map((pair) => {
          const isPositive = pair.change >= 0;
          const isSelected = selectedSymbol === pair.symbol;
          const baseFlag = CURRENCY_FLAGS[pair.base] || '';
          const quoteFlag = CURRENCY_FLAGS[pair.quote] || '';

          // Day range calculation percentage
          const rangeSpan = Math.max(0.0001, pair.dayHigh - pair.dayLow);
          const currentProgress = Math.min(
            100,
            Math.max(0, ((pair.price - pair.dayLow) / rangeSpan) * 100)
          );

          return (
            <div
              key={pair.symbol}
              onClick={() => onSelectSymbol(pair.symbol)}
              className={`group cursor-pointer rounded-xl border p-5 transition-all duration-200 bg-white dark:bg-slate-900/80 hover:border-sky-500/50 ${
                isSelected
                  ? 'border-sky-500 ring-1 ring-sky-500 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:shadow-xs'
              }`}
            >
              {/* Header: Flags, Symbol & Quick Action */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl select-none" title={`${pair.base} to ${pair.quote}`}>
                    {baseFlag}{quoteFlag}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {pair.base}/{pair.quote}
                      </span>
                      {pair.priority === 'featured' && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          Focus
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                      {pair.name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenConvert(pair.base, pair.quote);
                    }}
                    title={`Convert ${pair.base} to ${pair.quote}`}
                    className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSymbol(pair.symbol);
                    }}
                    title="View chart analysis"
                    className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                  >
                    <BarChart2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Rate & Change */}
              <div className="mb-4">
                <div className="text-2xl font-bold font-mono tracking-tight tabular-nums text-slate-900 dark:text-white">
                  {formatRate(pair.price, pair.quote)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center text-xs font-semibold font-mono tabular-nums ${
                      isPositive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3.5 h-3.5 mr-1" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 mr-1" />
                    )}
                    {formatPercent(pair.changePct)} ({formatChange(pair.change, pair.quote)})
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">24h</span>
                </div>
              </div>

              {/* Day Range Spectrum Bar */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  <span>L: {formatRate(pair.dayLow, pair.quote)}</span>
                  <span>H: {formatRate(pair.dayHigh, pair.quote)}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-sky-500 dark:bg-sky-400 rounded-full transition-all duration-500"
                    style={{ width: `${currentProgress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
