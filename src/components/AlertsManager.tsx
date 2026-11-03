import React, { useState } from 'react';
import { Bell, Trash2, CheckCircle2, AlertTriangle, Plus, X } from 'lucide-react';
import { CurrencyPair, PriceAlert } from '../types/forex';
import { formatRate, CURRENCY_FLAGS } from '../utils/formatters';

interface AlertsManagerProps {
  pairs: CurrencyPair[];
  alerts: PriceAlert[];
  onAddAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => void;
  onDeleteAlert: (id: string) => void;
  onClearTriggered: () => void;
  activePairForModal?: CurrencyPair | null;
  onCloseModal?: () => void;
}

export const AlertsManager: React.FC<AlertsManagerProps> = ({
  pairs,
  alerts,
  onAddAlert,
  onDeleteAlert,
  onClearTriggered,
  activePairForModal,
  onCloseModal,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState(
    activePairForModal ? activePairForModal.symbol : 'USDIDR=X'
  );
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [targetPrice, setTargetPrice] = useState<string>('');

  const activePair = pairs.find((p) => p.symbol === selectedSymbol) || pairs[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(targetPrice);
    if (!priceNum || isNaN(priceNum) || priceNum <= 0) return;

    onAddAlert({
      symbol: selectedSymbol,
      condition,
      targetPrice: priceNum,
      createdPrice: activePair?.price || 0,
    });

    setTargetPrice('');
    if (onCloseModal) onCloseModal();
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            Rate Thresholds & Real-Time Alerts
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor target price levels for USD/IDR, USD/INR and major pairs
          </div>
        </div>

        {onCloseModal && (
          <button
            onClick={onCloseModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form to create alert */}
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Create Rate Watch
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Currency Pair
            </label>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            >
              {pairs.map((p) => (
                <option key={p.symbol} value={p.symbol}>
                  {CURRENCY_FLAGS[p.base]}{CURRENCY_FLAGS[p.quote]} {p.base}/{p.quote} ({p.name})
                </option>
              ))}
            </select>
            {activePair && (
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                Current: {formatRate(activePair.price, activePair.quote)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as 'above' | 'below')}
                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="above">Rises Above (≥)</option>
                <option value="below">Falls Below (≤)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target Rate
              </label>
              <input
                type="number"
                step="any"
                placeholder={activePair ? activePair.price.toString() : '0.00'}
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!targetPrice}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Set Rate Watch
          </button>
        </form>

        {/* Existing Alerts List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Watches ({alerts.length})
            </span>
            {alerts.some((a) => a.triggered) && (
              <button
                onClick={onClearTriggered}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear Triggered
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                No active rate alerts. Set a watch to be notified when USD/IDR or USD/INR reaches your target.
              </div>
            ) : (
              alerts.map((alert) => {
                const pair = pairs.find((p) => p.symbol === alert.symbol);
                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border flex items-center justify-between text-xs font-mono transition-colors ${
                      alert.triggered
                        ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <span>{alert.symbol.replace('=X', '')}</span>
                        <span className="text-slate-500 font-normal">
                          {alert.condition === 'above' ? '≥' : '≤'}
                        </span>
                        <span>{formatRate(alert.targetPrice, pair?.quote || '')}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-sans">
                        {alert.triggered ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Triggered
                          </span>
                        ) : (
                          <span>Created at {formatRate(alert.createdPrice, pair?.quote || '')}</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteAlert(alert.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
