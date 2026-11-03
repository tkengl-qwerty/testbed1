import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Clock,
  Radio,
  Github,
  Bell,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { CurrencyPair, PriceAlert } from './types/forex';
import { fetchAllQuotes, DataSourceTransport } from './services/fxApi';
import { Header } from './components/Header';
import { FeaturedCards } from './components/FeaturedCards';
import { CurrencyTable } from './components/CurrencyTable';
import { InteractiveChart } from './components/InteractiveChart';
import { Converter } from './components/Converter';
import { CorrelationMatrix } from './components/CorrelationMatrix';
import { GitHubDeploySection } from './components/GitHubDeploySection';
import { AlertsManager } from './components/AlertsManager';
import { formatTimestamp } from './utils/formatters';

const ALERTS_STORAGE_KEY = 'forexhub_price_alerts';

export default function App() {
  const [pairs, setPairs] = useState<CurrencyPair[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('USDIDR=X');
  const [activeTab, setActiveTab] = useState<'overview' | 'pairs' | 'converter' | 'correlations' | 'github'>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [transport, setTransport] = useState<DataSourceTransport>('server');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Modal states
  const [activeAlertPair, setActiveAlertPair] = useState<CurrencyPair | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [converterBase, setConverterBase] = useState('USD');
  const [converterQuote, setConverterQuote] = useState('IDR');
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);

  // Sync theme to document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Check alert triggers against latest prices
  const checkAlertTriggers = useCallback((currentPairs: CurrencyPair[]) => {
    setAlerts((prevAlerts) => {
      let triggeredAny = false;
      const updated = prevAlerts.map((alert) => {
        if (alert.triggered) return alert;
        const pair = currentPairs.find((p) => p.symbol === alert.symbol);
        if (!pair) return alert;

        const isTriggered =
          alert.condition === 'above'
            ? pair.price >= alert.targetPrice
            : pair.price <= alert.targetPrice;

        if (isTriggered) {
          triggeredAny = true;
          setNotificationBanner(
            `Rate Alert Triggered: ${pair.base}/${pair.quote} hit ${pair.price} (${alert.condition === 'above' ? '≥' : '≤'} ${alert.targetPrice})!`
          );
          return {
            ...alert,
            triggered: true,
            triggeredAt: new Date().toISOString(),
          };
        }
        return alert;
      });

      if (triggeredAny) {
        try {
          localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      return updated;
    });
  }, []);

  // Main data fetch function
  const loadRates = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const result = await fetchAllQuotes();
      setPairs(result.pairs);
      setTransport(result.transport);
      setLastRefreshed(new Date().toISOString());
      checkAlertTriggers(result.pairs);
    } catch (err: any) {
      console.error('Error fetching currency rates:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [checkAlertTriggers]);

  // Initial load
  useEffect(() => {
    loadRates(false);
  }, [loadRates]);

  // Auto-refresh interval (every 30 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      loadRates(false);
    }, 30000);
    return () => clearInterval(timer);
  }, [loadRates]);

  // Alert management handlers
  const handleAddAlert = (newAlert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => {
    const alert: PriceAlert = {
      ...newAlert,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      triggered: false,
    };
    const updated = [alert, ...alerts];
    setAlerts(updated);
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleDeleteAlert = (id: string) => {
    const updated = alerts.filter((a) => a.id !== id);
    setAlerts(updated);
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleClearTriggered = () => {
    const updated = alerts.filter((a) => !a.triggered);
    setAlerts(updated);
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(updated));
  };

  // Convert handler
  const handleOpenConvert = (base: string, quote: string) => {
    setConverterBase(base);
    setConverterQuote(quote);
    setActiveTab('converter');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Alert modal open
  const handleOpenAlertModal = (pair: CurrencyPair) => {
    setActiveAlertPair(pair);
    setIsAlertModalOpen(true);
  };

  const activePair = pairs.find((p) => p.symbol === selectedSymbol) || pairs[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Bar Contract Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenGitHubModal={() => setActiveTab('github')}
        onRefresh={() => loadRates(true)}
        isRefreshing={isRefreshing}
        transport={transport}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Real-time Notification Banner for Alerts */}
      {notificationBanner && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2 text-xs flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>{notificationBanner}</span>
            </div>
            <button
              onClick={() => setNotificationBanner(null)}
              className="text-[11px] underline hover:no-underline ml-4"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Market Telemetry Strip */}
        <section className="mb-6 flex flex-wrap items-center justify-between gap-4 py-2.5 px-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
              <Radio className="w-3.5 h-3.5 text-sky-500" />
              <span>Yahoo Finance FX Feeds</span>
            </div>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <div className="flex items-center gap-1.5">
              <span>Primary Pairs:</span>
              <strong className="text-slate-900 dark:text-slate-200 font-mono">USD/IDR</strong>
              <span>&</span>
              <strong className="text-slate-900 dark:text-slate-200 font-mono">USD/INR</strong>
            </div>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <div className="flex items-center gap-1.5">
              <span>Pipeline:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {transport === 'server'
                  ? 'Local Express Backend'
                  : transport === 'cors_proxy'
                  ? 'Direct CORS Proxy'
                  : 'Static Snapshot'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Updated: {lastRefreshed ? formatTimestamp(lastRefreshed) : 'Connecting...'}</span>
            </div>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <button
              onClick={() => loadRates(true)}
              className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              Auto-Sync (30s)
            </button>
          </div>
        </section>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-500 mb-4" />
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              Connecting to Yahoo Finance...
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pulling latest currency quotes for USD/IDR, USD/INR and major pairs
            </div>
          </div>
        ) : (
          <>
            {/* Tab 1: Full Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Spotlight Cards (USD/IDR, USD/INR, EUR/USD, USD/JPY) */}
                <FeaturedCards
                  pairs={pairs}
                  selectedSymbol={selectedSymbol}
                  onSelectSymbol={setSelectedSymbol}
                  onOpenConvert={handleOpenConvert}
                />

                {/* Split View: Interactive Chart + Converter */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-7">
                    {activePair && (
                      <InteractiveChart
                        pair={activePair}
                        onOpenConvert={handleOpenConvert}
                      />
                    )}
                  </div>
                  <div className="lg:col-span-5 space-y-6">
                    <Converter
                      pairs={pairs}
                      initialBase={converterBase}
                      initialQuote={converterQuote}
                    />
                  </div>
                </div>

                {/* Directory Table */}
                <div>
                  <CurrencyTable
                    pairs={pairs}
                    selectedSymbol={selectedSymbol}
                    onSelectSymbol={setSelectedSymbol}
                    onOpenConvert={handleOpenConvert}
                    onOpenAlert={handleOpenAlertModal}
                  />
                </div>

                {/* GitHub Static Hosting & Deployment Integration */}
                <div>
                  <GitHubDeploySection pairs={pairs} />
                </div>
              </div>
            )}

            {/* Tab 2: Pairs Directory & Chart View */}
            {activeTab === 'pairs' && (
              <div className="space-y-6">
                {activePair && (
                  <InteractiveChart
                    pair={activePair}
                    onOpenConvert={handleOpenConvert}
                  />
                )}
                <CurrencyTable
                  pairs={pairs}
                  selectedSymbol={selectedSymbol}
                  onSelectSymbol={setSelectedSymbol}
                  onOpenConvert={handleOpenConvert}
                  onOpenAlert={handleOpenAlertModal}
                />
              </div>
            )}

            {/* Tab 3: Currency Converter */}
            {activeTab === 'converter' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <Converter
                  pairs={pairs}
                  initialBase={converterBase}
                  initialQuote={converterQuote}
                />
                <FeaturedCards
                  pairs={pairs}
                  selectedSymbol={selectedSymbol}
                  onSelectSymbol={setSelectedSymbol}
                  onOpenConvert={handleOpenConvert}
                />
              </div>
            )}

            {/* Tab 4: Correlations */}
            {activeTab === 'correlations' && (
              <div className="space-y-6">
                <CorrelationMatrix
                  pairs={pairs}
                  onSelectSymbol={(sym) => {
                    setSelectedSymbol(sym);
                    setActiveTab('pairs');
                  }}
                />
              </div>
            )}

            {/* Tab 5: GitHub Static Hosting Integration */}
            {activeTab === 'github' && (
              <div className="space-y-6">
                <GitHubDeploySection pairs={pairs} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Alert Creator Modal */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="max-w-2xl w-full">
            <AlertsManager
              pairs={pairs}
              alerts={alerts}
              onAddAlert={handleAddAlert}
              onDeleteAlert={handleDeleteAlert}
              onClearTriggered={handleClearTriggered}
              activePairForModal={activeAlertPair}
              onCloseModal={() => setIsAlertModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-white">ForexHub</span>
            <span aria-hidden="true">·</span>
            <span>Static Hosting Architecture</span>
            <span aria-hidden="true">·</span>
            <span>Yahoo Finance Data Pipeline</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('github')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Deploy to GitHub Pages</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => {
                setActiveAlertPair(null);
                setIsAlertModalOpen(true);
              }}
              className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Manage Alerts ({alerts.length})</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
