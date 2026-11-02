import React, { useState, useRef } from 'react';
import {
  Search,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Clipboard,
  Copy,
  CheckCheck,
  Activity,
  CheckCircle2,
  Lock,
  Eye,
  FileText,
  Zap,
  Info,
  Flame,
  ArrowRight
} from 'lucide-react';
import { SinglePredictionResult } from '../types';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

const DEMO_TEMPLATES = [
  {
    label: '🎰 Lottery Scam',
    tag: 'Financial Fraud',
    subject: 'CONGRATULATIONS: You won $2,500,000.00 USD!',
    sender: 'Claim Agent <payout@international-sweepstakes-winner.com>',
    text: 'Dear Beneficiary, your email address was selected in the international sweepstakes lottery. To claim your funds immediately, wire transfer details and personal identification must be submitted to agent Mr. Robert.'
  },
  {
    label: '🔐 Phishing Alert',
    tag: 'Credential Theft',
    subject: 'URGENT: Your account access has been suspended',
    sender: 'Security Support <noreply@secure-banking-verification.net>',
    text: 'Security Alert: We noticed unauthorized login attempts on your profile. Click here immediately to verify your identity and password or your account will be permanently deactivated within 24 hours.'
  },
  {
    label: '💊 Pharma Promo',
    tag: 'Commercial Bulk',
    subject: 'Limited time offer: Prescription meds 70% off',
    sender: 'Global Rx Meds <discount@meds-express-direct.biz>',
    text: 'Save big on Viagra, Cialis, and other prescription medications. No doctor visit required. Order from our certified online pharmacy today and get free overnight shipping. Click the link below to order now!'
  },
  {
    label: '📅 Sprint Sync',
    tag: 'Legitimate Ham',
    subject: 'Notes from Tuesday Sprint Planning & System Architecture',
    sender: 'Sarah Jenkins <sjenkins@enterprise-tech.io>',
    text: 'Hi team, thanks for leading the sprint planning meeting today. I have pushed the bug fixes to the development branch and updated ticket PROJ-402. Let me know when you can review the pull request.'
  },
  {
    label: '☕ Schedule Chat',
    tag: 'Legitimate Ham',
    subject: 'Rescheduling our 2:00 PM catchup',
    sender: 'Alex Rivera <arivera@colleagues.org>',
    text: 'Hey everyone, something urgent came up with a client call. Would you be free to push our team coffee chat to tomorrow morning at 10:30 AM instead? Let me know.'
  }
];

