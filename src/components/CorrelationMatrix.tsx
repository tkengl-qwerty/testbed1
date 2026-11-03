import React from 'react';
import { CurrencyPair } from '../types/forex';
import { formatPercent, CURRENCY_FLAGS } from '../utils/formatters';

interface CorrelationMatrixProps {
  pairs: CurrencyPair[];
  onSelectSymbol: (symbol: string) => void;
}

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({
  pairs,
  onSelectSymbol,
}) => {
  // Focus symbols + representative majors
  const matrixSymbols = ['USDIDR=X', 'USDINR=X', 'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'AUDUSD=X', 'USDCAD=X'];

  const matrixPairs = matrixSymbols
    .map((sym) => pairs.find((p) => p.symbol === sym))
    .filter((p): p is CurrencyPair => Boolean(p));

  // Compute a normalized directional correlation based on 24h movement against USD
  // For USD/XXX: positive changePct means USD strengthened against XXX (XXX weakened)
  // For XXX/USD: positive changePct means XXX strengthened against USD
  const getUsdStrengthImpact = (pair: CurrencyPair): number => {
    if (pair.base === 'USD') {
      return pair.changePct; // USD up
    } else {
      return -pair.changePct; // Base up means USD down
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Currency Sensitivity & Cross-Market Correlation
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span>Spotlight: IDR & INR Sensitivity</span>
            <span aria-hidden="true">·</span>
            <span>Normalized USD Movement Vectors</span>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          The table below tracks how each currency pair is reacting to US Dollar momentum.
          Positive values indicate the US Dollar is strengthening against the respective currency.
        </p>

        {/* Currency Sensitivity Ranking */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/40">
                <th className="py-2.5 px-3 font-semibold">Currency Pair</th>
                <th className="py-2.5 px-3 font-semibold text-right">24h Pair Change</th>
                <th className="py-2.5 px-3 font-semibold text-right">USD Relative Momentum</th>
                <th className="py-2.5 px-3 font-semibold text-right">IDR Relative Trajectory</th>
                <th className="py-2.5 px-3 font-semibold text-right">INR Relative Trajectory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {matrixPairs.map((pair) => {
                const usdImpact = getUsdStrengthImpact(pair);
                const idrPair = pairs.find((p) => p.symbol === 'USDIDR=X');
                const inrPair = pairs.find((p) => p.symbol === 'USDINR=X');

                // Relative divergence
                const idrDivergence = idrPair ? usdImpact - getUsdStrengthImpact(idrPair) : 0;
                const inrDivergence = inrPair ? usdImpact - getUsdStrengthImpact(inrPair) : 0;

                return (
                  <tr
                    key={pair.symbol}
                    onClick={() => onSelectSymbol(pair.symbol)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-sans font-medium text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{CURRENCY_FLAGS[pair.base]}{CURRENCY_FLAGS[pair.quote]}</span>
                      <span className="font-mono font-bold">{pair.base}/{pair.quote}</span>
                      {pair.priority === 'featured' && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-sans font-semibold">
                          Target
                        </span>
                      )}
                    </td>

                    <td
                      className={`py-3 px-3 text-right tabular-nums font-semibold ${
                        pair.changePct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatPercent(pair.changePct)}
                    </td>

                    <td
                      className={`py-3 px-3 text-right tabular-nums font-semibold ${
                        usdImpact >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {usdImpact > 0 ? '+' : ''}{usdImpact.toFixed(2)}%
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {idrDivergence > 0 ? '+' : ''}{idrDivergence.toFixed(2)}%
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {inrDivergence > 0 ? '+' : ''}{inrDivergence.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
