import React from 'react';
import { Github, Sun, Moon, RefreshCw } from 'lucide-react';
import { DataSourceTransport } from '../services/fxApi';

interface HeaderProps {
  activeTab: 'overview' | 'pairs' | 'converter' | 'correlations' | 'github';
  setActiveTab: (tab: 'overview' | 'pairs' | 'converter' | 'correlations' | 'github') => void;
  onOpenGitHubModal: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  transport: DataSourceTransport;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenGitHubModal,
  onRefresh,
  isRefreshing,
  theme,
  toggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 h-16">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('overview');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
          >
            ForexHub
          </a>
        </div>

        {/* Zone 2: 4-5 Clean Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 hover:text-slate-900 dark:hover:text-white ${
              activeTab === 'overview'
                ? 'text-slate-950 dark:text-white font-semibold border-b-2 border-sky-500'
                : ''
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('pairs')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 hover:text-slate-900 dark:hover:text-white ${
              activeTab === 'pairs'
                ? 'text-slate-950 dark:text-white font-semibold border-b-2 border-sky-500'
                : ''
            }`}
          >
            Live Pairs
          </button>
          <button
            onClick={() => setActiveTab('converter')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 hover:text-slate-900 dark:hover:text-white ${
              activeTab === 'converter'
                ? 'text-slate-950 dark:text-white font-semibold border-b-2 border-sky-500'
                : ''
            }`}
          >
            Converter
          </button>
          <button
            onClick={() => setActiveTab('correlations')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 hover:text-slate-900 dark:hover:text-white ${
              activeTab === 'correlations'
                ? 'text-slate-950 dark:text-white font-semibold border-b-2 border-sky-500'
                : ''
            }`}
          >
            Correlations
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 hover:text-slate-900 dark:hover:text-white ${
              activeTab === 'github'
                ? 'text-slate-950 dark:text-white font-semibold border-b-2 border-sky-500'
                : ''
            }`}
          >
            GitHub Deploy
          </button>
        </nav>

        {/* Zone 3: Primary Action & Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh Live Yahoo Finance Rates"
            aria-label="Refresh rates"
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-500' : ''}`} />
          </button>

          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label="Toggle theme"
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenGitHubModal}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Sync</span>
          </button>
        </div>
      </div>
    </header>
  );
};
