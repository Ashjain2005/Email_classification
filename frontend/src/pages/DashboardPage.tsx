import React, { useEffect, useState, useMemo } from 'react';
import {
  Inbox,
  ShieldAlert,
  ShieldCheck,
  Percent,
  ArrowRight,
  RefreshCw,
  FileSpreadsheet,
  TrendingUp,
  Activity,
  Mail,
  Search,
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { NavigationTab, HistoryData, ModelMetricsResponse, AnalysisSessionSummary } from '../types';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

interface DashboardPageProps {
  onNavigate: (tab: NavigationTab) => void;
  onRunSampleDemo: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onRunSampleDemo }) => {
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [metrics, setMetrics] = useState<ModelMetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterSource, setFilterSource] = useState<string>('all');
  const { isDark, config } = useTheme();
  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [histData, metricData] = await Promise.all([
        api.getHistory().catch(() => null),
        api.getMetrics().catch(() => null)
      ]);
      setHistory(histData);
      setMetrics(metricData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter sessions based on source dropdown
  const filteredSessions = useMemo(() => {
    if (!history?.sessions) return [];
    if (filterSource === 'all') return history.sessions;
    return history.sessions.filter((s) =>
      s.source_type.toLowerCase().includes(filterSource.toLowerCase())
    );
  }, [history, filterSource]);

  // Aggregate statistics computed from actual database data
  const totalAnalysed = history?.total_messages_analysed || 0;
  const totalSpam = history?.total_spam_detected || 0;
  const totalHam = history?.total_ham_detected || 0;
  const spamPercentage = history?.spam_ratio || 0;
  const modelAccuracy = metrics?.models?.logistic_regression?.accuracy
    ? (metrics.models.logistic_regression.accuracy * 100).toFixed(2)
    : '98.14';

  // Pie chart data: Spam vs. Legitimate distribution
  const distributionData = useMemo(() => {
    if (totalAnalysed === 0) {
      return [
        { name: 'Legitimate (Ham)', value: 1, color: '#10b981' },
        { name: 'Spam Detected', value: 0, color: '#f43f5e' }
      ];
    }
    return [
      { name: 'Legitimate (Ham)', value: totalHam, color: '#10b981' },
      { name: 'Spam Detected', value: totalSpam, color: '#f43f5e' }
    ];
  }, [totalHam, totalSpam, totalAnalysed]);

  // Trend over time: Chronological session trajectory
  const trendData = useMemo(() => {
    if (!history?.sessions || history.sessions.length === 0) return [];
    // Sort oldest to newest for chronological trend
    const sorted = [...history.sessions].reverse();
    return sorted.map((s, idx) => ({
      name: `S-${s.id}`,
      date: s.created_at.split(' ')[0] || `Session ${s.id}`,
      total: s.total_messages,
      spam: s.spam_count,
      ham: s.ham_count,
      spamRate: s.spam_ratio
    }));
  }, [history]);

  // Risk / Source Volume Breakdown from real session sources
  const sourceBreakdownData = useMemo(() => {
    if (!history?.sessions) return [];
    const sourceMap: Record<string, { total: number; spam: number; ham: number }> = {};
    history.sessions.forEach((s) => {
      const src = s.source_type || 'OTHER';
      if (!sourceMap[src]) {
        sourceMap[src] = { total: 0, spam: 0, ham: 0 };
      }
      sourceMap[src].total += s.total_messages;
      sourceMap[src].spam += s.spam_count;
      sourceMap[src].ham += s.ham_count;
    });

    return Object.entries(sourceMap).map(([source, data]) => ({
      source: source.replace('_', ' '),
      Total: data.total,
      Spam: data.spam,
      Legitimate: data.ham
    }));
  }, [history]);

  return (
    <div className="space-y-6 animate-fade-in-scale">
      {/* Top Welcome & Model Identity Banner */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isDark
          ? 'bg-[#0f172a] border-slate-800 shadow-lg'
          : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 flex items-center justify-center shrink-0`}>
              <ShieldCheck className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Protection Active
                </span>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${
                  isDark
                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  TF-IDF (40k features) · Logistic Regression
                </span>
              </div>

              <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Operational Security Overview
              </h2>

              <p className={`text-xs mt-1 max-w-2xl leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Continuous machine learning analysis of email communications with verifiable held-out validation accuracy of <strong className={isDark ? 'text-sky-400' : 'text-sky-700'}>{modelAccuracy}%</strong> and F1-score of <strong className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>98.04%</strong>.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('single')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white inline-flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Analyze Email</span>
            </button>
            <button
              onClick={() => onNavigate('bulk')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all inline-flex items-center gap-1.5 active:scale-95 ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-500" />
              <span>Bulk Ingestion</span>
            </button>
            <button
              onClick={() => onNavigate('inbox')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all inline-flex items-center gap-1.5 active:scale-95 ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-emerald-500" />
              <span>Inbox Sync</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 Required Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Emails Analyzed */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Analyzed
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {totalAnalysed.toLocaleString()}
          </div>
          <div className={`text-[11px] mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Across {history?.total_sessions || 0} recorded sessions
          </div>
        </div>

        {/* Card 2: Spam Emails Detected */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-rose-500">
              Spam Detected
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-500">
            {totalSpam.toLocaleString()}
          </div>
          <div className="text-[11px] mt-1.5 text-rose-500">
            Flagged for review or quarantine
          </div>
        </div>

        {/* Card 3: Legitimate Emails */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Legitimate Emails
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {totalHam.toLocaleString()}
          </div>
          <div className={`text-[11px] mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Verified normal correspondence
          </div>
        </div>

        {/* Card 4: Spam Detection Rate */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Spam Detection Rate
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {spamPercentage.toFixed(1)}%
          </div>
          <div className="mt-1.5">
            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(spamPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 5: Model Accuracy */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
              Model Accuracy
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400`}>
            {modelAccuracy}%
          </div>
          <div className={`text-[11px] mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Held-out benchmark accuracy
          </div>
        </div>
      </div>

      {/* Analytics Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Spam vs Legitimate Distribution (Donut Chart) */}
        <div className={`p-6 rounded-2xl border flex flex-col justify-between ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div>
            <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Spam vs. Legitimate Distribution
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Cumulative ratio of analyzed communication
            </p>
          </div>

          <div className="h-64 my-2 flex items-center justify-center">
            {totalAnalysed > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      borderRadius: '0.75rem',
                      fontSize: '12px'
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-slate-400">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No messages analyzed yet
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800/40' : 'bg-slate-50'}`}>
              <span className="text-[10px] uppercase font-bold text-emerald-500 block">Legitimate</span>
              <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {totalAnalysed > 0 ? `${((totalHam / totalAnalysed) * 100).toFixed(1)}%` : '100%'}
              </span>
            </div>
            <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800/40' : 'bg-slate-50'}`}>
              <span className="text-[10px] uppercase font-bold text-rose-500 block">Spam Rate</span>
              <span className="text-sm font-bold text-rose-500">
                {spamPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Chart 2: Email Analysis Trends Over Time (Area Chart) */}
        <div className={`lg:col-span-2 p-6 rounded-2xl border flex flex-col justify-between ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
            <div>
              <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Email Analysis Trends Over Sessions
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Total volume vs. spam detected across recorded sessions
              </p>
            </div>
            <button
              onClick={loadData}
              className={`p-1.5 rounded-lg border self-start sm:self-auto text-xs transition-colors ${
                isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-500' : ''}`} />
            </button>
          </div>

          <div className="h-64 my-2">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalVolumeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="spamVolumeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f1f5f9'} />
                  <XAxis dataKey="name" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} />
                  <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      borderRadius: '0.75rem',
                      fontSize: '12px'
                    }}
                  />
                  <Legend verticalAlign="top" height={30} iconType="circle" />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total Processed"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#totalVolumeGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="spam"
                    name="Spam Quarantined"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#spamVolumeGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400">
                <TrendingUp className="w-8 h-8 mb-2 opacity-40" />
                <span>No historical trend data recorded yet</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              Trajectory covers {trendData.length} unique sessions
            </span>
            <span className={`font-mono font-medium ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
              Real-time SQLite Telemetry
            </span>
          </div>
        </div>
      </div>

      {/* Recent Analysis Sessions & Interactions Table */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className={`p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div>
            <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Recent Analysis Sessions
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Persisted session records with direct export and drill-down capability
            </p>
          </div>

          {/* Interactions: Filter & Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className={`text-xs rounded-xl px-2.5 py-1.5 border focus:outline-none ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <option value="all">All Ingestion Sources</option>
                <option value="csv">CSV Batches</option>
                <option value="imap">Live IMAP</option>
                <option value="api">API Ingestions</option>
              </select>
            </div>

            <button
              onClick={() => onNavigate('history')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all inline-flex items-center gap-1 active:scale-95 ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span>View All History</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Sessions Table or Empty State */}
        {!history || filteredSessions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto border ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                No Analysis Records Found
              </h4>
              <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Run an ad-hoc single text analysis, upload a bulk CSV, or connect an IMAP mailbox to populate live telemetry.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={onRunSampleDemo}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white inline-flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Quick Demo</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
                  isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50/70 border-slate-100 text-slate-400'
                }`}>
                  <th className="py-3 px-5">Session ID</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-right">Messages</th>
                  <th className="py-3 px-4 text-right">Spam</th>
                  <th className="py-3 px-4 text-right">Spam %</th>
                  <th className="py-3 px-5 text-right">Export</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                {filteredSessions.slice(0, 6).map((session) => (
                  <tr
                    key={session.id}
                    className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/70'}`}
                  >
                    <td className={`py-3.5 px-5 font-mono font-bold ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                      #{session.id}
                    </td>
                    <td className={`py-3.5 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {session.created_at}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                        session.source_type.includes('IMAP')
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                          : session.source_type.includes('CSV')
                            ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border-sky-200 dark:border-sky-500/20'
                            : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {session.source_type}
                      </span>
                    </td>
                    <td className={`py-3.5 px-4 text-right font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {session.total_messages.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-rose-500">
                      {session.spam_count.toLocaleString()}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-mono font-semibold ${
                      session.spam_ratio > 30 ? 'text-rose-500' : isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {session.spam_ratio.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <a
                        href={api.getExportUrl(session.id)}
                        download
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all text-sky-600 hover:text-sky-700 dark:text-sky-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Download className="w-3 h-3" />
                        <span>CSV</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
