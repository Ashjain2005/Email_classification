import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  FileUp,
  Download,
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Info,
  X,
  UploadCloud,
  RefreshCw,
  FileText,
  Layers,
  ArrowUpDown,
  Sparkles,
  Zap,
  Columns
} from 'lucide-react';
import { BatchMessageResult, BatchPredictionResponse } from '../types';
import { api } from '../services/api';
import { EmailDetailModal } from '../components/EmailDetailModal';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

interface BulkAnalysisPageProps {
  initialData?: BatchPredictionResponse | null;
}

export const BulkAnalysisPage: React.FC<BulkAnalysisPageProps> = ({ initialData }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resultsData, setResultsData] = useState<BatchPredictionResponse | null>(initialData || null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // CSV Preview & Column Mapping state
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [selectedTextCol, setSelectedTextCol] = useState<string>('');
  const [selectedSubjectCol, setSelectedSubjectCol] = useState<string>('');
  const [totalLinesEstimated, setTotalLinesEstimated] = useState<number>(0);

  // Table state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'spam' | 'ham' | 'high_risk'>('all');
  const [sortField, setSortField] = useState<'index' | 'spam_probability' | 'confidence'>('index');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Inspection modal
  const [selectedMessage, setSelectedMessage] = useState<BatchMessageResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isDark } = useTheme();
  const { showToast } = useToast();

  // Helper to parse first few rows of CSV for preview & column mapping
  const parseCSVPreview = (csvFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      setTotalLinesEstimated(Math.max(0, lines.length - 1));

      if (lines.length > 0) {
        // Simple comma split respecting quotes
        const parseLine = (line: string) => {
          const re = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
          const values: string[] = [];
          let match;
          while ((match = re.exec(line)) !== null) {
            let val = match[1] || '';
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.substring(1, val.length - 1).replace(/""/g, '"');
            }
            values.push(val.trim());
            if (match.index + match[0].length >= line.length) break;
          }
          return values;
        };

        const headers = parseLine(lines[0]);
        setPreviewHeaders(headers);

        const rows: string[][] = [];
        for (let i = 1; i < Math.min(lines.length, 6); i++) {
          rows.push(parseLine(lines[i]));
        }
        setPreviewRows(rows);

        // Automatic Column Detection
        const lowerHeaders = headers.map((h) => h.toLowerCase());
        const textCandidate = headers.find((h) => {
          const l = h.toLowerCase();
          return l.includes('text') || l.includes('body') || l.includes('message') || l.includes('content') || l.includes('email');
        }) || headers[0] || '';

        const subjCandidate = headers.find((h) => {
          const l = h.toLowerCase();
          return l.includes('subject') || l.includes('title') || l.includes('topic');
        }) || '';

        setSelectedTextCol(textCandidate);
        setSelectedSubjectCol(subjCandidate);
      }
    };
    reader.readAsText(csvFile.slice(0, 50000)); // Read first 50KB for fast preview
  };

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      const msg = 'Please upload a valid CSV (.csv) file.';
      setError(msg);
      showToast(msg, 'error');
      setFile(null);
      return;
    }
    if (selectedFile.size > 25 * 1024 * 1024) {
      const msg = 'File exceeds maximum upload limit of 25 MB.';
      setError(msg);
      showToast(msg, 'error');
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setError(null);
    parseCSVPreview(selectedFile);
    showToast(`Loaded "${selectedFile.name}" (${(selectedFile.size / 1024).toFixed(1)} KB)`, 'info');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const clearSelectedFile = () => {
    setFile(null);
    setPreviewHeaders([]);
    setPreviewRows([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const runClassification = async (fileToUpload?: File) => {
    const targetFile = fileToUpload || file;
    if (!targetFile) {
      setError('Please select a CSV file to analyse.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const response = await api.predictCSV(targetFile);
      setResultsData(response);
      setCurrentPage(1);
      showToast(
        `Batch complete: ${response.total_messages.toLocaleString()} emails analyzed (${response.spam_count} spam, ${response.ham_count} ham)`,
        'success'
      );
    } catch (err: any) {
      const msg = err.message || 'Error occurred while processing CSV.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick Demo: Load bundled sample test file
  const loadSampleDataset = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const sampleCSVContent =
`label,text,subject,sender
Ham,"Hi team, attached is the revised agenda for our Thursday technical architecture review. Let me know if any topics need adjustment.","Sprint Agenda Notes","team-lead@company.internal"
Spam,"FINAL NOTICE: You have been selected as the 1st prize winner of $2,500,000! Contact our agent immediately with wire transfer details to claim.","URGENT: Payout Notification","reward@sweepstakes-intl.org"
Ham,"Can we schedule a 15-minute quick sync to discuss the database migration plan?","Quick Sync Request","alex@dev-team.org"
Spam,"Save 70% on authentic prescription medication. Order Viagra and Cialis online without doctor visit!","Limited Discount Pharma","sales@rxmeds-direct.biz"
Ham,"Please review the updated pull request when you have a moment. Unit tests are passing.","PR #104 Ready for Review","sarah@techcorp.io"
Spam,"Security Warning: Your email storage is full. Click here immediately to verify account and avoid deactivation.","Account Deactivation Notice","security@mail-server-alert.com"`;

      const blob = new Blob([sampleCSVContent], { type: 'text/csv' });
      const sampleFile = new File([blob], 'sample_demonstration_emails.csv', { type: 'text/csv' });
      setFile(sampleFile);
      parseCSVPreview(sampleFile);
      showToast('Loaded sample demonstration dataset (6 emails)', 'info');
      await runClassification(sampleFile);
    } catch (err: any) {
      const msg = 'Could not load sample CSV: ' + err.message;
      setError(msg);
      showToast(msg, 'error');
      setIsProcessing(false);
    }
  };

  // Filtered & Sorted items
  const filteredRecords = useMemo(() => {
    if (!resultsData?.results) return [];

    return resultsData.results.filter((item) => {
      // Category filter
      if (categoryFilter === 'spam' && !item.is_spam) return false;
      if (categoryFilter === 'ham' && item.is_spam) return false;
      if (categoryFilter === 'high_risk' && item.risk_level !== 'High') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = item.snippet.toLowerCase().includes(q);
        const subjMatch = item.subject?.toLowerCase().includes(q);
        const senderMatch = item.sender?.toLowerCase().includes(q);
        if (!textMatch && !subjMatch && !senderMatch) return false;
      }
      return true;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [resultsData, categoryFilter, searchQuery, sortField, sortAsc]);

  const highRiskCount = useMemo(() => {
    if (!resultsData?.results) return 0;
    return resultsData.results.filter((r) => r.risk_level === 'High').length;
  }, [resultsData]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const toggleSort = (field: 'index' | 'spam_probability' | 'confidence') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending for probability
    }
  };

  // Download Analysis Summary as Markdown / Text Report
  const downloadSummaryReport = () => {
    if (!resultsData) return;
    const report = `# MailGuard AI — Batch Analysis Report
Date: ${new Date().toLocaleString()}
Session ID: #${resultsData.session_id || 'N/A'}

## Summary Statistics
- Total Emails Analyzed: ${resultsData.total_messages}
- Spam Emails Quarantined: ${resultsData.spam_count} (${resultsData.spam_percentage.toFixed(1)}%)
- Legitimate Emails Verified: ${resultsData.ham_count}
- High Risk Warnings: ${highRiskCount}
- Primary Model: Logistic Regression (40k TF-IDF features)

## Risk Classification Breakdown
- Spam Rate: ${resultsData.spam_percentage.toFixed(1)}%
- Verification Status: Completed with full heuristic attribution
`;
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mailguard_report_session_${resultsData.session_id || 'batch'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded analysis summary report', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in-scale">
      {/* Upload Zone Card */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Bulk Email Ingestion & Analysis
              </h2>
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                CSV Batch Pipeline
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Upload CSV batches containing email messages for automated vectorization, heuristic evaluation, and threat categorization.
            </p>
          </div>

          <button
            onClick={loadSampleDataset}
            disabled={isProcessing}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all inline-flex items-center gap-1.5 shrink-0 active:scale-95 ${
              isDark
                ? 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            <span>Load Demonstration Sample</span>
          </button>
        </div>

        {/* Drag & Drop Upload Container */}
        <div className="mt-5">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all overflow-hidden ${
              isDragging
                ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-500/10'
                : file
                  ? isDark
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-emerald-400 bg-emerald-50/40'
                  : isDark
                    ? 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                    : 'border-slate-300 hover:border-sky-400 bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center relative z-10">
              {file ? (
                <>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearSelectedFile();
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {(file.size / 1024).toFixed(1)} KB · ~{totalLinesEstimated.toLocaleString()} estimated messages
                  </span>
                </>
              ) : (
                <>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                    isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-50 text-sky-600'
                  }`}>
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className={`text-sm font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Drag and drop CSV file here, or click to browse
                  </p>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Accepts standard CSVs with columns such as <code className="font-mono text-sky-600 dark:text-sky-400">text</code>, <code className="font-mono text-sky-600 dark:text-sky-400">body</code>, or <code className="font-mono text-sky-600 dark:text-sky-400">subject</code> (Max 25 MB)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* CSV Preview and Column Detection Bar */}
          {file && previewHeaders.length > 0 && (
            <div className={`mt-4 p-4 rounded-xl border space-y-3 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Columns className="w-3.5 h-3.5 text-sky-500" />
                  <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                    CSV Preview & Column Mapping (First {previewRows.length} Rows)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Text/Body Column:</span>
                  <select
                    value={selectedTextCol}
                    onChange={(e) => setSelectedTextCol(e.target.value)}
                    className={`rounded-lg px-2 py-1 text-xs border font-mono ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    {previewHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead>
                    <tr className={isDark ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                      {previewHeaders.map((h, i) => (
                        <th key={i} className="py-2 px-3 border-b border-slate-200 dark:border-slate-700">
                          {h} {h === selectedTextCol && <span className="text-sky-500 font-bold">(Target)</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, rowIdx) => (
                      <tr key={rowIdx} className={isDark ? 'border-b border-slate-800/50' : 'border-b border-slate-200/60'}>
                        {r.map((val, colIdx) => (
                          <td key={colIdx} className="py-1.5 px-3 truncate max-w-[200px]" title={val}>
                            {val || <span className="opacity-40">(empty)</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Row with Progress indicator */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <FileSpreadsheet className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                {file ? `Ready: ${file.name}` : 'No file loaded'}
              </span>
            </div>

            <button
              onClick={() => runClassification()}
              disabled={!file || isProcessing}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-2 shadow-sm ${
                !file || isProcessing
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-700 text-white active:scale-95'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Processing Batch Vectorization...</span>
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4" />
                  <span>Run Batch Classification</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl border flex items-center gap-2.5 text-xs bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Results Section */}
      {resultsData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Evaluated */}
            <div className={`p-5 rounded-2xl border ${
              isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Total Evaluated
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {resultsData.total_messages.toLocaleString()}
              </span>
              <span className={`text-xs block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Processed from batch
              </span>
            </div>

            {/* Spam Detected */}
            <div className={`p-5 rounded-2xl border ${
              isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-500">
                  Spam Detected
                </span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-bold text-rose-600 dark:text-rose-500">
                {resultsData.spam_count.toLocaleString()}
              </span>
              <div className="mt-2">
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(resultsData.spam_percentage, 100)}%` }}
                  />
                </div>
                <span className={`text-xs mt-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {resultsData.spam_percentage.toFixed(1)}% of batch volume
                </span>
              </div>
            </div>

            {/* Legitimate (Ham) */}
            <div className={`p-5 rounded-2xl border ${
              isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Legitimate (Ham)
                </span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {resultsData.ham_count.toLocaleString()}
              </span>
              <div className="mt-2">
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min((resultsData.ham_count / (resultsData.total_messages || 1)) * 100, 100)}%` }}
                  />
                </div>
                <span className={`text-xs mt-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {((resultsData.ham_count / (resultsData.total_messages || 1)) * 100).toFixed(1)}% legitimate rate
                </span>
              </div>
            </div>

            {/* High Risk Items */}
            <div className={`p-5 rounded-2xl border ${
              isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">
                  High Risk Flags
                </span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {highRiskCount.toLocaleString()}
              </span>
              <span className={`text-xs block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Require immediate attention
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
          }`}>
            {/* Header & Controls Strip */}
            <div className={`p-5 border-b space-y-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Classification Records
                  </h3>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Click any email row to inspect granular keyword heuristics and classification probabilities.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadSummaryReport}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      isDark
                        ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-500" />
                    <span>Summary Report</span>
                  </button>

                  {resultsData.session_id && (
                    <a
                      href={api.getExportUrl(resultsData.session_id)}
                      download
                      onClick={() => showToast('Exporting classified CSV dataset...', 'info')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-all shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Classified CSV</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Filtering, Search & Sizing Controls */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-1">
                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                  <button
                    onClick={() => { setCategoryFilter('all'); setCurrentPage(1); }}
                    className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all ${
                      categoryFilter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950 font-bold'
                        : isDark
                          ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({resultsData.total_messages})
                  </button>
                  <button
                    onClick={() => { setCategoryFilter('spam'); setCurrentPage(1); }}
                    className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all ${
                      categoryFilter === 'spam'
                        ? 'bg-rose-600 text-white font-bold'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                    }`}
                  >
                    Spam ({resultsData.spam_count})
                  </button>
                  <button
                    onClick={() => { setCategoryFilter('ham'); setCurrentPage(1); }}
                    className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all ${
                      categoryFilter === 'ham'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                    }`}
                  >
                    Legitimate ({resultsData.ham_count})
                  </button>
                  <button
                    onClick={() => { setCategoryFilter('high_risk'); setCurrentPage(1); }}
                    className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all ${
                      categoryFilter === 'high_risk'
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                    }`}
                  >
                    High Risk ({highRiskCount})
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search snippet or subject..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
                    isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50/70 border-slate-100 text-slate-400'
                  }`}>
                    <th
                      onClick={() => toggleSort('index')}
                      className="py-3 px-4 w-14 cursor-pointer hover:text-sky-500 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>#</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4">Subject & Sender</th>
                    <th className="py-3 px-4">Content Preview</th>
                    <th className="py-3 px-4 text-center">Prediction</th>
                    <th
                      onClick={() => toggleSort('spam_probability')}
                      className="py-3 px-4 text-right cursor-pointer hover:text-sky-500 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Spam %</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">Risk Level</th>
                    <th className="py-3 px-4 text-center">Heuristics</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No messages matched the current search and filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((item) => (
                      <tr
                        key={item.index}
                        onClick={() => setSelectedMessage(item)}
                        className={`cursor-pointer transition-colors ${
                          isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className={`py-3.5 px-4 font-mono font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          {item.index + 1}
                        </td>
                        <td className="py-3.5 px-4 max-w-[200px]">
                          <div className={`font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {item.subject || '(No Subject)'}
                          </div>
                          {item.sender && (
                            <div className="text-[11px] font-mono text-slate-400 truncate">
                              {item.sender}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 max-w-[320px]">
                          <p className={`truncate text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {item.snippet}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.is_spam
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                          }`}>
                            {item.prediction}
                          </span>
                        </td>
                        <td className={`py-3.5 px-4 text-right font-mono font-semibold ${
                          item.spam_probability > 0.5 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {(item.spam_probability * 100).toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.risk_level === 'High'
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              : item.risk_level === 'Medium'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          }`}>
                            {item.risk_level}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {item.heuristic_signals && item.heuristic_signals.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 font-semibold">
                              <span>{item.heuristic_signals.length} rules</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Strip */}
            <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
              isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
            }`}>
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredRecords.length)} of{' '}
                {filteredRecords.length.toLocaleString()} messages
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className={`p-1.5 rounded-lg border transition-all ${
                    currentPage === 1
                      ? 'opacity-40 cursor-not-allowed'
                      : isDark ? 'hover:bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className={`p-1.5 rounded-lg border transition-all ${
                    currentPage >= totalPages
                      ? 'opacity-40 cursor-not-allowed'
                      : isDark ? 'hover:bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Inspection Detail Modal */}
      <EmailDetailModal
        message={selectedMessage}
        onClose={() => setSelectedMessage(null)}
      />
    </div>
  );
};
