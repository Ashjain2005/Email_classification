import React from 'react';
import { X, ShieldAlert, ShieldCheck, Info, Tag, User, Mail, Zap } from 'lucide-react';
import { BatchMessageResult } from '../types';
import { useTheme } from '../context/ThemeContext';

interface EmailDetailModalProps {
  message: BatchMessageResult | null;
  onClose: () => void;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({ message, onClose }) => {
  const { isDark, config } = useTheme();
  if (!message) return null;

  const isSpam = message.prediction === 'Spam';
  const spamPct = (message.spam_probability * 100).toFixed(1);
  const hamPct = (message.ham_probability * 100).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(3, 7, 18, 0.75)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border shadow-2xl animate-fade-in-scale relative
          ${isDark ? 'bg-slate-900/95 border-slate-700/80 shadow-black/80' : 'bg-white border-slate-200'}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/80'}`}>
          <div className="flex items-center gap-3">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isSpam ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-glow-rose' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-glow-emerald'
            }`}>
              {isSpam ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </span>
            <div>
              <h2 className={`text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Message Security Inspection</h2>
              <span className={`text-xs font-mono ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>Record ID: #{message.id || message.index + 1}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Classification Banner */}
          <div className={`p-4 rounded-xl border flex items-start justify-between ${
            isSpam
              ? 'bg-rose-950/30 border-rose-800/50 shadow-glow-rose'
              : 'bg-emerald-950/30 border-emerald-800/50 shadow-glow-emerald'
          }`}>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider text-white ${isSpam ? 'bg-rose-600' : 'bg-emerald-600'}`}>
                  {message.prediction}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  message.risk_level === 'High' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                  message.risk_level === 'Medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {message.risk_level} Risk Level
                </span>
              </div>
              <p className={`text-xs leading-relaxed ${isSpam ? 'text-rose-300' : 'text-emerald-300'}`}>
                {isSpam
                  ? `${spamPct}% spam probability — vocabulary strongly aligns with deceptive or malicious email patterns.`
                  : `${hamPct}% legitimate probability — textual characteristics match standard verified workplace correspondence.`}
              </p>
            </div>
          </div>

          {/* Probability Bar */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-emerald-400">Ham: {hamPct}%</span>
              <span className="text-rose-400">Spam: {spamPct}%</span>
            </div>
            <div className={`w-full h-3 rounded-full overflow-hidden flex ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-l-full shadow-glow-emerald" style={{ width: `${message.ham_probability * 100}%` }} />
              <div className="bg-gradient-to-r from-rose-500 to-rose-600 h-full rounded-r-full shadow-glow-rose" style={{ width: `${message.spam_probability * 100}%` }} />
            </div>
            <div className={`flex items-center justify-end mt-2 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Confidence: <strong className={`ml-1 font-mono ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>{(message.confidence * 100).toFixed(1)}%</strong>
            </div>
          </div>

          {/* Metadata */}
          <div className={`space-y-2 rounded-xl border p-3.5 ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-2 text-xs">
              <Mail className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
              <span className={`font-bold w-16 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Subject:</span>
              <span className={`font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{message.subject || '(No subject)'}</span>
            </div>
            {message.sender && (
              <div className="flex items-center gap-2 text-xs">
                <User className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                <span className={`font-bold w-16 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Sender:</span>
                <span className={`font-mono truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{message.sender}</span>
              </div>
            )}
          </div>

          {/* Heuristics */}
          <div>
            <div className={`flex items-center gap-1.5 mb-2 text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              Heuristic Signal Analysis
            </div>
            {message.heuristic_signals && message.heuristic_signals.length > 0 ? (
              <div className="space-y-2">
                {message.heuristic_signals.map((sig, idx) => (
                  <div key={idx} className="p-3 rounded-xl border text-xs bg-amber-950/30 border-amber-800/40 shadow-glow-amber">
                    <div className="flex items-center justify-between font-bold mb-0.5">
                      <span className="text-amber-400">{sig.name}</span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-amber-900/50 text-amber-300">{sig.matched_terms}</span>
                    </div>
                    <p className="text-[11px] text-amber-500/80">{sig.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`p-3 rounded-xl border text-xs ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                No high-urgency keywords or suspicious heuristic triggers identified.
              </div>
            )}
          </div>

          {/* Email Content */}
          <div>
            <label className={`block text-[11px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Email Content Snippet
            </label>
            <div className={`p-4 rounded-xl border font-mono text-xs max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text ${
              isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              {message.snippet}
            </div>
          </div>

          {/* Caveat */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
            <p className="leading-relaxed">
              <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>System Caveat:</strong> ML evaluations are probabilistic assessments.
              A "Ham" classification does not guarantee harmlessness. Always apply standard zero-trust cybersecurity practices.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex justify-end ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/80'}`}>
          <button
            onClick={onClose}
            className={`px-5 py-2 text-xs font-bold rounded-xl border transition-all ${
              isDark
                ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm'
            }`}
          >
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  );
};
