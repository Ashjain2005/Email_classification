import {
  HealthStatus,
  SinglePredictionResult,
  BatchPredictionResponse,
  ModelMetricsResponse,
  HistoryData,
  IMAPTestRequest,
  IMAPTestResponse,
  IMAPFetchRequest,
  EMLPredictionResponse
} from '../types';

const API_BASE = '/api';

export const api = {
  async getHealth(): Promise<HealthStatus> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to fetch system health');
    return res.json();
  },

  async getMetrics(): Promise<ModelMetricsResponse> {
    const res = await fetch(`${API_BASE}/metrics`);
    if (!res.ok) throw new Error('Failed to fetch model evaluation metrics');
    return res.json();
  },

  async predictSingle(text: string, subject?: string, sender?: string): Promise<SinglePredictionResult> {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, subject, sender }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
      throw new Error(err.detail || 'Analysis request failed');
    }
    return res.json();
  },

  async predictCSV(
    file: File,
    textColumn?: string,
    subjectColumn?: string,
    senderColumn?: string,
    maxRows: number = 2000
  ): Promise<BatchPredictionResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (textColumn) formData.append('text_column', textColumn);
    if (subjectColumn) formData.append('subject_column', subjectColumn);
    if (senderColumn) formData.append('sender_column', senderColumn);
    formData.append('max_rows', maxRows.toString());

    const res = await fetch(`${API_BASE}/predict/csv`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'CSV processing failed' }));
      throw new Error(err.detail || 'CSV upload failed');
    }
    return res.json();
  },

  async testIMAP(payload: IMAPTestRequest): Promise<IMAPTestResponse> {
    const res = await fetch(`${API_BASE}/connector/imap/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'IMAP connection test failed' }));
      throw new Error(err.detail || 'Connection test failed');
    }
    return res.json();
  },

  async fetchIMAP(payload: IMAPFetchRequest): Promise<BatchPredictionResponse> {
    const res = await fetch(`${API_BASE}/connector/imap/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch mailbox messages' }));
      throw new Error(err.detail || 'Failed to fetch emails');
    }
    return res.json();
  },

  async demoIMAP(): Promise<BatchPredictionResponse> {
    const res = await fetch(`${API_BASE}/connector/imap/demo`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to load demo inbox' }));
      throw new Error(err.detail || 'Demo inbox failed');
    }
    return res.json();
  },

  async predictEML(file: File): Promise<EMLPredictionResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/predict/eml`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to parse .eml file' }));
      throw new Error(err.detail || 'EML analysis failed');
    }
    return res.json();
  },

  async getHistory(): Promise<HistoryData> {
    const res = await fetch(`${API_BASE}/history`);
    if (!res.ok) throw new Error('Failed to fetch analysis history');
    return res.json();
  },

  async getSessionDetails(sessionId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/history/${sessionId}`);
    if (!res.ok) throw new Error('Failed to fetch session records');
    return res.json();
  },

  getExportUrl(sessionId: string): string {
    return `${API_BASE}/export/${sessionId}`;
  },

  async getGmailStatus(): Promise<any> {
    const res = await fetch(`${API_BASE}/connector/gmail/status`);
    if (!res.ok) throw new Error('Failed to query Gmail connector status');
    return res.json();
  },

  async deleteSession(sessionId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/history/${sessionId}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to delete session' }));
      throw new Error(err.detail || 'Delete failed');
    }
  },

  async clearHistory(): Promise<void> {
    const res = await fetch(`${API_BASE}/history`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to clear history' }));
      throw new Error(err.detail || 'Clear history failed');
    }
  }
};