export const SingleTestPage: React.FC = () => {
  const [subject, setSubject] = useState<string>('');
  const [sender, setSender] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<SinglePredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedResult, setCopiedResult] = useState<boolean>(false);
  const [highlightTriggers, setHighlightTriggers] = useState<boolean>(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isDark } = useTheme();
  const { showToast } = useToast();

  const wordCount = body.trim() === '' ? 0 : body.trim().split(/\s+/).length;
  const charCount = body.length;
  const MAX_CHARS = 5000;

  const handleRunAnalysis = async () => {
    if (!body.trim() && !subject.trim()) {
      setError('Please provide email body text or a subject to evaluate.');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await api.predictSingle(body, subject, sender);
      setResult(res);
      showToast(
        res.is_spam ? '⚠️ High risk spam detected' : '✅ Message verified as legitimate',
        res.is_spam ? 'error' : 'success'
      );
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
      showToast('Analysis request failed', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyTemplate = (tpl: typeof DEMO_TEMPLATES[0]) => {
    setSubject(tpl.subject);
    setSender(tpl.sender || '');
    setBody(tpl.text);
    setError(null);
    setResult(null);
    showToast(`Loaded: ${tpl.label}`, 'info');
  };

  const handleReset = () => {
    setSubject('');
    setSender('');
    setBody('');
    setResult(null);
    setError(null);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setBody(text.slice(0, MAX_CHARS));
        showToast('Pasted message from clipboard', 'info');
      }
    } catch {
      showToast('Unable to read from clipboard directly', 'error');
    }
  };

  const handleCopyResult = () => {
    if (!result) return;
    const summary = `MailGuard AI Evaluation:\nClassification: ${result.prediction}\nSpam Probability: ${(result.spam_probability * 100).toFixed(1)}%\nLegitimate Probability: ${(result.ham_probability * 100).toFixed(1)}%\nRisk Level: ${result.risk_level}\nConfidence: ${(result.confidence * 100).toFixed(1)}%\nModel: ${result.model_used}`;
    navigator.clipboard.writeText(summary);
    setCopiedResult(true);
    showToast('Result summary copied to clipboard', 'success');
    setTimeout(() => setCopiedResult(false), 2000);
  };

  const inputCls = `w-full text-xs rounded-xl px-3.5 py-2.5 border transition-all focus:outline-none ${
    isDark
      ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
  }`;

  // Highlight words in preview
  const renderHighlightedBody = () => {
    if (!result || !highlightTriggers || !result.token_explanations || result.token_explanations.length === 0) {
      return body;
    }

    const spamTokens = new Set(
      result.token_explanations
        .filter((t) => t.direction === 'spam')
        .map((t) => t.token.toLowerCase())
    );
    const hamTokens = new Set(
      result.token_explanations
        .filter((t) => t.direction === 'ham')
        .map((t) => t.token.toLowerCase())
    );

    const words = body.split(/(\s+|[.,!?:;"'()])/);
    return words.map((w, i) => {
      const cleanW = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanW && spamTokens.has(cleanW)) {
        return (
          <mark key={i} className="bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 font-semibold px-1 py-0.5 rounded mx-0.5" title="Spam Indicator">
            {w}
          </mark>
        );
      }
      if (cleanW && hamTokens.has(cleanW)) {
        return (
          <mark key={i} className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold px-1 py-0.5 rounded mx-0.5" title="Legitimate Indicator">
            {w}
          </mark>
        );
      }
      return w;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-scale">
      {/* Template Quick Select Bar */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
        isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-500 shrink-0" />
          <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Demonstration Templates:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {DEMO_TEMPLATES.map((tpl, i) => (
            <button
              key={i}
              onClick={() => handleApplyTemplate(tpl)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all text-left flex items-center gap-1.5 active:scale-95 ${
                isDark
                  ? 'bg-slate-900 border-slate-700 hover:border-sky-500/50 text-slate-300 hover:text-white'
                  : 'bg-slate-50 border-slate-200 hover:border-sky-400 text-slate-700 hover:text-slate-900'
              }`}
            >
              <span>{tpl.label}</span>
              <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                tpl.tag.includes('Fraud') || tpl.tag.includes('Theft') || tpl.tag.includes('Bulk')
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
              }`}>
                {tpl.tag}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Input Form */}
        <div className={`p-6 rounded-2xl border space-y-4 ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-500" />
              <h2 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Email Content Inspector
              </h2>
            </div>
            <button
              onClick={handleReset}
              className="text-xs inline-flex items-center gap-1 text-slate-400 hover:text-rose-500 transition-colors"
              title="Clear all fields"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Subject */}
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Subject Header
            </label>
            <input
              type="text"
              placeholder="e.g. URGENT: Action required for your account credentials"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Sender */}
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              From Address / Sender Header
            </label>
            <input
              type="text"
              placeholder="e.g. Security Notification <security@account-support.com>"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Message Body <span className="text-rose-500">*</span>
              </label>
              <button
                onClick={handlePasteFromClipboard}
                className={`text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold border transition-all active:scale-95 ${
                  isDark
                    ? 'text-sky-400 bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/20'
                    : 'text-sky-700 bg-sky-50 border-sky-200 hover:bg-sky-100'
                }`}
              >
                <Clipboard className="w-3 h-3" />
                <span>Paste from Clipboard</span>
              </button>
            </div>
            <textarea
              ref={textareaRef}
              rows={8}
              placeholder="Paste email text, phishing lures, or standard messages here to evaluate..."
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, MAX_CHARS))}
              className={`${inputCls} font-mono leading-relaxed resize-none`}
            />
            <div className={`flex items-center justify-between mt-1.5 text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <span>{wordCount} words · {charCount} characters</span>
              <span className={charCount > MAX_CHARS * 0.9 ? 'text-amber-500 font-bold' : ''}>
                {charCount}/{MAX_CHARS}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl border flex items-center gap-2.5 text-xs bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Action */}
          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm ${
              isAnalyzing
                ? 'bg-slate-400 dark:bg-slate-700 text-white cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-700 text-white active:scale-95'
            }`}
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Evaluating TF-IDF Vocabulary...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Analyze Message</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Classification Results & Explainable AI */}
        <div className={`p-6 rounded-2xl border space-y-5 ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-500" />
              <h2 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Classification Verdict & Explainability
              </h2>
            </div>
            {result && (
              <button
                onClick={handleCopyResult}
                className={`text-[11px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium border transition-all ${
                  copiedResult
                    ? 'text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : isDark ? 'text-slate-400 border-slate-700 hover:bg-slate-800' : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {copiedResult ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedResult ? 'Copied' : 'Copy Verdict'}</span>
              </button>
            )}
          </div>

          {!result ? (
            <div className="py-20 text-center space-y-3">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto border ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <Search className="w-7 h-7" />
              </div>
              <p className={`text-xs max-w-sm mx-auto leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Enter email text or choose one of the templates above, then click <strong>"Analyze Message"</strong> to inspect classification probabilities and influential words.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in-scale">
              {/* Verdict Card */}
              <div className={`p-5 rounded-xl border flex items-center justify-between ${
                result.is_spam
                  ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
                  : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
              }`}>
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    result.is_spam
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                      : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                  }`}>
                    {result.is_spam ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-base font-bold ${result.is_spam ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {result.prediction === 'Spam' ? 'Spam Detected' : 'Legitimate (Ham)'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                        result.risk_level === 'High'
                          ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300'
                      }`}>
                        {result.risk_level} Risk
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Model used: <strong>{result.model_used}</strong> · Confidence: <strong>{(result.confidence * 100).toFixed(1)}%</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-2xl font-bold font-mono block ${
                    result.is_spam ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {(result.spam_probability * 100).toFixed(1)}%
                  </span>
                  <span className={`text-[10px] uppercase font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Spam Probability
                  </span>
                </div>
              </div>

              {/* Probability Split Progress */}
              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Legitimate: {(result.ham_probability * 100).toFixed(1)}%
                  </span>
                  <span className="text-rose-600 dark:text-rose-400">
                    Spam: {(result.spam_probability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden flex ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div
                    className="bg-emerald-500 h-full transition-all duration-700"
                    style={{ width: `${result.ham_probability * 100}%` }}
                  />
                  <div
                    className="bg-rose-500 h-full transition-all duration-700"
                    style={{ width: `${result.spam_probability * 100}%` }}
                  />
                </div>
              </div>

              {/* Explainable AI: Influential Tokens / Vocabulary Weights */}
              {result.token_explanations && result.token_explanations.length > 0 && (
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      <Zap className="w-3.5 h-3.5 text-sky-500" />
                      <span>Influential Words Influencing Prediction</span>
                    </span>
                    <button
                      onClick={() => setHighlightTriggers(!highlightTriggers)}
                      className={`text-[11px] font-semibold inline-flex items-center gap-1 transition-colors ${
                        highlightTriggers ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{highlightTriggers ? 'Highlights On' : 'Highlights Off'}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {result.token_explanations.map((tok, idx) => (
                      <span
                        key={idx}
                        className={`text-xs font-mono px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                          tok.direction === 'spam'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        }`}
                        title={tok.direction === 'spam' ? 'Influenced classification toward Spam' : 'Influenced classification toward Legitimate'}
                      >
                        <span className="font-semibold">{tok.token}</span>
                        <span className="text-[10px] opacity-80">
                          {tok.weight > 0 ? `+${tok.weight}` : tok.weight}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Heuristic Signals */}
              {result.heuristic_signals.length > 0 && (
                <div>
                  <span className={`text-xs font-bold block mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Matched Heuristic Patterns
                  </span>
                  <div className="space-y-2">
                    {result.heuristic_signals.map((sig, idx) => (
                      <div key={idx} className="p-3 rounded-xl border flex items-start gap-2.5 text-xs bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300">
                        <Flame className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{sig.name}</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">
                              {sig.matched_terms}
                            </span>
                          </div>
                          <p className="text-[11px] mt-0.5 opacity-90">
                            {sig.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Highlighted Email Body Preview */}
              {highlightTriggers && (
                <div>
                  <span className={`text-xs font-bold block mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Email Body with Token Highlights
                  </span>
                  <div className={`p-3.5 rounded-xl border font-mono text-xs leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    {renderHighlightedBody()}
                  </div>
                </div>
              )}

              {/* Cybersecurity Safety Advisory Disclaimer (Explicitly required by prompt) */}
              <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
                isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-500" />
                <p className="leading-relaxed">
                  <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>Cybersecurity Advisory:</strong> Machine learning classifiers estimate statistical spam probability based on lexical patterns and headers. Automated evaluation does not constitute a guarantee that an email is safe. Always apply zero-trust caution before clicking unverified hyperlinks or executing unknown attachments.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
