"""
MailGuard AI - Request and Response Pydantic Schemas.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# --- Single Prediction Schemas ---

class SinglePredictionRequest(BaseModel):
    text: str = Field(..., description="Message body or full raw email content")
    subject: Optional[str] = Field(None, description="Email subject line (optional)")
    sender: Optional[str] = Field(None, description="Sender email address or name (optional)")


class HeuristicSignal(BaseModel):
    signal_id: str
    name: str
    description: str
    matched_terms: str


class TokenExplanation(BaseModel):
    token: str
    weight: float
    direction: str = Field(..., description="'spam' or 'ham'")


class SinglePredictionResponse(BaseModel):
    prediction: str = Field(..., description="'Spam' or 'Ham'")
    is_spam: bool
    confidence: float
    spam_probability: float
    ham_probability: float
    risk_level: str = Field(..., description="'High', 'Medium', 'Low', 'Minimal'")
    model_used: str
    heuristic_signals: List[HeuristicSignal]
    explanation: str
    subject: str = ""
    sender: str = ""
    token_explanations: List[TokenExplanation] = []


# --- Batch Prediction Schemas ---

class BatchMessageItem(BaseModel):
    id: Optional[str] = None
    text: str
    subject: Optional[str] = None
    sender: Optional[str] = None


class BatchPredictionRequest(BaseModel):
    messages: List[BatchMessageItem]


class BatchMessageResult(BaseModel):
    index: int
    id: Optional[str] = None
    subject: str = ""
    sender: str = ""
    snippet: str = ""
    prediction: str
    is_spam: bool
    confidence: float
    spam_probability: float
    ham_probability: float
    risk_level: str
    heuristic_signals: List[HeuristicSignal] = []


class BatchPredictionResponse(BaseModel):
    session_id: Optional[str] = None
    total_messages: int
    spam_count: int
    ham_count: int
    spam_percentage: float
    results: List[BatchMessageResult]


# --- IMAP & Email Integration Schemas ---

class IMAPTestRequest(BaseModel):
    host: str = "imap.gmail.com"
    port: int = 993
    username: str
    password: str
    folder: str = "INBOX"
    use_ssl: bool = True


class IMAPTestResponse(BaseModel):
    success: bool
    status: str
    message: str
    target_folder: Optional[str] = None
    total_messages: Optional[int] = None
    folders: List[str] = []


class IMAPFetchRequest(BaseModel):
    host: str = "imap.gmail.com"
    port: int = 993
    username: str
    password: str
    folder: str = "INBOX"
    limit: int = Field(10, ge=1, le=50)
    use_ssl: bool = True


class HeaderAnomaly(BaseModel):
    code: str
    severity: str
    description: str


class EMLAttachment(BaseModel):
    filename: str
    content_type: str
    size_bytes: int


class EMLHeaders(BaseModel):
    subject: str = ""
    sender: str = ""
    recipient: str = ""
    cc: str = ""
    date: str = ""
    message_id: str = ""
    reply_to: str = ""
    hop_count: int = 0
    has_dkim: bool = False
    auth_results: str = ""
    attachments: List[EMLAttachment] = []
    header_anomalies: List[HeaderAnomaly] = []


class EMLPredictionResponse(BaseModel):
    filename: str
    headers: EMLHeaders
    prediction: str
    is_spam: bool
    confidence: float
    spam_probability: float
    ham_probability: float
    risk_level: str
    model_used: str
    heuristic_signals: List[HeuristicSignal] = []
    token_explanations: List[TokenExplanation] = []
    body_snippet: str


# --- Health & Metrics Schemas ---

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_name: str
    version: str = "1.0.0"


class ModelMetricsResponse(BaseModel):
    evaluation_timestamp: str
    dataset_info: Dict[str, Any]
    selected_model: str
    selection_reason: str
    models: Dict[str, Any]


# --- Session History Schemas ---

class AnalysisSessionSummary(BaseModel):
    id: str
    created_at: str
    source_type: str
    filename: Optional[str] = None
    total_messages: int
    spam_count: int
    ham_count: int
    spam_ratio: float


class HistoryResponse(BaseModel):
    total_sessions: int
    total_messages_analysed: int
    total_spam_detected: int
    sessions: List[AnalysisSessionSummary]
