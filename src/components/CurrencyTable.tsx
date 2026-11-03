import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Search,
  ArrowUpRight,
  BarChart2,
  Bell,
} from 'lucide-react';
import { CurrencyPair } from '../types/forex';
import { formatRate, formatPercent, formatChange, CURRENCY_FLAGS, formatTimestamp } from '../utils/formatters';

interface CurrencyTableProps {
  pairs: CurrencyPair[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onOpenConvert: (base: string, quote: string) => void;
  onOpenAlert: (pair: CurrencyPair) => void;
}

type SortField = 'symbol' | 'price' | 'changePct' | 'name';
type SortOrder = 'asc' | 'desc';

export const CurrencyTable: React.FC<CurrencyTableProps> = ({
  pairs,
  selectedSymbol,
  onSelectSymbol,
  onOpenConvert,
  onOpenAlert,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'focus' | 'majors'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('changePct');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredPairs = useMemo(() => {
    return pairs.filter((pair) => {
      // Type filter
      if (filterType === 'focus' && pair.priority !== 'featured') return false;
      if (filterType === 'majors' && pair.priority === 'featured') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSymbol = pair.symbol.toLowerCase().includes(q);
        const matchesBase = pair.base.toLowerCase().includes(q);
        const matchesQuote = pair.quote.toLowerCase().includes(q);
        const matchesName = pair.name.toLowerCase().includes(q);
        return matchesSymbol || matchesBase || matchesQuote || matchesName;
      }
      return true;
    });
  }, [pairs, filterType, searchQuery]);

  const sortedPairs = useMemo(() => {
    return [...filteredPairs].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'symbol') {
        comparison = a.symbol.localeCompare(b.symbol);
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'price') {
        comparison = a.price - b.price;
      } else if (sortField === 'changePct') {
        comparison = a.changePct - b.changePct;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredPairs, sortField, sortOrder]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden shadow-xs">
      {/* Table Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Forex Rates Directory
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span>{filteredPairs.length} active currency pairs</span>
            <span aria-hidden="true">·</span>
            <span>Tick quote updates</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented Filter Control (Allowed functional tab buttons) */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800/90 rounded-lg text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Pairs
            </button>
            <button
              onClick={() => setFilterType('focus')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
                filterType === 'focus'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              IDR & INR Focus
            </button>
            <button
              onClick={() => setFilterType('majors')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
                filterType === 'majors'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Major FX
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter pair, IDR, INR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/40">
              <th className="py-3 px-4 font-semibold">
                <button
                  onClick={() => handleSort('symbol')}
                  className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                >
                  Pair Symbol
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-4 font-semibold text-right">
                <button
                  onClick={() => handleSort('price')}
                  className="flex items-center gap-1 ml-auto hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                >
                  Market Rate
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-4 font-semibold text-right">
                <button
                  onClick={() => handleSort('changePct')}
                  className="flex items-center gap-1 ml-auto hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                >
                  24h Change
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-4 font-semibold text-right hidden sm:table-cell">
                Day Range (Low - High)
              </th>
              <th className="py-3 px-4 font-semibold text-right hidden md:table-cell">
                52W Range
              </th>
              <th className="py-3 px-4 font-semibold text-right hidden lg:table-cell">
                Last Tick
              </th>
              <th className="py-3 px-4 font-semibold text-center w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
            {sortedPairs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400 font-sans">
                  No currency pairs match your search query.
                </td>
              </tr>
            ) : (
              sortedPairs.map((pair) => {
                const isSelected = selectedSymbol === pair.symbol;
                const isPositive = pair.change >= 0;
                const baseFlag = CURRENCY_FLAGS[pair.base] || '';
                const quoteFlag = CURRENCY_FLAGS[pair.quote] || '';

                const rangeSpan = Math.max(0.0001, pair.dayHigh - pair.dayLow);
                const dayProgress = Math.min(
                  100,
                  Math.max(0, ((pair.price - pair.dayLow) / rangeSpan) * 100)
                );

                return (
                  <tr
                    key={pair.symbol}
                    onClick={() => onSelectSymbol(pair.symbol)}
                    className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                      isSelected
                        ? 'bg-sky-50/60 dark:bg-sky-950/20'
                        : ''
                    }`}
                  >
                    {/* Pair Symbol & Name */}
                    <td className="py-3.5 px-4 font-sans">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base select-none">
                          {baseFlag}{quoteFlag}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-white">
                            <span>{pair.base}/{pair.quote}</span>
                            {pair.priority === 'featured' && (
                              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 font-sans">
                                Spotlight
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans truncate max-w-[140px] sm:max-w-none">
                            {pair.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Rate */}
                    <td className="py-3.5 px-4 text-right tabular-nums font-semibold text-slate-900 dark:text-white text-sm">
                      {formatRate(pair.price, pair.quote)}
                    </td>

                    {/* Change % */}
                    <td className="py-3.5 px-4 text-right tabular-nums">
                      <div
                        className={`inline-flex items-center justify-end font-semibold ${
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3 mr-1 shrink-0" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1 shrink-0" />
                        )}
                        <span>{formatPercent(pair.changePct)}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        {formatChange(pair.change, pair.quote)}
                      </div>
                    </td>

                    {/* Day Range */}
                    <td className="py-3.5 px-4 text-right tabular-nums hidden sm:table-cell">
                      <div className="flex items-center justify-end gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{formatRate(pair.dayLow, pair.quote)}</span>
                        <span>–</span>
                        <span>{formatRate(pair.dayHigh, pair.quote)}</span>
                      </div>
                      <div className="w-24 ml-auto h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full"
                          style={{ width: `${dayProgress}%` }}
                        />
                      </div>
                    </td>

                    {/* 52W Range */}
                    <td className="py-3.5 px-4 text-right tabular-nums hidden md:table-cell text-[11px] text-slate-500 dark:text-slate-400">
                      {pair.fiftyTwoWeekLow && pair.fiftyTwoWeekHigh ? (
                        <div>
                          {formatRate(pair.fiftyTwoWeekLow, pair.quote)} – {formatRate(pair.fiftyTwoWeekHigh, pair.quote)}
                        </div>
                      ) : (
                        <span>—</span>
                      )}
                    </td>

                    {/* Last Tick */}
                    <td className="py-3.5 px-4 text-right tabular-nums hidden lg:table-cell text-[11px] text-slate-400 dark:text-slate-500">
                      {formatTimestamp(pair.marketTime || pair.lastUpdated)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center font-sans">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSymbol(pair.symbol);
                          }}
                          title="View Interactive Chart"
                          aria-label={`View chart for ${pair.base}/${pair.quote}`}
                          className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenConvert(pair.base, pair.quote);
                          }}
                          title="Convert Pair"
                          aria-label={`Convert ${pair.base} to ${pair.quote}`}
                          className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAlert(pair);
                          }}
                          title="Set Rate Alert"
                          aria-label={`Set price alert for ${pair.base}/${pair.quote}`}
                          className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
