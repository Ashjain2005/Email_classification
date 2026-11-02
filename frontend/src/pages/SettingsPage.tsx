import React, { useEffect, useState } from 'react';
import {
  Settings,
  Shield,
  Lock,
  AlertCircle,
  CheckCircle2,
  GitBranch,
  Database,
  Cpu,
  Code2,
  Box,
  Palette,
  Check,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useTheme, AccentColor, ACCENT_PRESETS } from '../context/ThemeContext';

export const SettingsPage: React.FC = () => {
  const [gmailStatus, setGmailStatus] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { isDark, toggle, accent, setAccent, config } = useTheme();

  useEffect(() => {
    api.getGmailStatus()
      .then((data) => setGmailStatus(data))
      .catch(() => setGmailStatus({ configured: false, status: 'UNAVAILABLE' }))
      .finally(() => setLoading(false));
  }, []);

  const accentOptions: AccentColor[] = ['blue', 'indigo', 'emerald', 'slate'];

  const specItems = [
    { label: 'Framework Stack', value: 'Python 3.13, Scikit-learn, FastAPI, React + TypeScript', icon: <Code2 className="w-3.5 h-3.5 text-cyan-400" /> },
    { label: 'Feature Extraction', value: 'TF-IDF (1-2 n-grams, sublinear_tf)', icon: <Cpu className="w-3.5 h-3.5 text-violet-400" /> },
    { label: 'Vocabulary Dimension', value: '40,000 features', icon: <Box className="w-3.5 h-3.5 text-blue-400" /> },
    { label: 'Training Samples', value: '155,074 emails', icon: <Database className="w-3.5 h-3.5 text-emerald-400" /> },
    { label: 'Held-Out Test Samples', value: '38,768 emails', icon: <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> },
    { label: 'Persistence Layer', value: 'Joblib Pipeline + SQLite', icon: <GitBranch className="w-3.5 h-3.5 text-amber-400" /> },
  ];

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in-scale">
      {/* UI Appearance & Cyber Color Palette Switcher */}
      <div className={`cyber-card p-6 ${
        isDark ? 'bg-slate-900/85 border-slate-800/80 shadow-2xl' : 'bg-white border-slate-200/90 shadow-sm'
      }`}>
        <div className={`flex items-center justify-between pb-4 border-b mb-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-slate-950 shadow-md`}>
              <Palette className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className={`text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Visual Interface & Cyber Color Themes
              </h2>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Customize glowing accents, color palettes, and ambient matrix effects
              </span>
            </div>
          </div>

          <button
            onClick={toggle}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 active:scale-95 ${
              isDark
                ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{isDark ? 'Dark Mode Active' : 'Light Mode Active'}</span>
          </button>
        </div>

        <div>
          <label className={`text-xs font-black uppercase tracking-wider block mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Select Accent Color Scheme
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {accentOptions.map((opt) => {
              const cfg = ACCENT_PRESETS[opt];
              const isSelected = accent === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setAccent(opt)}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group active:scale-95 ${
                    isSelected
                      ? isDark
                        ? 'bg-slate-800/90 border-cyan-400/80 shadow-glow-cyan'
                        : 'bg-slate-50 border-cyan-500 shadow-md'
                      : isDark
                        ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="w-4 h-4 rounded-full shadow-md"
                      style={{ backgroundColor: cfg.hex }}
                    />
                    {isSelected && <Check className="w-4 h-4 text-cyan-400 font-black" />}
                  </div>
                  <span className={`text-xs font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {cfg.label}
                  </span>
                  <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {opt === 'blue' && 'Executive Sky Blue'}
                    {opt === 'indigo' && 'SaaS Modern Indigo'}
                    {opt === 'emerald' && 'Security Mint Green'}
                    {opt === 'slate' && 'Monochrome Slate'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Gmail Integration */}
      <div className={`cyber-card p-6 space-y-4 ${
        isDark ? 'bg-slate-900/85 border-slate-800/80 shadow-2xl' : 'bg-white border-slate-200/90 shadow-sm'
      }`}>
        <div className={`flex items-center justify-between pb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 font-black text-sm">
              M
            </div>
            <div>
              <h2 className={`text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Future Gmail Integration Architecture
              </h2>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Google Workspace & Gmail REST API (v1) connector roadmap
              </span>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
            isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {loading ? '...' : (gmailStatus?.status || 'NOT_CONFIGURED')}
          </span>
        </div>

        <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          MailGuard AI is engineered with strict decoupling between data connectors and classification services.
          The same ML pipeline that classifies CSV files can directly ingest live email streams once Google OAuth 2.0 credentials are supplied.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              OAuth 2.0 Protocol & Scopes
            </span>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Requires Google Cloud Console Project with OAuth 2.0 Client IDs. Minimum required scope:
            </p>
            <code className={`text-[10px] font-mono p-2 rounded-lg border block ${
              isDark ? 'bg-slate-900 border-slate-700 text-cyan-400' : 'bg-white border-slate-200 text-cyan-700'
            }`}>
              https://www.googleapis.com/auth/gmail.readonly
            </code>
          </div>

          <div className={`p-4 rounded-xl border space-y-2 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Security & Zero-Trust Rules
            </span>
            <ul className={`text-[11px] space-y-1.5 list-disc pl-4 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <li>Never stores user passwords or raw account credentials.</li>
              <li>Tokens stored encrypted in session or memory cache.</li>
              <li>Does not modify, delete, label, or move user emails.</li>
            </ul>
          </div>
        </div>

        <div className={`p-4 rounded-xl border text-xs space-y-2 ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <span className={`font-bold block ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>How to Enable Gmail Connector:</span>
          <ol className={`list-decimal pl-5 space-y-1 text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <li>Register a project in the Google Cloud Console.</li>
            <li>Enable the Gmail API service.</li>
            <li>Configure OAuth Consent Screen and create Web Application Credentials.</li>
            <li>Set <code className={`px-1 rounded ${isDark ? 'bg-slate-700 text-cyan-400' : 'bg-slate-200 text-cyan-700'}`}>GMAIL_CLIENT_ID</code> and <code className={`px-1 rounded ${isDark ? 'bg-slate-700 text-cyan-400' : 'bg-slate-200 text-cyan-700'}`}>GMAIL_CLIENT_SECRET</code> in backend env.</li>
          </ol>
        </div>
      </div>

      {/* Model Specifications */}
      <div className={`cyber-card p-6 ${
        isDark ? 'bg-slate-900/85 border-slate-800/80 shadow-2xl' : 'bg-white border-slate-200/90 shadow-sm'
      }`}>
        <div className={`pb-4 border-b mb-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <h2 className={`text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Model & System Specifications
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {specItems.map((item) => (
            <div key={item.label} className={`flex items-start gap-3 p-3.5 rounded-xl border ${
              isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isDark ? 'bg-slate-700/60' : 'bg-white border border-slate-200'}`}>
                {item.icon}
              </div>
              <div>
                <span className={`text-[11px] font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</span>
                <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Limitations */}
      <div className={`cyber-card p-6 ${
        isDark ? 'bg-slate-900/85 border-slate-800/80 shadow-2xl' : 'bg-white border-slate-200/90 shadow-sm'
      }`}>
        <div className={`pb-4 border-b mb-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <h3 className={`text-sm font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <AlertCircle className="w-4 h-4 text-amber-500" />
            System Limitations & Ethical Disclosure
          </h3>
        </div>
        <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          MailGuard AI is designed as an educational and enterprise-grade proof-of-concept spam classification system.
          While the model achieves an empirical accuracy of{' '}
          <strong className={isDark ? 'text-white' : 'text-slate-900'}>98.14%</strong> and F1-score of{' '}
          <strong className={isDark ? 'text-white' : 'text-slate-900'}>98.04%</strong> on the test benchmark,
          email security requires multi-layered defense including SPF/DKIM verification, domain reputation monitoring, and user awareness.
        </p>
      </div>
    </div>
  );
};
