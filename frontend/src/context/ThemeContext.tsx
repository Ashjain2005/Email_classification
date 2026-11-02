import React, { createContext, useContext, useEffect, useState } from 'react';

export type AccentColor = 'blue' | 'indigo' | 'emerald' | 'slate';

export interface AccentConfig {
  id: AccentColor;
  label: string;
  hex: string;
  gradient: string;
  activeBg: string;
  badgeCls: string;
  borderCls: string;
  textCls: string;
  buttonGradient: string;
}

export const ACCENT_PRESETS: Record<AccentColor, AccentConfig> = {
  blue: {
    id: 'blue',
    label: 'Executive Sky',
    hex: '#0284c7',
    gradient: 'from-sky-500 to-blue-600',
    activeBg: 'bg-sky-50 dark:bg-sky-950/40',
    badgeCls: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
    borderCls: 'border-sky-500/40',
    textCls: 'text-sky-600 dark:text-sky-400',
    buttonGradient: 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-sm',
  },
  indigo: {
    id: 'indigo',
    label: 'SaaS Indigo',
    hex: '#4f46e5',
    gradient: 'from-indigo-500 to-violet-600',
    activeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    badgeCls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
    borderCls: 'border-indigo-500/40',
    textCls: 'text-indigo-600 dark:text-indigo-400',
    buttonGradient: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-sm',
  },
  emerald: {
    id: 'emerald',
    label: 'Security Mint',
    hex: '#059669',
    gradient: 'from-emerald-500 to-teal-600',
    activeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    borderCls: 'border-emerald-500/40',
    textCls: 'text-emerald-600 dark:text-emerald-400',
    buttonGradient: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm',
  },
  slate: {
    id: 'slate',
    label: 'Monochrome Slate',
    hex: '#334155',
    gradient: 'from-slate-700 to-slate-900',
    activeBg: 'bg-slate-100 dark:bg-slate-800/60',
    badgeCls: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    borderCls: 'border-slate-400',
    textCls: 'text-slate-800 dark:text-slate-200',
    buttonGradient: 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 shadow-sm',
  },
};

interface ThemeContextValue {
  isDark: boolean;
  toggle: () => void;
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  config: AccentConfig;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  toggle: () => {},
  accent: 'blue',
  setAccent: () => {},
  config: ACCENT_PRESETS.blue,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Light mode is the default theme per prompt requirements
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('mailguard-theme');
      if (stored !== null) {
        return stored === 'dark';
      }
      return false; // Default to clean, modern Light Mode
    } catch {
      return false;
    }
  });

  const [accent, setAccentState] = useState<AccentColor>(() => {
    try {
      const stored = localStorage.getItem('mailguard-accent') as AccentColor;
      if (stored && ACCENT_PRESETS[stored]) {
        return stored;
      }
      return 'blue'; // Default to Executive Sky / Light Blue
    } catch {
      return 'blue';
    }
  });

  const setAccent = (newAccent: AccentColor) => {
    setAccentState(newAccent);
    try {
      localStorage.setItem('mailguard-accent', newAccent);
    } catch {}
  };

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('mailguard-theme', isDark ? 'dark' : 'light');
    } catch {}
  }, [isDark]);

  useEffect(() => {
    const conf = ACCENT_PRESETS[accent];
    if (conf) {
      document.documentElement.style.setProperty('--theme-accent', conf.hex);
    }
  }, [accent]);

  const toggle = () => setIsDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{
      isDark,
      toggle,
      accent,
      setAccent,
      config: ACCENT_PRESETS[accent] || ACCENT_PRESETS.blue
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
