import React, { useEffect, useState, useMemo } from 'react';
import {
  Clock,
  Download,
  RefreshCw,
  Inbox,
  ShieldAlert,
  ShieldCheck,
  Search,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
  Filter,
  FileSpreadsheet
} from 'lucide-react';
import { HistoryData, AnalysisSessionSummary } from '../types';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Deletion modal states
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const { isDark } = useTheme();
  const { showToast } = useToast();

  const fetchHistory = async (manual = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getHistory();
      setHistory(data);
      if (manual) {
        showToast('Audit history updated', 'info');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to retrieve analysis history';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(false);
  }, []);

  // Filter sessions based on search & source
  const filteredSessions = useMemo(() => {
    if (!history?.sessions) return [];
    return history.sessions.filter((s) => {
      // Source filter
      if (sourceFilter !== 'all') {
        if (!s.source_type.toLowerCase().includes(sourceFilter.toLowerCase())) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idMatch = s.id.toString().includes(q);
        const sourceMatch = s.source_type.toLowerCase().includes(q);
        const fileMatch = s.filename ? s.filename.toLowerCase().includes(q) : false;
        if (!idMatch && !sourceMatch && !fileMatch) return false;
      }
      return true;
    });
  }, [history, sourceFilter, searchQuery]);

  // Handler to delete a single session
  const handleDeleteSession = async () => {
    if (sessionToDelete === null) return;
    setIsDeleting(true);
    try {
      await api.deleteSession(sessionToDelete);
      showToast(`Session #${sessionToDelete} deleted successfully`, 'success');
      setSessionToDelete(null);
      await fetchHistory(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete session', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler to clear all history
  const handleClearAllHistory = async () => {
    setIsDeleting(true);
    try {
      await api.clearHistory();
      showToast('All analysis history cleared successfully', 'success');
      setShowClearAllModal(false);
      await fetchHistory(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to clear history', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-scale">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Sessions */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Sessions
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {history?.total_sessions || 0}
          </span>
          <span className={`text-xs block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Saved analysis sessions in SQLite
          </span>
        </div>

        {/* Total Emails Processed */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Emails Processed
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {(history?.total_messages_analysed || 0).toLocaleString()}
          </span>
          <span className={`text-xs block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Cumulative email volume
          </span>
        </div>

        {/* Total Threats Detected */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-500">
              Total Threats Detected
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-rose-600 dark:text-rose-500">
            {(history?.total_spam_detected || 0).toLocaleString()}
          </span>
          <span className={`text-xs block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {history?.spam_ratio.toFixed(1)}% cumulative spam detection rate
          </span>
        </div>
      </div>

      {/* Sessions Table Container */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        {/* Header & Controls */}
        <div className={`p-5 border-b space-y-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Session Archive & Audit Logs
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Persistent SQLite record of previous analysis batches with downloadable CSV reports.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchHistory(true)}
                disabled={loading}
                className={`p-2 rounded-xl border transition-all ${
                  isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white border-slate-700' : 'hover:bg-slate-50 text-slate-500 hover:text-slate-800 border-slate-200'
                }`}
                title="Refresh history"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-500' : ''}`} />
              </button>

              {history && history.sessions.length > 0 && (
                <button
                  onClick={() => setShowClearAllModal(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All History</span>
                </button>
              )}
            </div>
          </div>

          {/* Search & Source Filter Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ID, source, or filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-sky-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Source Filter Dropdown */}
            <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Filter by Source:</span>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className={`rounded-xl px-2.5 py-1.5 text-xs border font-medium focus:outline-none ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <option value="all">All Sources</option>
                <option value="csv">CSV Upload</option>
                <option value="imap">Live IMAP</option>
                <option value="api">API Batch</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading && !history ? (
          <div className="p-12 text-center">
            <div className="w-7 h-7 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading session archive...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-xs">
            {error}
          </div>
        ) : !history || filteredSessions.length === 0 ? (
          <div className={`p-12 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-xs">No analysis sessions match your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
                  isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50/70 border-slate-100 text-slate-400'
                }`}>
                  <th className="py-3 px-5 w-24">Session ID</th>
                  <th className="py-3 px-4">Ingestion Source</th>
                  <th className="py-3 px-4">Filename / Origin</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4 text-right">Volume</th>
                  <th className="py-3 px-4 text-right">Spam</th>
                  <th className="py-3 px-4 text-right">Legitimate</th>
                  <th className="py-3 px-4 text-right">Spam %</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                {filteredSessions.map((session) => (
                  <tr
                    key={session.id}
                    className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}
                  >
                    <td className={`py-3.5 px-5 font-mono font-bold ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                      #{session.id}
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
                    <td className={`py-3.5 px-4 font-mono text-[11px] max-w-[150px] truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {session.filename || '—'}
                    </td>
                    <td className={`py-3.5 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {session.created_at}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {session.total_messages.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-rose-600 dark:text-rose-500">
                      {session.spam_count.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {session.ham_count.toLocaleString()}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-mono font-semibold ${
                      session.spam_ratio > 30 ? 'text-rose-600 dark:text-rose-400' : isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {session.spam_ratio.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={api.getExportUrl(session.id)}
                          download
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all text-sky-600 hover:text-sky-700 dark:text-sky-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                          title="Download Classified CSV"
                        >
                          <Download className="w-3 h-3" />
                          <span>CSV</span>
                        </a>

                        <button
                          onClick={() => setSessionToDelete(session.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete Session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Single Session Delete Confirmation Modal */}
      {sessionToDelete !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(3, 7, 18, 0.75)', backdropFilter: 'blur(8px)' }}
        >
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-xl animate-fade-in-scale ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-3 mb-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Delete Session #{sessionToDelete}?
              </h3>
            </div>
            <p className={`text-xs leading-relaxed mb-5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Are you sure you want to delete this session and its persisted classification records? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setSessionToDelete(null)}
                disabled={isDeleting}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSession}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              >
                {isDeleting ? 'Deleting...' : 'Delete Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All History Confirmation Modal */}
      {showClearAllModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(3, 7, 18, 0.75)', backdropFilter: 'blur(8px)' }}
        >
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-xl animate-fade-in-scale ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-3 mb-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Clear All Audit History?
              </h3>
            </div>
            <p className={`text-xs leading-relaxed mb-5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              This will permanently delete all recorded analysis sessions and message rows from the SQLite database. Live statistics on the dashboard will reset to zero.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowClearAllModal(false)}
                disabled={isDeleting}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllHistory}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              >
                {isDeleting ? 'Clearing...' : 'Yes, Clear All History'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
