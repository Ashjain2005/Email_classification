import React, { useState, useRef, useCallback } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Server,
  Inbox,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  FileText,
  UploadCloud,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Shield,
  Layers,
  ArrowRight,
  X,
  FileCode,
  Paperclip,
  Check,
  Zap
} from 'lucide-react';
import {
  BatchMessageResult,
  BatchPredictionResponse,
  IMAPTestRequest,
  IMAPTestResponse,
  EMLPredictionResponse
} from '../types';
import { api } from '../services/api';
import { EmailDetailModal } from '../components/EmailDetailModal';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

type TabMode = 'imap' | 'eml';

const PRESETS = [
  { name: 'Gmail', host: 'imap.gmail.com', port: 993, folder: 'INBOX', hint: 'Requires a Google App Password (not your normal password)' },
  { name: 'Outlook / Office 365', host: 'outlook.office365.com', port: 993, folder: 'INBOX', hint: 'Uses IMAP SSL port 993' },
  { name: 'Yahoo Mail', host: 'imap.mail.yahoo.com', port: 993, folder: 'INBOX', hint: 'Requires an App Password from Yahoo Security' },
  { name: 'Custom Server', host: '', port: 993, folder: 'INBOX', hint: 'Connect to any private IMAP mail server' },
];

export const InboxPage: React.FC = () => {
  const [activeMode, setActiveMode] = useState<TabMode>('imap');

  // IMAP form state
  const [selectedPreset, setSelectedPreset] = useState<string>('Gmail');
  const [host, setHost] = useState<string>('imap.gmail.com');
  const [port, setPort] = useState<number>(993);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [folder, setFolder] = useState<string>('INBOX');
  const [fetchLimit, setFetchLimit] = useState<number>(10);

  // Connection & Scan status
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<IMAPTestResponse | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [inboxResults, setInboxResults] = useState<BatchPredictionResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // EML inspector state
  const [emlFile, setEmlFile] = useState<File | null>(null);
  const [isAnalyzingEml, setIsAnalyzingEml] = useState<boolean>(false);
  const [emlResult, setEmlResult] = useState<EMLPredictionResponse | null>(null);
  const [isDraggingEml, setIsDraggingEml] = useState<boolean>(false);
  const [emlError, setEmlError] = useState<string | null>(null);

  // Table & inspection state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'spam' | 'ham' | 'high_risk'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedMessage, setSelectedMessage] = useState<BatchMessageResult | null>(null);

  const emlInputRef = useRef<HTMLInputElement>(null);
  const { isDark, config } = useTheme();
  const { showToast } = useToast();

  const handleSelectPreset = (p: typeof PRESETS[0]) => {
    setSelectedPreset(p.name);
    setHost(p.host);
    setPort(p.port);
    setFolder(p.folder);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!username.trim() || !password.trim()) {
      showToast('Please provide email address and App Password', 'error');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const payload: IMAPTestRequest = {
        host,
        port,
        username,
        password,
        folder,
        use_ssl: port === 993
      };
      const res = await api.testIMAP(payload);
      setTestResult(res);
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Connection test failed', 'error');
      setTestResult({
        success: false,
        status: 'ERROR',
        message: err.message || 'Connection test failed',
        folders: []
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleFetchMailbox = async () => {
    if (!username.trim() || !password.trim()) {
      showToast('Please enter credentials to scan your inbox', 'error');
      return;
    }
    setIsScanning(true);
    setScanError(null);
    try {
      const res = await api.fetchIMAP({
        host,
        port,
        username,
        password,
        folder,
        limit: fetchLimit,
        use_ssl: port === 993
      });
      setInboxResults(res);
      setCurrentPage(1);
      showToast(`Scanned ${res.total_messages} messages (${res.spam_count} spam flagged)`, 'success');
    } catch (err: any) {
      const msg = err.message || 'Failed to scan mailbox';
      setScanError(msg);
      showToast(msg, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRunDemoSimulation = async () => {
    setIsScanning(true);
    setScanError(null);
    try {
      const res = await api.demoIMAP();
      setInboxResults(res);
      setCurrentPage(1);
      showToast('Loaded live inbox simulation stream (8 authentic emails)', 'info');
    } catch (err: any) {
      const msg = err.message || 'Failed to load demo inbox';
      setScanError(msg);
      showToast(msg, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // EML File Handling
  const handleEmlFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.eml')) {
      showToast('Please select a valid .eml email file', 'error');
      return;
    }
    setEmlFile(file);
    setEmlError(null);
    runEmlAnalysis(file);
  };

  const runEmlAnalysis = async (fileToAnalyze: File) => {
    setIsAnalyzingEml(true);
    setEmlError(null);
    try {
      const res = await api.predictEML(fileToAnalyze);
      setEmlResult(res);
      showToast(
        res.is_spam ? '⚠️ EML classified as SPAM / Phishing' : '✅ EML verified as Legitimate (Ham)',
        res.is_spam ? 'error' : 'success'
      );
    } catch (err: any) {
      const msg = err.message || 'Failed to analyze .eml file';
      setEmlError(msg);
      showToast(msg, 'error');
    } finally {
      setIsAnalyzingEml(false);
    }
  };

  // Filtered live records
  const filteredRecords = (inboxResults?.results || []).filter((item) => {
    if (categoryFilter === 'spam' && !item.is_spam) return false;
    if (categoryFilter === 'ham' && item.is_spam) return false;
    if (categoryFilter === 'high_risk' && item.risk_level !== 'High') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        item.subject.toLowerCase().includes(q) ||
        item.sender.toLowerCase().includes(q) ||
        item.snippet.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-fade-in-scale">
      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-3 border-b pb-3 border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveMode('imap')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
            activeMode === 'imap'
              ? `bg-gradient-to-r ${config.gradient} btn-cyber-primary text-slate-950 shadow-md`
              : isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-850 border border-transparent'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Live IMAP Mailbox Sync</span>
        </button>

        <button
          onClick={() => setActiveMode('eml')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
            activeMode === 'eml'
              ? `bg-gradient-to-r ${config.gradient} btn-cyber-primary text-slate-950 shadow-md`
              : isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-850 border border-transparent'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>RFC 822 / .EML Forensic Inspector</span>
        </button>
      </div>

      {/* ===================== TAB 1: IMAP LIVE SYNC ===================== */}
      {activeMode === 'imap' && (
        <div className="space-y-6">
          {/* Connector Configuration Card */}
          <div className={`cyber-card p-6 relative ${
            isDark ? 'bg-slate-900/85 border-slate-800/80 shadow-2xl' : 'bg-white border-slate-200/90 shadow-sm'
          }`}>
            {isScanning && <div className="laser-scan-line" />}

            <div className={`pb-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isDark ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={`text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Mailbox Ingestion & Live Threat Scanning
                  </h2>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-xs">
                    TLS / SSL 993
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Connect directly to Gmail, Outlook, or Yahoo to ingest live incoming emails and classify spam in real-time.
                </p>
              </div>

              {/* Demo 1-Click Simulation Button */}
              <button
                onClick={handleRunDemoSimulation}
                disabled={isScanning}
                className={`text-xs font-black px-3.5 py-2 rounded-xl border transition-all inline-flex items-center gap-2 shrink-0 active:scale-95 ${
                  isDark
                    ? 'bg-slate-800/90 text-cyan-300 border-cyan-800/40 hover:bg-slate-700 shadow-xs'
                    : 'bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-100'
                }`}
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Simulate Live Mailbox Stream (1-Click)</span>
              </button>
            </div>

            {/* Provider Preset Selector */}
            <div className="mt-5 space-y-4">
              <div>
                <label className={`text-xs font-black uppercase tracking-wider block mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Select Email Provider Preset
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESETS.map((p) => {
                    const isSelected = selectedPreset === p.name;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => handleSelectPreset(p)}
                        className={`px-3 py-2.5 rounded-xl border text-left text-xs font-bold transition-all active:scale-95 ${
                          isSelected
                            ? isDark
                              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/50 shadow-glow-cyan'
                              : 'bg-cyan-50 text-cyan-800 border-cyan-300 shadow-sm'
                            : isDark
                              ? 'bg-slate-950/40 text-slate-400 border-slate-800 hover:bg-slate-800/60'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{p.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Credentials Form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`text-xs font-bold block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    IMAP Host
                  </label>
                  <div className="relative">
                    <Server className={`w-3.5 h-3.5 absolute left-3 top-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="imap.gmail.com"
                      className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none ${
                        isDark
                          ? 'bg-slate-800/80 border-slate-700 text-white focus:border-cyan-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-bold block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className={`w-3.5 h-3.5 absolute left-3 top-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type="email"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="you@gmail.com"
                      className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none ${
                        isDark
                          ? 'bg-slate-800/80 border-slate-700 text-white focus:border-cyan-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-bold block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    App Password / Token
                  </label>
                  <div className="relative">
                    <Lock className={`w-3.5 h-3.5 absolute left-3 top-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="16-character App Password"
                      className={`w-full pl-9 pr-9 py-2 text-xs rounded-xl border focus:outline-none font-mono ${
                        isDark
                          ? 'bg-slate-800/80 border-slate-700 text-white focus:border-cyan-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-2.5 p-0.5 rounded ${
                        isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Extra Parameters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className={`text-xs font-bold block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Target Folder
                  </label>
                  <select
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    className={`w-full py-2 px-3 text-xs rounded-xl border focus:outline-none ${
                      isDark
                        ? 'bg-slate-800/80 border-slate-700 text-slate-300 focus:border-cyan-500'
                        : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-cyan-500'
                    }`}
                  >
                    <option value="INBOX">INBOX (Default)</option>
                    <option value="[Gmail]/Spam">[Gmail]/Spam (Quarantine)</option>
                    <option value="[Gmail]/All Mail">[Gmail]/All Mail</option>
                    <option value="Junk">Junk / Spam</option>
                  </select>
                </div>

                <div>
                  <label className={`text-xs font-bold block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Messages to Scan
                  </label>
                  <select
                    value={fetchLimit}
                    onChange={(e) => setFetchLimit(Number(e.target.value))}
                    className={`w-full py-2 px-3 text-xs rounded-xl border focus:outline-none ${
                      isDark
                        ? 'bg-slate-800/80 border-slate-700 text-slate-300 focus:border-cyan-500'
                        : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-cyan-500'
                    }`}
                  >
                    <option value={5}>Latest 5 Emails</option>
                    <option value={10}>Latest 10 Emails</option>
                    <option value={25}>Latest 25 Emails</option>
                    <option value={50}>Latest 50 Emails</option>
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !username || !password}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                      isTesting || !username || !password
                        ? 'opacity-50 cursor-not-allowed border-slate-700 text-slate-500'
                        : isDark
                          ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700'
                          : 'bg-white hover:bg-slate-50 text-cyan-700 border-slate-300 shadow-xs'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFetchMailbox}
                    disabled={isScanning || !username || !password}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 text-white shadow-lg active:scale-95 ${
                      isScanning || !username || !password
                        ? 'opacity-50 cursor-not-allowed bg-slate-700'
                        : `bg-gradient-to-r ${config.gradient} btn-cyber-primary text-slate-950`
                    }`}
                  >
                    {isScanning ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Scanning...</span>
                      </>
                    ) : (
                      <>
                        <Inbox className="w-3.5 h-3.5" />
                        <span>Scan Mailbox</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Connection Status Banner */}
              {testResult && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                  testResult.success
                    ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300 shadow-glow-emerald'
                    : 'bg-rose-950/40 border-rose-800/50 text-rose-300 shadow-glow-rose'
                }`}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.total_messages !== undefined && (
                    <span className="font-mono font-bold text-[11px]">
                      {testResult.total_messages.toLocaleString()} emails in {testResult.target_folder}
                    </span>
                  )}
                </div>
              )}

              {/* Informational Callout */}
              <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className={`font-bold block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Zero Password Retention Guarantee
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    MailGuard connects via read-only IMAP SSL. Your credentials are used strictly for the active session request and are <strong>never written to disk or database</strong>. For Gmail, generate a 16-character App Password at <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-0.5">Google Security <ExternalLink className="w-3 h-3" /></a>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Results Display */}
          {inboxResults && (
            <div className="space-y-6">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`cyber-card p-5 ${
                  isDark ? 'bg-slate-900/85 border-slate-800/80 shadow-lg' : 'bg-white border-slate-200/90 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Emails Synced
                    </span>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-cyan-500/15 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                      <Inbox className="w-4 h-4" />
                    </div>
                  </div>
                  <span className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {inboxResults.total_messages}
                  </span>
                  <span className={`text-xs block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Fetched from mailbox stream
                  </span>
                </div>

                <div className={`cyber-card p-5 ${
                  isDark ? 'bg-slate-900/85 border-slate-800/80 shadow-lg' : 'bg-white border-slate-200/90 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-500">
                      Spam Threats
                    </span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-glow-rose">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-3xl font-black text-rose-500">
                    {inboxResults.spam_count}
                  </span>
                  <span className={`text-xs block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {inboxResults.spam_percentage.toFixed(1)}% spam ratio
                  </span>
                </div>

                <div className={`cyber-card p-5 ${
                  isDark ? 'bg-slate-900/85 border-slate-800/80 shadow-lg' : 'bg-white border-slate-200/90 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                      Legitimate
                    </span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-glow-emerald">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-3xl font-black text-emerald-400">
                    {inboxResults.ham_count}
                  </span>
                  <span className={`text-xs block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Safe verified deliveries
                  </span>
                </div>

                <div className={`cyber-card p-5 ${
                  isDark ? 'bg-slate-900/85 border-slate-800/80 shadow-lg' : 'bg-white border-slate-200/90 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                      Sync Status
                    </span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                      <Zap className="w-4 h-4" />
                    </div>
                  </div>
                  <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Real-time
                  </span>
                  <span className={`text-xs block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Zero credential storage
                  </span>
                </div>
              </div>

              {/* Messages Table Container */}
              <div className={`cyber-card overflow-hidden ${
                isDark ? 'bg-slate-900/85 border-slate-800/80 shadow-xl' : 'bg-white border-slate-200/90 shadow-sm'
              }`}>
                {/* Filters */}
                <div className={`p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-3 ${
                  isDark ? 'border-slate-800' : 'border-slate-100'
                }`}>
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <button
                      onClick={() => setCategoryFilter('all')}
                      className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                        categoryFilter === 'all'
                          ? isDark ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs' : 'bg-slate-900 text-white'
                          : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      All ({inboxResults.total_messages})
                    </button>
                    <button
                      onClick={() => setCategoryFilter('spam')}
                      className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                        categoryFilter === 'spam'
                          ? 'bg-rose-600 text-white shadow-glow-rose'
                          : isDark ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      Spam ({inboxResults.spam_count})
                    </button>
                    <button
                      onClick={() => setCategoryFilter('ham')}
                      className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                        categoryFilter === 'ham'
                          ? 'bg-emerald-600 text-white shadow-glow-emerald'
                          : isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      Ham ({inboxResults.ham_count})
                    </button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      placeholder="Search inbox..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-white focus:border-cyan-500'
                          : 'bg-white border-slate-200 text-slate-900 focus:border-cyan-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${
                        isDark ? 'bg-slate-800/50 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-400'
                      }`}>
                        <th className="py-3 px-4 w-14">#</th>
                        <th className="py-3 px-4 w-28">Status</th>
                        <th className="py-3 px-4 w-28">Spam Prob.</th>
                        <th className="py-3 px-4 w-24">Risk</th>
                        <th className="py-3 px-4">Subject & Sender</th>
                        <th className="py-3 px-4 w-24 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800/70' : 'divide-slate-100'}`}>
                      {paginatedRecords.length === 0 ? (
                        <tr>
                          <td colSpan={6} className={`py-12 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            No messages match your search filter.
                          </td>
                        </tr>
                      ) : (
                        paginatedRecords.map((item) => (
                          <tr
                            key={item.index}
                            onClick={() => setSelectedMessage(item)}
                            className={`transition-colors cursor-pointer group ${
                              isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className={`py-3 px-4 font-mono font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                              #{item.index + 1}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide border ${
                                item.is_spam
                                  ? 'threat-pill-danger'
                                  : 'threat-pill-safe'
                              }`}>
                                {item.is_spam ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                                <span>{item.prediction}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold">
                              <span className={item.spam_probability >= 0.7 ? 'text-rose-500' : item.spam_probability >= 0.4 ? 'text-amber-400' : 'text-emerald-400'}>
                                {(item.spam_probability * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                item.risk_level === 'High'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 shadow-xs'
                                  : item.risk_level === 'Medium'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              }`}>
                                {item.risk_level}
                              </span>
                            </td>
                            <td className="py-3 px-4 max-w-md">
                              <div className={`font-semibold truncate text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                                {item.subject || '(No Subject)'}
                              </div>
                              <div className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                From: {item.sender || 'Unknown'} · {item.snippet.slice(0, 80)}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-[11px] font-bold text-cyan-400 group-hover:text-cyan-300 group-hover:underline">
                                Inspect &rarr;
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 2: EML FILE INSPECTOR ===================== */}
      {activeMode === 'eml' && (
        <div className="space-y-6">
          <div className={`cyber-card p-6 ${
            isDark ? 'bg-slate-900/85 border-slate-800/80 shadow-2xl' : 'bg-white border-slate-200/90 shadow-sm'
          }`}>
            <div className={`pb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <h2 className={`text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  RFC 822 / .EML Forensic Email Inspector
                </h2>
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.badgeCls}`}>
                  Raw MIME Decoder
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Upload any exported email file (.eml) to inspect raw server transmission headers, SPF/DKIM flags, Reply-To domain spoofing, and ML threat classification.
              </p>
            </div>

            {/* Drag & Drop Dropzone */}
            <div className="mt-5">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingEml(true); }}
                onDragLeave={() => setIsDraggingEml(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingEml(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleEmlFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => emlInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all overflow-hidden ${
                  isDraggingEml
                    ? 'border-cyan-400 bg-cyan-500/10 shadow-glow-cyan'
                    : emlFile
                      ? isDark ? 'border-emerald-500/60 bg-emerald-500/10 shadow-glow-emerald' : 'border-emerald-400 bg-emerald-50/50'
                      : isDark ? 'border-slate-800 hover:border-cyan-500/40 bg-slate-950/40' : 'border-slate-300 hover:border-cyan-500 bg-slate-50/50'
                }`}
              >
                {isAnalyzingEml && <div className="laser-scan-line" />}

                <input
                  ref={emlInputRef}
                  type="file"
                  accept=".eml"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleEmlFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center relative z-10">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                    isDark ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'bg-cyan-50 text-cyan-600 border border-cyan-200'
                  }`}>
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className={`text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {emlFile ? emlFile.name : 'Click to select or drop an .eml email file here'}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Exported from Gmail, Outlook, Apple Mail, or Thunderbird (.eml)
                  </p>
                </div>
              </div>
            </div>

            {isAnalyzingEml && (
              <div className="mt-4 p-4 text-center">
                <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-2" />
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Decoding MIME multipart headers and calculating ML vector coefficients...
                </p>
              </div>
            )}
          </div>

          {/* EML Forensic Diagnostic Report */}
          {emlResult && (
            <div className="space-y-6">
              {/* Verdict Banner */}
              <div className={`cyber-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                emlResult.is_spam
                  ? isDark ? 'bg-rose-950/30 border-rose-800/50 shadow-glow-rose' : 'bg-rose-50 border-rose-200'
                  : isDark ? 'bg-emerald-950/30 border-emerald-800/50 shadow-glow-emerald' : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    emlResult.is_spam ? 'bg-rose-600 text-white shadow-glow-rose' : 'bg-emerald-600 text-white shadow-glow-emerald'
                  }`}>
                    {emlResult.is_spam ? <ShieldAlert className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider text-white ${
                        emlResult.is_spam ? 'bg-rose-600' : 'bg-emerald-600'
                      }`}>
                        {emlResult.prediction}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        emlResult.risk_level === 'High' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                        emlResult.risk_level === 'Medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                        'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {emlResult.risk_level} Risk Level
                      </span>
                    </div>
                    <h3 className={`text-sm font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      File: {emlResult.filename}
                    </h3>
                    <p className={`text-xs mt-0.5 ${
                      emlResult.is_spam ? isDark ? 'text-rose-300' : 'text-rose-700' : isDark ? 'text-emerald-300' : 'text-emerald-700'
                    }`}>
                      Spam Probability: <strong>{(emlResult.spam_probability * 100).toFixed(1)}%</strong> · Confidence: <strong>{(emlResult.confidence * 100).toFixed(1)}%</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Header Security Diagnostics Card */}
              <div className={`cyber-card p-6 ${
                isDark ? 'bg-slate-900/85 border-slate-800/80 shadow-xl' : 'bg-white border-slate-200/90 shadow-sm'
              }`}>
                <h3 className={`text-sm font-black mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  RFC 822 Header Security Analysis
                </h3>

                {/* Header Anomalies Alert */}
                {emlResult.headers.header_anomalies.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {emlResult.headers.header_anomalies.map((anom, idx) => (
                      <div key={idx} className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                        anom.severity === 'High'
                          ? 'bg-rose-950/40 border-rose-800/50 text-rose-300 shadow-glow-rose'
                          : 'bg-amber-950/40 border-amber-800/50 text-amber-300 shadow-glow-amber'
                      }`}>
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold uppercase tracking-wider block text-[11px]">{anom.code} ({anom.severity} Risk)</span>
                          <p className="mt-0.5 text-[11px] leading-relaxed">{anom.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Headers Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={`block font-black text-[10px] uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>From Sender</span>
                    <span className={`font-mono text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{emlResult.headers.sender || '—'}</span>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={`block font-black text-[10px] uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Reply-To Header</span>
                    <span className={`font-mono text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{emlResult.headers.reply_to || '(Same as From)'}</span>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={`block font-black text-[10px] uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Subject Line</span>
                    <span className={`font-semibold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{emlResult.headers.subject || '(No Subject)'}</span>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={`block font-black text-[10px] uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Transmission Hops & DKIM</span>
                    <span className={`text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {emlResult.headers.hop_count} Received Hop(s) · {emlResult.headers.has_dkim ? '✅ DKIM Signature Found' : '⚠️ No DKIM Header'}
                    </span>
                  </div>
                </div>

                {/* Token Impact Explainability */}
                {emlResult.token_explanations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <span className={`block text-xs font-black uppercase tracking-wider mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      AI Vocabulary Contribution (TF-IDF & Logistic Regression Weights)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {emlResult.token_explanations.map((tok, idx) => (
                        <span
                          key={idx}
                          className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border ${
                            tok.direction === 'spam'
                              ? 'threat-pill-danger'
                              : 'threat-pill-safe'
                          }`}
                        >
                          {tok.token} ({tok.weight > 0 ? `+${tok.weight}` : tok.weight})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Inspection Modal */}
      <EmailDetailModal
        message={selectedMessage}
        onClose={() => setSelectedMessage(null)}
      />
    </div>
  );
};
