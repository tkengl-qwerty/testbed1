import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Maximize2,
} from 'lucide-react';
import { CurrencyPair, ChartData, TimeRange, ChartPoint } from '../types/forex';
import { fetchChartData } from '../services/fxApi';
import { formatRate, formatPercent, formatChange, CURRENCY_FLAGS } from '../utils/formatters';

interface InteractiveChartProps {
  pair: CurrencyPair;
  onOpenConvert: (base: string, quote: string) => void;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  pair,
  onOpenConvert,
}) => {
  const [range, setRange] = useState<TimeRange>('1mo');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Fetch chart data when symbol or range changes
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetchChartData(pair.symbol, range)
      .then((data) => {
        if (!isCancelled) {
          setChartData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch chart:', err);
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [pair.symbol, range]);

  const points = chartData?.points || [];

  // Compute stats over selected period
  const stats = useMemo(() => {
    if (points.length === 0) {
      return {
        min: pair.dayLow,
        max: pair.dayHigh,
        first: pair.previousClose,
        last: pair.price,
        change: pair.change,
        changePct: pair.changePct,
      };
    }
    const closes = points.map((p) => p.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const first = closes[0];
    const last = closes[closes.length - 1];
    const change = last - first;
    const changePct = first > 0 ? (change / first) * 100 : 0;
    return { min, max, first, last, change, changePct };
  }, [points, pair]);

  // Active hover point or last point
  const activePoint: ChartPoint | null = useMemo(() => {
    if (hoverIndex !== null && points[hoverIndex]) {
      return points[hoverIndex];
    }
    if (points.length > 0) {
      return points[points.length - 1];
    }
    return null;
  }, [hoverIndex, points]);

  // SVG Geometry Calculation
  const width = 760;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 35, left: 20 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const yRange = Math.max(0.00001, stats.max - stats.min);
  const yBuffer = yRange * 0.08;
  const yMin = stats.min - yBuffer;
  const yMax = stats.max + yBuffer;

  const getCoordinates = (p: ChartPoint, index: number, total: number) => {
    const x = padding.left + (index / (total - 1 || 1)) * graphWidth;
    const y = padding.top + (1 - (p.close - yMin) / (yMax - yMin || 1)) * graphHeight;
    return { x, y };
  };

  const pathD = useMemo(() => {
    if (points.length < 2) return '';
    return points.reduce((acc, point, index) => {
      const { x, y } = getCoordinates(point, index, points.length);
      return index === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [points, yMin, yMax]);

  const areaD = useMemo(() => {
    if (points.length < 2) return '';
    const first = getCoordinates(points[0], 0, points.length);
    const last = getCoordinates(points[points.length - 1], points.length - 1, points.length);
    const baselineY = padding.top + graphHeight;
    return `${pathD} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
  }, [pathD, points, yMin, yMax]);

  // Handle Mouse Move for Crosshair
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length < 2) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * width;
    const relativeX = Math.max(0, Math.min(graphWidth, svgX - padding.left));
    const ratio = relativeX / graphWidth;
    const index = Math.round(ratio * (points.length - 1));
    setHoverIndex(index);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (points.length === 0) return;
    const rows = ['Timestamp,Date,Open,High,Low,Close'];
    points.forEach((p) => {
      const dateStr = new Date(p.time * 1000).toISOString();
      rows.push(`${p.time},"${dateStr}",${p.open},${p.high},${p.low},${p.close}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pair.symbol}_${range}_data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isPeriodPositive = stats.change >= 0;
  const baseFlag = CURRENCY_FLAGS[pair.base] || '';
  const quoteFlag = CURRENCY_FLAGS[pair.quote] || '';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-xs">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl select-none">
            {baseFlag}{quoteFlag}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                {pair.base}/{pair.quote}
              </h2>
              {pair.priority === 'featured' && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Spotlight Target
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {pair.name} · Yahoo Finance Live Chart
            </div>
          </div>
        </div>

        {/* Range Selector (Functional Segmented Control) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800/90 rounded-lg text-xs">
            {(['1d', '5d', '1mo', '3mo', '6mo', '1y', '5y'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 font-medium uppercase rounded-md transition-colors whitespace-nowrap ${
                  range === r
                    ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            title="Download historical data CSV"
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Breakdown Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-slate-100 dark:border-slate-800 font-mono">
        <div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-sans">
            {hoverIndex !== null ? 'Selected Price' : 'Current Rate'}
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            {activePoint ? formatRate(activePoint.close, pair.quote) : formatRate(pair.price, pair.quote)}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-sans">
            {range.toUpperCase()} Range Change
          </div>
          <div
            className={`text-sm font-semibold flex items-center tabular-nums mt-0.5 ${
              isPeriodPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {isPeriodPositive ? (
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 mr-1" />
            )}
            {formatPercent(stats.changePct)} ({formatChange(stats.change, pair.quote)})
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-sans">Period Low</div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums mt-0.5">
            {formatRate(stats.min, pair.quote)}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-sans">Period High</div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums mt-0.5">
            {formatRate(stats.max, pair.quote)}
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative pt-4 w-full h-[320px] select-none">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id={`grad-${pair.symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop
                offset="0%"
                stopColor={isPeriodPositive ? '#10b981' : '#f43f5e'}
                stopOpacity="0.25"
              />
              <stop
                offset="100%"
                stopColor={isPeriodPositive ? '#10b981' : '#f43f5e'}
                stopOpacity="0.0"
              />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={width - padding.right}
            y2={padding.top}
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            y1={padding.top + graphHeight / 2}
            x2={width - padding.right}
            y2={padding.top + graphHeight / 2}
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            y1={padding.top + graphHeight}
            x2={width - padding.right}
            y2={padding.top + graphHeight}
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeWidth="1"
          />

          {/* Area fill */}
          {areaD && <path d={areaD} fill={`url(#grad-${pair.symbol})`} />}

          {/* Line stroke */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={isPeriodPositive ? '#10b981' : '#f43f5e'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Crosshair & Hover Tooltip */}
          {hoverIndex !== null && activePoint && (
            <g>
              {(() => {
                const { x, y } = getCoordinates(activePoint, hoverIndex, points.length);
                const dateStr = new Date(activePoint.time * 1000).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <>
                    {/* Vertical line */}
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={padding.top + graphHeight}
                      stroke="#0284c7"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    {/* Dot on line */}
                    <circle cx={x} cy={y} r="5" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />

                    {/* Tooltip badge */}
                    <g transform={`translate(${Math.min(width - 130, Math.max(10, x - 60))}, 10)`}>
                      <rect
                        width="120"
                        height="38"
                        rx="6"
                        className="fill-slate-900/90 dark:fill-slate-800/95 stroke-slate-700"
                      />
                      <text
                        x="60"
                        y="16"
                        textAnchor="middle"
                        className="fill-slate-300 text-[10px] font-sans"
                      >
                        {dateStr}
                      </text>
                      <text
                        x="60"
                        y="30"
                        textAnchor="middle"
                        className="fill-white text-[12px] font-mono font-bold"
                      >
                        {formatRate(activePoint.close, pair.quote)}
                      </text>
                    </g>
                  </>
                );
              })()}
            </g>
          )}

          {/* Bottom Time Labels */}
          {points.length > 0 && (
            <>
              <text
                x={padding.left}
                y={height - 10}
                className="fill-slate-400 text-[10px] font-mono"
              >
                {new Date(points[0].time * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </text>
              <text
                x={padding.left + graphWidth / 2}
                y={height - 10}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] font-mono"
              >
                {new Date(points[Math.floor(points.length / 2)].time * 1000).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                })}
              </text>
              <text
                x={width - padding.right}
                y={height - 10}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono"
              >
                {new Date(points[points.length - 1].time * 1000).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                })}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Chart Footer with Quick Convert Button */}
      <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
        <div>
          52-Week Range: {pair.fiftyTwoWeekLow ? formatRate(pair.fiftyTwoWeekLow, pair.quote) : '—'} – {pair.fiftyTwoWeekHigh ? formatRate(pair.fiftyTwoWeekHigh, pair.quote) : '—'}
        </div>
        <button
          onClick={() => onOpenConvert(pair.base, pair.quote)}
          className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
        >
          Convert {pair.base} to {pair.quote} →
        </button>
      </div>
    </div>
  );
};
