import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Search,
  BarChart3,
  History,
  Settings,
  ShieldCheck,
  Mail,
  Zap,
  Activity,
  Layers
} from 'lucide-react';
import { NavigationTab, HealthStatus } from '../types';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  health: HealthStatus | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, health }) => {
  const { isDark, config } = useTheme();

  const navItems: {
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'single', label: 'Single Analyzer', icon: Search },
    { id: 'bulk', label: 'Bulk CSV Analysis', icon: FileSpreadsheet },
    { id: 'inbox', label: 'Inbox & EML Security', icon: Mail, badge: 'IMAP' },
    { id: 'performance', label: 'Model Performance', icon: BarChart3 },
    { id: 'history', label: 'Analysis History', icon: History },
    { id: 'settings', label: 'Settings & Architecture', icon: Settings },
  ];

  return (
    <aside className={`w-64 flex flex-col h-screen select-none shrink-0 border-r transition-all duration-200 z-30 ${
      isDark
        ? 'bg-[#0c1220] border-slate-800/80'
        : 'bg-white border-slate-200/90 shadow-[1px_0_3px_rgba(0,0,0,0.02)]'
    }`}>
      {/* Brand Header */}
      <div className={`h-16 flex items-center px-5 border-b gap-3 transition-colors ${
        isDark ? 'border-slate-800/80 bg-slate-900/40' : 'border-slate-100 bg-slate-50/50'
      }`}>
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white shadow-sm shrink-0`}>
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-base leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
              MailGuard
            </span>
            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 font-mono">
              AI
            </span>
          </div>
          <span className={`text-[10px] font-semibold tracking-wide uppercase block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Email Security Platform
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        <div className="px-3 pt-2 pb-1">
          <span className={`text-[10px] font-bold tracking-wider uppercase ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}>
            Workspace
          </span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all text-left ${
                isActive
                  ? isDark
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold'
                    : 'bg-sky-50 text-sky-800 border border-sky-200/80 font-bold shadow-xs'
                  : isDark
                    ? 'text-slate-400 hover:bg-slate-800/60 hover:text-white border border-transparent'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 transition-transform ${
                isActive
                  ? isDark ? 'text-sky-400' : 'text-sky-600'
                  : isDark ? 'text-slate-400' : 'text-slate-400'
              }`} />
              <span className="flex-1 tracking-tight">{item.label}</span>

              {item.badge && (
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-700'
                }`}>
                  {item.badge}
                </span>
              )}

              {isActive && (
                <div className={`w-1.5 h-3.5 rounded-full ${
                  isDark ? 'bg-sky-400' : 'bg-sky-600'
                }`} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Telemetry Footer Card */}
      <div className={`p-3.5 border-t transition-colors ${
        isDark ? 'border-slate-800/80 bg-slate-900/30' : 'border-slate-100 bg-slate-50/50'
      }`}>
        <div className={`p-3 rounded-xl border transition-all ${
          isDark
            ? 'bg-slate-900/80 border-slate-800'
            : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className={`text-[11px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                Engine Ready
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400">
              98.14% Acc
            </span>
          </div>

          <p className={`text-[10px] leading-tight truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {health?.model_name || 'Logistic Regression (40k TF-IDF)'}
          </p>
        </div>
      </div>
    </aside>
  );
};
