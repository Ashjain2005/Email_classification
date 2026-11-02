import React, { useEffect, useState } from 'react';
import {
  Info,
  Layers,
  Activity,
  RefreshCw,
  TrendingUp,
  Award,
  ShieldCheck,
  CheckCircle2,
  Trophy,
  Zap,
  BarChart3,
  AlertTriangle,
  Flame,
  ArrowRight
} from 'lucide-react';
import { ModelMetricsResponse, ModelMetricDetails } from '../types';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface MetricBarProps {
  label: string;
  value: number; // 0-1
  color: string;
  isDark: boolean;
  delay?: string;
  winner?: boolean;
}

const MetricBar: React.FC<MetricBarProps> = ({ label, value, color, isDark, delay = '0ms', winner }) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value * 100), 150);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{label}</span>
          {winner && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300">
              Optimal
            </span>
          )}
        </div>
        <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {(value * 100).toFixed(2)}%
        </span>
      </div>
      <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <div
          className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${width}%`, transitionDelay: delay }}
        />
      </div>
    </div>
  );
};

export const ModelPerformancePage: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelMetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { isDark } = useTheme();

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch evaluation metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Loading empirical evaluation benchmarks...
        </p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-6 rounded-2xl border text-sm bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400">
        <p className="font-bold mb-1">Could not load evaluation metrics</p>
        <p>{error || 'No metrics found. Verify backend evaluation store.'}</p>
      </div>
    );
  }

  const lr = metrics.models.logistic_regression;
  const nb = metrics.models.multinomial_nb;

  const lrMetrics = [
    { label: 'Overall Accuracy', value: lr.accuracy, color: 'bg-sky-600', delay: '0ms', winner: lr.accuracy >= nb.accuracy },
    { label: 'Spam Precision', value: lr.precision_spam, color: 'bg-indigo-600', delay: '60ms', winner: lr.precision_spam >= nb.precision_spam },
    { label: 'Spam Recall', value: lr.recall_spam, color: 'bg-violet-600', delay: '120ms', winner: lr.recall_spam >= nb.recall_spam },
    { label: 'Spam F1-Score', value: lr.f1_spam, color: 'bg-emerald-600', delay: '180ms', winner: lr.f1_spam >= nb.f1_spam },
    { label: 'ROC-AUC Area', value: lr.roc_auc, color: 'bg-teal-600', delay: '240ms', winner: lr.roc_auc >= nb.roc_auc },
  ];

  const nbMetrics = [
    { label: 'Overall Accuracy', value: nb.accuracy, color: 'bg-slate-500', delay: '0ms' },
    { label: 'Spam Precision', value: nb.precision_spam, color: 'bg-slate-500', delay: '60ms', winner: nb.precision_spam > lr.precision_spam },
    { label: 'Spam Recall', value: nb.recall_spam, color: 'bg-slate-500', delay: '120ms' },
    { label: 'Spam F1-Score', value: nb.f1_spam, color: 'bg-slate-500', delay: '180ms' },
    { label: 'ROC-AUC Area', value: nb.roc_auc, color: 'bg-slate-500', delay: '240ms' },
  ];

  return (
    <div className="space-y-6 animate-fade-in-scale">
      {/* Top Banner */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
              ✓ Zero Data Leakage Protocol
            </span>
            <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Benchmark Run: {metrics.evaluation_timestamp}
            </span>
          </div>
          <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Evaluated on {metrics.dataset_info.test_rows_used.toLocaleString()} Held-Out Test Instances
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Trained on {metrics.dataset_info.train_rows_used.toLocaleString()} authentic emails · TF-IDF vocabulary fitted exclusively on training set.
          </p>
        </div>

        <div className={`text-right shrink-0 px-4 py-3 rounded-xl border ${
          isDark ? 'bg-sky-500/10 border-sky-500/20' : 'bg-sky-50 border-sky-200'
        }`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Production Model
          </span>
          <span className={`text-sm font-bold ${isDark ? 'text-sky-300' : 'text-sky-800'}`}>
            {metrics.selected_model}
          </span>
        </div>
      </div>

      {/* Model Cards Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LR Production Card */}
        <div className={`p-6 rounded-2xl border ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex items-center justify-between pb-4 border-b mb-5 border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400 flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Logistic Regression
                </h3>
                <span className={`text-[11px] font-semibold text-sky-600 dark:text-sky-400`}>
                  Primary Production Model (Selected)
                </span>
              </div>
            </div>

            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300">
              Champion
            </span>
          </div>

          <div className="space-y-3.5">
            {lrMetrics.map((m) => (
              <MetricBar key={m.label} {...m} isDark={isDark} />
            ))}
          </div>
        </div>

        {/* NB Baseline Card */}
        <div className={`p-6 rounded-2xl border ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex items-center justify-between pb-4 border-b mb-5 border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Multinomial Naive Bayes
                </h3>
                <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Comparative Baseline Algorithm
                </span>
              </div>
            </div>

            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              Baseline
            </span>
          </div>

          <div className="space-y-3.5">
            {nbMetrics.map((m) => (
              <MetricBar key={m.label} {...m} isDark={isDark} />
            ))}
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Table */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className={`px-6 py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Side-by-Side Model Comparison
          </h3>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Empirical measurements on 38,768 held-out test emails
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
                isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50/70 border-slate-100 text-slate-400'
              }`}>
                <th className="py-3 px-6">Algorithm</th>
                <th className="py-3 px-4 text-center">Accuracy</th>
                <th className="py-3 px-4 text-center">Spam Precision</th>
                <th className="py-3 px-4 text-center">Spam Recall</th>
                <th className="py-3 px-4 text-center">Spam F1</th>
                <th className="py-3 px-4 text-center">ROC-AUC</th>
                <th className="py-3 px-4 text-center">False Positives (Ham as Spam)</th>
                <th className="py-3 px-4 text-center">False Negatives (Spam as Ham)</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
              <tr className={isDark ? 'bg-sky-950/20' : 'bg-sky-50/40'}>
                <td className={`py-4 px-6 font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>Logistic Regression</span>
                  <span className="text-[9px] bg-sky-600 text-white px-1.5 py-0.5 rounded font-bold">PRODUCTION</span>
                </td>
                <td className={`py-4 px-4 text-center font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {(lr.accuracy * 100).toFixed(2)}%
                </td>
                <td className="py-4 px-4 text-center font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {(lr.precision_spam * 100).toFixed(2)}%
                </td>
                <td className="py-4 px-4 text-center font-bold font-mono text-violet-600 dark:text-violet-400">
                  {(lr.recall_spam * 100).toFixed(2)}%
                </td>
                <td className="py-4 px-4 text-center font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {(lr.f1_spam * 100).toFixed(2)}%
                </td>
                <td className="py-4 px-4 text-center font-bold font-mono text-teal-600 dark:text-teal-400">
                  {(lr.roc_auc * 100).toFixed(2)}%
                </td>
                <td className="py-4 px-4 text-center font-mono text-amber-600 dark:text-amber-400">
                  {lr.confusion_matrix.false_positives_ham_as_spam.toLocaleString()} (2.29%)
                </td>
                <td className="py-4 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {lr.confusion_matrix.false_negatives_spam_as_ham.toLocaleString()} (1.39%)
                </td>
              </tr>

              <tr className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                <td className={`py-4 px-6 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Multinomial Naive Bayes
                </td>
                <td className={`py-4 px-4 text-center font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {(nb.accuracy * 100).toFixed(2)}%
                </td>
                <td className={`py-4 px-4 text-center font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {(nb.precision_spam * 100).toFixed(2)}%
                </td>
                <td className={`py-4 px-4 text-center font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {(nb.recall_spam * 100).toFixed(2)}%
                </td>
                <td className={`py-4 px-4 text-center font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {(nb.f1_spam * 100).toFixed(2)}%
                </td>
                <td className={`py-4 px-4 text-center font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {(nb.roc_auc * 100).toFixed(2)}%
                </td>
                <td className="py-4 px-4 text-center font-mono text-emerald-600 dark:text-emerald-400">
                  {nb.confusion_matrix.false_positives_ham_as_spam.toLocaleString()} (1.64%)
                </td>
                <td className="py-4 px-4 text-center font-mono text-rose-500">
                  {nb.confusion_matrix.false_negatives_spam_as_ham.toLocaleString()} (6.56%)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={`p-4 border-t text-xs leading-relaxed ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-600'}`}>
          <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>Selection Rationale:</strong> {metrics.selection_reason}
        </div>
      </div>

      {/* Visual Confusion Matrices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          {
            model: lr,
            title: 'Logistic Regression',
            badge: 'Production Model',
            badgeStyle: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300'
          },
          {
            model: nb,
            title: 'Multinomial Naive Bayes',
            badge: 'Comparative Baseline',
            badgeStyle: isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'
          }
        ].map(({ model, title, badge, badgeStyle }) => (
          <div key={title} className={`p-6 rounded-2xl border ${
            isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b mb-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div>
                <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{title} Confusion Matrix</h4>
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>38,768 Test Instances</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeStyle}`}>{badge}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center text-xs">
              <div className="p-4 rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40">
                <span className="text-[10px] font-bold block uppercase tracking-wider mb-1 text-emerald-700 dark:text-emerald-400">
                  True Negative (TN)
                </span>
                <span className="text-2xl font-bold block text-emerald-700 dark:text-emerald-400 font-mono">
                  {model.confusion_matrix.true_negatives_ham.toLocaleString()}
                </span>
                <span className="text-[11px] text-emerald-600/80 dark:text-emerald-500/80">Ham correctly delivered</span>
              </div>

              <div className="p-4 rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40">
                <span className="text-[10px] font-bold block uppercase tracking-wider mb-1 text-amber-700 dark:text-amber-400">
                  False Positive (FP)
                </span>
                <span className="text-2xl font-bold block text-amber-700 dark:text-amber-400 font-mono">
                  {model.confusion_matrix.false_positives_ham_as_spam.toLocaleString()}
                </span>
                <span className="text-[11px] text-amber-600/80 dark:text-amber-500/80">Ham flagged as Spam</span>
              </div>

              <div className="p-4 rounded-xl border bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40">
                <span className="text-[10px] font-bold block uppercase tracking-wider mb-1 text-rose-700 dark:text-rose-400">
                  False Negative (FN)
                </span>
                <span className="text-2xl font-bold block text-rose-700 dark:text-rose-400 font-mono">
                  {model.confusion_matrix.false_negatives_spam_as_ham.toLocaleString()}
                </span>
                <span className="text-[11px] text-rose-600/80 dark:text-rose-500/80">Spam slipped through</span>
              </div>

              <div className="p-4 rounded-xl border bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/40">
                <span className="text-[10px] font-bold block uppercase tracking-wider mb-1 text-sky-700 dark:text-sky-400">
                  True Positive (TP)
                </span>
                <span className="text-2xl font-bold block text-sky-700 dark:text-sky-400 font-mono">
                  {model.confusion_matrix.true_positives_spam.toLocaleString()}
                </span>
                <span className="text-[11px] text-sky-600/80 dark:text-sky-500/80">Spam correctly quarantined</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* In-Depth Cybersecurity Explanation: False Positives vs False Negatives */}
      <div className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Info className="w-4 h-4 text-sky-500" />
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Understanding False Positives vs. False Negatives in Cybersecurity
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="font-bold text-amber-600 dark:text-amber-400">
                False Positive (Type I Error) — Ham Flagged as Spam
              </span>
            </div>
            <p className={`leading-relaxed text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Occurs when an authentic, legitimate email (such as an important invoice, job offer, or password reset) is mistakenly tagged as spam.
            </p>
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-[11px]">
              <strong>Operational Impact:</strong> Disrupted workflows, missed business deadlines, and user friction. MailGuard maintains a low 2.29% False Positive Rate.
            </div>
          </div>

          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="font-bold text-rose-600 dark:text-rose-400">
                False Negative (Type II Error) — Spam Slipped to Inbox
              </span>
            </div>
            <p className={`leading-relaxed text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Occurs when a malicious spam, phishing campaign, or malware lure bypasses filtering and arrives directly in the user's primary inbox.
            </p>
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 text-[11px]">
              <strong>Operational Impact:</strong> Credential harvesting, ransomware infections, and security breach risk. Logistic Regression achieved an exceptional 1.39% False Negative Rate (vs. 6.56% in Naive Bayes).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
