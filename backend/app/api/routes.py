"""
MailGuard AI - REST API Route Definitions.
"""

import io
import csv
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, Response
from fastapi.responses import StreamingResponse

from app.schemas.models import (
    SinglePredictionRequest,
    SinglePredictionResponse,
    BatchPredictionRequest,
    BatchPredictionResponse,
    BatchMessageResult,
    HealthResponse,
    ModelMetricsResponse,
    HistoryResponse,
    AnalysisSessionSummary,
    IMAPTestRequest,
    IMAPTestResponse,
    IMAPFetchRequest,
    EMLPredictionResponse
)
from ml.predict import predict_single, predict_batch, is_model_available, get_pipeline, explain_tokens
from ml.evaluate import get_stored_metrics
from app.services.heuristics import extract_heuristic_indicators
from app.connectors.csv_connector import CSVConnector
from app.connectors.gmail_connector import GmailConnector
from app.connectors.imap_connector import IMAPEmailConnector, get_demo_inbox_messages
from app.connectors.eml_parser import parse_eml_bytes
from app.database.db import (
    save_session,
    get_sessions,
    get_session_by_id,
    get_session_records,
    get_aggregate_stats,
    delete_session,
    clear_all_history
)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def get_health():
    """Health check endpoint providing model readiness status."""
    model_loaded = is_model_available()
    model_name = "None"
    if model_loaded:
        try:
            _, meta = get_pipeline()
            model_name = meta.get("model_name", "Classifier Pipeline")
        except Exception:
            model_name = "Error loading"
            
    return HealthResponse(
        status="healthy",
        model_loaded=model_loaded,
        model_name=model_name,
        version="1.0.0"
    )


@router.get("/metrics")
def get_model_evaluation_metrics():
    """Returns official offline model evaluation results, confusion matrices, and comparison."""
    metrics = get_stored_metrics()
    if metrics.get("status") == "not_evaluated":
        raise HTTPException(status_code=404, detail="Model evaluation metrics not yet generated.")
    return metrics


@router.post("/predict", response_model=SinglePredictionResponse)
def classify_single_email(payload: SinglePredictionRequest):
    """Classifies an individual email message with probability scores and heuristic signals."""
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="Message text cannot be empty or whitespace.")
    
    try:
        result = predict_single(
            text=payload.text,
            subject=payload.subject,
            sender=payload.sender
        )
        return SinglePredictionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@router.post("/predict/batch", response_model=BatchPredictionResponse)
def classify_batch_emails(payload: BatchPredictionRequest):
    """Vectorized batch classification for collections of messages."""
    if not payload.messages:
        raise HTTPException(status_code=400, detail="Batch message list cannot be empty.")
    
    texts = [m.text for m in payload.messages]
    subjects = [m.subject or "" for m in payload.messages]
    
    batch_raw = predict_batch(texts, subjects)
    
    results = []
    spam_count = 0
    ham_count = 0
    records_to_save = []
    
    for idx, (msg_item, res) in enumerate(zip(payload.messages, batch_raw)):
        is_spam = res["is_spam"]
        if is_spam:
            spam_count += 1
        else:
            ham_count += 1
            
        combined_text = f"{msg_item.subject or ''} {msg_item.text}"
        heuristic_signals = extract_heuristic_indicators(combined_text)
        
        result_item = BatchMessageResult(
            index=idx,
            id=msg_item.id or str(idx + 1),
            subject=msg_item.subject or "",
            sender=msg_item.sender or "",
            snippet=msg_item.text[:200],
            prediction=res["prediction"],
            is_spam=is_spam,
            confidence=res["confidence"],
            spam_probability=res["spam_probability"],
            ham_probability=res["ham_probability"],
            risk_level=res["risk_level"],
            heuristic_signals=heuristic_signals
        )
        results.append(result_item)
        records_to_save.append({
            "subject": msg_item.subject or "",
            "sender": msg_item.sender or "",
            "text": msg_item.text,
            "prediction": res["prediction"],
            "is_spam": is_spam,
            "spam_probability": res["spam_probability"],
            "confidence": res["confidence"],
            "risk_level": res["risk_level"]
        })
        
    total = len(results)
    spam_pct = round((spam_count / total * 100), 2) if total > 0 else 0.0
    
    # Save session
    session_id = save_session(
        source_type="API_BATCH",
        total_messages=total,
        spam_count=spam_count,
        ham_count=ham_count,
        filename=None,
        records=records_to_save
    )
    
    return BatchPredictionResponse(
        session_id=session_id,
        total_messages=total,
        spam_count=spam_count,
        ham_count=ham_count,
        spam_percentage=spam_pct,
        results=results
    )


