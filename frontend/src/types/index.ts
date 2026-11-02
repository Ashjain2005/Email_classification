export type NavigationTab = 
  | 'dashboard' 
  | 'bulk' 
  | 'inbox'
  | 'single' 
  | 'performance' 
  | 'history' 
  | 'settings';

export interface HealthStatus {
  status: string;
  model_loaded: boolean;
  model_name: string;
  version: string;
}

export interface HeuristicSignal {
  signal_id: string;
  name: string;
  description: string;
  matched_terms: string;
}

export interface TokenExplanation {
  token: string;
  weight: number;
  direction: 'spam' | 'ham';
}

export interface SinglePredictionResult {
  prediction: 'Spam' | 'Ham' | 'Unknown';
  is_spam: boolean;
  confidence: number;
  spam_probability: number;
  ham_probability: number;
  risk_level: 'High' | 'Medium' | 'Low' | 'Minimal';
  model_used: string;
  heuristic_signals: HeuristicSignal[];
  explanation: string;
  subject: string;
  sender: string;
  token_explanations?: TokenExplanation[];
}

export interface BatchMessageResult {
  index: number;
  id?: string;
  subject: string;
  sender: string;
  snippet: string;
  prediction: 'Spam' | 'Ham' | 'Unknown';
  is_spam: boolean;
  confidence: number;
  spam_probability: number;
  ham_probability: number;
  risk_level: 'High' | 'Medium' | 'Low' | 'Minimal';
  heuristic_signals: HeuristicSignal[];
}

export interface BatchPredictionResponse {
  session_id?: string;
  total_messages: number;
  spam_count: number;
  ham_count: number;
  spam_percentage: number;
  results: BatchMessageResult[];
}

export interface IMAPTestRequest {
  host: string;
  port: number;
  username: string;
  password: string;
  folder: string;
  use_ssl: boolean;
}

export interface IMAPTestResponse {
  success: boolean;
  status: string;
  message: string;
  target_folder?: string;
  total_messages?: number;
  folders: string[];
}

export interface IMAPFetchRequest {
  host: string;
  port: number;
  username: string;
  password: string;
  folder: string;
  limit: number;
  use_ssl: boolean;
}

export interface HeaderAnomaly {
  code: string;
  severity: string;
  description: string;
}

export interface EMLAttachment {
  filename: string;
  content_type: string;
  size_bytes: number;
}

export interface EMLHeaders {
  subject: string;
  sender: string;
  recipient: string;
  cc: string;
  date: string;
  message_id: string;
  reply_to: string;
  hop_count: number;
  has_dkim: boolean;
  auth_results: string;
  attachments: EMLAttachment[];
  header_anomalies: HeaderAnomaly[];
}

export interface EMLPredictionResponse {
  filename: string;
  headers: EMLHeaders;
  prediction: 'Spam' | 'Ham' | 'Unknown';
  is_spam: boolean;
  confidence: number;
  spam_probability: number;
  ham_probability: number;
  risk_level: 'High' | 'Medium' | 'Low' | 'Minimal';
  model_used: string;
  heuristic_signals: HeuristicSignal[];
  token_explanations: TokenExplanation[];
  body_snippet: string;
}

export interface ModelMetricDetails {
  model_name: string;
  evaluation_time_seconds: number;
  accuracy: number;
  precision_spam: number;
  recall_spam: number;
  f1_spam: number;
  f1_macro: number;
  roc_auc: number;
  precision_ham: number;
  recall_ham: number;
  f1_ham: number;
  confusion_matrix: {
    true_negatives_ham: number;
    false_positives_ham_as_spam: number;
    false_negatives_spam_as_ham: number;
    true_positives_spam: number;
    matrix_2x2: number[][];
  };
  false_positive_rate: number;
  false_negative_rate: number;
}

export interface ModelMetricsResponse {
  evaluation_timestamp: string;
  dataset_info: {
    train_file: string;
    test_file: string;
    train_rows_used: number;
    test_rows_used: number;
    train_ham_count: number;
    train_spam_count: number;
    test_ham_count: number;
    test_spam_count: number;
    positive_class: string;
    negative_class: string;
    positive_class_convention: string;
  };
  selected_model: string;
  selection_reason: string;
  models: {
    logistic_regression: ModelMetricDetails;
    multinomial_nb: ModelMetricDetails;
  };
}

export interface SessionRecord {
  id: number;
  session_id: string;
  created_at: string;
  subject: string;
  sender: string;
  snippet: string;
  prediction: string;
  is_spam: boolean;
  spam_probability: number;
  confidence: number;
  risk_level: string;
}

export interface AnalysisSessionSummary {
  id: string;
  created_at: string;
  source_type: string;
  filename?: string;
  total_messages: number;
  spam_count: number;
  ham_count: number;
  spam_ratio: number;
}

export interface HistoryData {
  total_sessions: number;
  total_messages_analysed: number;
  total_spam_detected: number;
  total_ham_detected: number;
  spam_ratio: number;
  sessions: AnalysisSessionSummary[];
}
