import React, { useState } from 'react';
import { NavigationTab, HealthStatus } from '../types';
import { Sun, Moon, Palette, Check, Mail, Search, ShieldCheck } from 'lucide-react';
import { useTheme, AccentColor, ACCENT_PRESETS } from '../context/ThemeContext';

interface HeaderProps {
  currentTab: NavigationTab;
  health: HealthStatus | null;
  onSelectTab?: (tab: NavigationTab) => void;
}

const TAB_TITLES: Record<NavigationTab, { title: string; subtitle: string; tag: string }> = {
  dashboard: {
    title: 'Security Operations Overview',
    subtitle: 'Real-time classification metrics, threat distribution, and analysis activity',
    tag: 'Overview'
  },
  single: {
    title: 'Single Email Analyzer',
    subtitle: 'Token-level weight attribution, heuristic rule matching, and risk classification',
    tag: 'Diagnostic'
  },
  bulk: {
    title: 'Bulk Email Ingestion & Analysis',
    subtitle: 'High-throughput batch CSV classification with data preview and export',
    tag: 'Batch Pipeline'
  },
  inbox: {
    title: 'Inbox Integration & EML Security',
    subtitle: 'Direct IMAP TLS mailbox synchronization & RFC 822 MIME security analyzer',
    tag: 'Email Security'
  },
  performance: {
    title: 'Model Performance & Evaluation',
    subtitle: 'Held-out test benchmark metrics, confusion matrix, and model comparison',
    tag: 'ML Evaluation'
  },
  history: {
    title: 'Analysis History & Audit Log',
    subtitle: 'Persistent SQLite archive of analyzed batches and individual records',
    tag: 'Audit Logs'
  },
  settings: {
    title: 'Settings & Architecture',
    subtitle: 'System configuration, OAuth architecture, and security disclosures',
    tag: 'Configuration'
  }
};

export const Header: React.FC<HeaderProps> = ({ currentTab, health, onSelectTab }) => {
  const { isDark, toggle, accent, setAccent, config } = useTheme();
  const [showPaletteMenu, setShowPaletteMenu] = useState<boolean>(false);

  const current = TAB_TITLES[currentTab] || {
    title: 'MailGuard AI',
    subtitle: 'AI-Based Email Spam Classification System',
    tag: 'Active'
  };

  const accentOptions: AccentColor[] = ['blue', 'indigo', 'emerald', 'slate'];

  return (
    <header className={`h-16 px-6 lg:px-8 flex items-center justify-between shrink-0 border-b transition-all duration-200 z-20 ${
      isDark ? 'bg-[#0c1220]/90 border-slate-800/80' : 'bg-white/95 border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
    }`}>
      {/* Title & Category Tag */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className={`text-sm lg:text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {current.title}
            </h1>
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {current.tag}
            </span>
          </div>
          <p className={`text-xs mt-0.5 font-normal hidden sm:block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls & Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Launch Button */}
        {onSelectTab && currentTab !== 'single' && (
          <button
            onClick={() => onSelectTab('single')}
            className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 text-sky-300 border-sky-800/40 shadow-xs'
                : 'bg-sky-50 hover:bg-sky-100/80 text-sky-800 border-sky-200'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-sky-500" />
            <span>Test Single Email</span>
          </button>
        )}

        {/* Dynamic Color Theme Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPaletteMenu(!showPaletteMenu)}
            aria-label="Change Accent Color"
            className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Switch UI Accent Color"
          >
            <span
              className="w-3 h-3 rounded-full shadow-xs ring-1 ring-white/20"
              style={{ backgroundColor: config.hex }}
            />
            <span className="text-[11px] font-semibold hidden lg:inline tracking-tight">
              {config.label.split(' ')[1] || 'Theme'}
            </span>
          </button>

          {showPaletteMenu && (
            <div className={`absolute right-0 mt-2 w-48 rounded-xl border p-2 shadow-xl z-50 animate-slide-up ${
              isDark ? 'bg-slate-950 border-slate-800 shadow-black/80' : 'bg-white border-slate-200 shadow-lg'
            }`}>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
                Accent Theme
              </div>
              <div className="space-y-1">
                {accentOptions.map((opt) => {
                  const cfg = ACCENT_PRESETS[opt];
                  const isSelected = accent === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        setAccent(opt);
                        setShowPaletteMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? isDark ? 'bg-slate-800 text-white font-bold' : 'bg-slate-100 text-slate-900 font-bold'
                          : isDark ? 'text-slate-400 hover:bg-slate-900 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.hex }} />
                        <span>{cfg.label}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-sky-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Light / Dark Mode Toggle */}
        <button
          onClick={toggle}
          aria-label="Toggle Theme"
          className={`p-2 rounded-xl border transition-all ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-amber-300 hover:bg-slate-800'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* System Health Status Indicator */}
        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
          health?.status === 'healthy'
            ? isDark
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : isDark
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            health?.status === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500'
          }`} />
          <span className="font-semibold text-[11px]">
            {health?.status === 'healthy' ? 'Operational' : 'Connecting'}
          </span>
        </div>
      </div>
    </header>
  );
};