@router.post("/predict/csv", response_model=BatchPredictionResponse)
async def classify_csv_file(
    file: UploadFile = File(...),
    text_column: Optional[str] = Form(None),
    subject_column: Optional[str] = Form(None),
    sender_column: Optional[str] = Form(None),
    max_rows: Optional[int] = Form(5000)
):
    """
    Ingests and classifies messages from an uploaded CSV file.
    Automatically detects text columns and handles encodings.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV (.csv) files are supported.")
        
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File size exceeds the 25 MB limit.")

    connector = CSVConnector(
        file_source=contents,
        filename=file.filename,
        text_col=text_column,
        subject_col=subject_column,
        sender_col=sender_column
    )
    
    inspection = connector.test_connection()
    if not inspection.get("selected_text_column"):
        raise HTTPException(
            status_code=400,
            detail=f"Could not identify a message text column in CSV headers: {inspection.get('columns')}. Please specify the column name."
        )

    normalized_msgs = list(connector.fetch_messages(limit=max_rows))
    if not normalized_msgs:
        raise HTTPException(status_code=400, detail="No valid email text records could be parsed from the file.")

    texts = [m.body for m in normalized_msgs]
    subjects = [m.subject for m in normalized_msgs]
    
    batch_raw = predict_batch(texts, subjects)
    
    results = []
    spam_count = 0
    ham_count = 0
    records_to_save = []
    
    for idx, (msg_item, res) in enumerate(zip(normalized_msgs, batch_raw)):
        is_spam = res["is_spam"]
        if is_spam:
            spam_count += 1
        else:
            ham_count += 1
            
        combined_text = f"{msg_item.subject} {msg_item.body}"
        heuristic_signals = extract_heuristic_indicators(combined_text)
        
        result_item = BatchMessageResult(
            index=idx,
            id=msg_item.id,
            subject=msg_item.subject,
            sender=msg_item.sender,
            snippet=msg_item.body[:200],
            prediction=res["prediction"],
            is_spam=is_spam,
            confidence=res["confidence"],
            spam_probability=res["spam_probability"],
            ham_probability=res["ham_probability"],
            risk_level=res["risk_level"],
            heuristic_signals=heuristic_signals
        )
        results.append(result_item)
        records_to_save.append({
            "subject": msg_item.subject,
            "sender": msg_item.sender,
            "text": msg_item.body,
            "prediction": res["prediction"],
            "is_spam": is_spam,
            "spam_probability": res["spam_probability"],
            "confidence": res["confidence"],
            "risk_level": res["risk_level"]
        })

    total = len(results)
    spam_pct = round((spam_count / total * 100), 2) if total > 0 else 0.0

    session_id = save_session(
        source_type="CSV_UPLOAD",
        total_messages=total,
        spam_count=spam_count,
        ham_count=ham_count,
        filename=file.filename,
        records=records_to_save
    )

    return BatchPredictionResponse(
        session_id=session_id,
        total_messages=total,
        spam_count=spam_count,
        ham_count=ham_count,
        spam_percentage=spam_pct,
        results=results
    )


@router.get("/history")
def get_analysis_history(limit: int = Query(50, ge=1, le=100)):
    """Retrieves operational analysis session history and cumulative stats."""
    sessions = get_sessions(limit=limit)
    stats = get_aggregate_stats()
    
    return {
        "total_sessions": stats["total_sessions"],
        "total_messages_analysed": stats["total_messages"],
        "total_spam_detected": stats["total_spam"],
        "total_ham_detected": stats["total_ham"],
        "spam_ratio": stats["spam_ratio"],
        "sessions": sessions
    }


@router.get("/history/{session_id}")
def get_session_details(session_id: str):
    """Retrieves metadata and records for a specific past analysis session."""
    session = get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    records = get_session_records(session_id)
    return {
        "session": session,
        "records": records
    }


@router.delete("/history/{session_id}")
def delete_analysis_session(session_id: str):
    """Deletes an analysis session and its records."""
    existing = get_session_by_id(session_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Session not found.")
    delete_session(session_id)
    return {"success": True, "message": f"Session {session_id} deleted successfully."}


@router.delete("/history")
def clear_history():
    """Clears all historical analysis sessions."""
    clear_all_history()
    return {"success": True, "message": "All session history cleared successfully."}



@router.get("/export/{session_id}")
def export_session_results_csv(session_id: str):
    """Exports session classification results as a downloadable CSV."""
    session = get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    records = get_session_records(session_id)
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Record_ID", "Created_At", "Subject", "Sender", "Snippet",
        "Predicted_Category", "Is_Spam", "Spam_Probability", "Confidence", "Risk_Level"
    ])
    
    for r in records:
        writer.writerow([
            r["id"], r["created_at"], r["subject"], r["sender"], r["snippet"],
            r["prediction"], r["is_spam"], r["spam_probability"], r["confidence"], r["risk_level"]
        ])
        
    output.seek(0)
    filename = f"mailguard_analysis_{session_id}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/connector/gmail/status")
def get_gmail_connector_status():
    """Checks the status and architecture requirements for future Gmail integration."""
    connector = GmailConnector()
    return connector.test_connection()


@router.post("/connector/imap/test", response_model=IMAPTestResponse)
def test_imap_connection(payload: IMAPTestRequest):
    """Tests live IMAP TLS/SSL connection and mailbox credentials."""
    connector = IMAPEmailConnector(
        host=payload.host,
        port=payload.port,
        username=payload.username,
        password=payload.password,
        folder=payload.folder,
        use_ssl=payload.use_ssl
    )
    result = connector.test_connection()
    return IMAPTestResponse(**result)


@router.post("/connector/imap/fetch", response_model=BatchPredictionResponse)
def fetch_and_classify_imap(payload: IMAPFetchRequest):
    """Fetches live messages from an authenticated IMAP inbox and classifies them."""
    connector = IMAPEmailConnector(
        host=payload.host,
        port=payload.port,
        username=payload.username,
        password=payload.password,
        folder=payload.folder,
        use_ssl=payload.use_ssl
    )
    
    try:
        messages = list(connector.fetch_messages(limit=payload.limit))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch from IMAP server: {str(e)}")

    if not messages:
        return BatchPredictionResponse(
            session_id=None,
            total_messages=0,
            spam_count=0,
            ham_count=0,
            spam_percentage=0.0,
            results=[]
        )

    texts = [m.body for m in messages]
    subjects = [m.subject for m in messages]
    batch_raw = predict_batch(texts, subjects)

    results = []
    spam_count = 0
    ham_count = 0
    records_to_save = []

    for idx, (m, res) in enumerate(zip(messages, batch_raw)):
        is_spam = res["is_spam"]
        if is_spam:
            spam_count += 1
        else:
            ham_count += 1

        heuristic_signals = extract_heuristic_indicators(f"{m.subject} {m.body}")
        item = BatchMessageResult(
            index=idx,
            id=m.id,
            subject=m.subject,
            sender=m.sender,
            snippet=m.body[:200],
            prediction=res["prediction"],
            is_spam=is_spam,
            confidence=res["confidence"],
            spam_probability=res["spam_probability"],
            ham_probability=res["ham_probability"],
            risk_level=res["risk_level"],
            heuristic_signals=heuristic_signals
        )
        results.append(item)
        records_to_save.append({
            "subject": m.subject,
            "sender": m.sender,
            "text": m.body,
            "prediction": res["prediction"],
            "is_spam": is_spam,
            "spam_probability": res["spam_probability"],
            "confidence": res["confidence"],
            "risk_level": res["risk_level"]
        })

    total = len(results)
    spam_pct = round((spam_count / total * 100), 2) if total > 0 else 0.0

    session_id = save_session(
        source_type=f"IMAP_{payload.host}",
        total_messages=total,
        spam_count=spam_count,
        ham_count=ham_count,
        filename=f"{payload.username}@{payload.folder}",
        records=records_to_save
    )

    return BatchPredictionResponse(
        session_id=session_id,
        total_messages=total,
        spam_count=spam_count,
        ham_count=ham_count,
        spam_percentage=spam_pct,
        results=results
    )


@router.post("/connector/imap/demo", response_model=BatchPredictionResponse)
def run_demo_inbox_scan():
    """Runs simulated live inbox scanning with authentic multi-category emails."""
    messages = get_demo_inbox_messages()
    texts = [m.body for m in messages]
    subjects = [m.subject for m in messages]
    batch_raw = predict_batch(texts, subjects)

    results = []
    spam_count = 0
    ham_count = 0
    records_to_save = []

    for idx, (m, res) in enumerate(zip(messages, batch_raw)):
        is_spam = res["is_spam"]
        if is_spam:
            spam_count += 1
        else:
            ham_count += 1

        heuristic_signals = extract_heuristic_indicators(f"{m.subject} {m.body}")
        item = BatchMessageResult(
            index=idx,
            id=m.id,
            subject=m.subject,
            sender=m.sender,
            snippet=m.body[:200],
            prediction=res["prediction"],
            is_spam=is_spam,
            confidence=res["confidence"],
            spam_probability=res["spam_probability"],
            ham_probability=res["ham_probability"],
            risk_level=res["risk_level"],
            heuristic_signals=heuristic_signals
        )
        results.append(item)
        records_to_save.append({
            "subject": m.subject,
            "sender": m.sender,
            "text": m.body,
            "prediction": res["prediction"],
            "is_spam": is_spam,
            "spam_probability": res["spam_probability"],
            "confidence": res["confidence"],
            "risk_level": res["risk_level"]
        })

    total = len(results)
    spam_pct = round((spam_count / total * 100), 2) if total > 0 else 0.0

    session_id = save_session(
        source_type="LIVE_INBOX_DEMO",
        total_messages=total,
        spam_count=spam_count,
        ham_count=ham_count,
        filename="live_inbox_simulation.eml",
        records=records_to_save
    )

    return BatchPredictionResponse(
        session_id=session_id,
        total_messages=total,
        spam_count=spam_count,
        ham_count=ham_count,
        spam_percentage=spam_pct,
        results=results
    )


@router.post("/predict/eml", response_model=EMLPredictionResponse)
async def classify_eml_file(file: UploadFile = File(...)):
    """Parses an RFC 822 .eml file, extracts headers and body, and classifies the message."""
    if not file.filename.lower().endswith(".eml"):
        raise HTTPException(status_code=400, detail="Uploaded file must have a .eml extension.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded .eml file is empty.")
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File size exceeds the 25 MB limit.")

    try:
        parsed = parse_eml_bytes(contents, filename=file.filename)
        norm = parsed["normalized"]
        headers_data = parsed["headers"]

        eval_text = norm.body if norm.body else norm.subject
        pred = predict_single(text=eval_text, subject=norm.subject, sender=norm.sender)

        return EMLPredictionResponse(
            filename=file.filename,
            headers=headers_data,
            prediction=pred["prediction"],
            is_spam=pred["is_spam"],
            confidence=pred["confidence"],
            spam_probability=pred["spam_probability"],
            ham_probability=pred["ham_probability"],
            risk_level=pred["risk_level"],
            model_used=pred["model_used"],
            heuristic_signals=pred["heuristic_signals"],
            token_explanations=pred.get("token_explanations", []),
            body_snippet=norm.body[:350]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing .eml file: {str(e)}")
