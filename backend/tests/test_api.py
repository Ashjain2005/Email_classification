"""
Integration Tests for MailGuard AI FastAPI Endpoints.
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    assert "Logistic Regression" in data["model_name"]


def test_metrics_endpoint():
    response = client.get("/api/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    assert "logistic_regression" in data["models"]
    assert "multinomial_nb" in data["models"]
    assert data["models"]["logistic_regression"]["accuracy"] > 0.90
    assert "confusion_matrix" in data["models"]["logistic_regression"]


def test_predict_single_spam():
    payload = {
        "subject": "URGENT PRIZE CLAIM",
        "text": "Congratulations! You have won $5,000,000. Send bank wire transfer info immediately to claim.",
        "sender": "lottery@reward-win.com"
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] == "Spam"
    assert data["is_spam"] is True
    assert data["spam_probability"] > 0.50
    assert data["risk_level"] in ["High", "Medium"]
    assert len(data["heuristic_signals"]) > 0


def test_predict_single_ham():
    payload = {
        "subject": "Quarterly Planning Session",
        "text": "Hi team, please find the attached notes from our engineering standup. Let me know if you have feedback.",
        "sender": "alex@company.org"
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] == "Ham"
    assert data["is_spam"] is False
    assert data["ham_probability"] > 0.50


def test_predict_empty_text_error():
    payload = {"text": "   "}
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 400


def test_predict_batch():
    payload = {
        "messages": [
            {"text": "Cheap pharmacy pills online without prescription. Order now!", "subject": "Discounts"},
            {"text": "Hey Sarah, are we still meeting for lunch tomorrow?", "subject": "Lunch"}
        ]
    }
    response = client.post("/api/predict/batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_messages"] == 2
    assert data["spam_count"] == 1
    assert data["ham_count"] == 1
    assert len(data["results"]) == 2
    assert data["session_id"] is not None


def test_predict_csv_upload():
    sample_csv_path = os.path.join(os.path.dirname(backend_dir), "data", "samples", "sample_test_emails.csv")
    assert os.path.exists(sample_csv_path)
    
    with open(sample_csv_path, "rb") as f:
        response = client.post(
            "/api/predict/csv",
            files={"file": ("sample_test_emails.csv", f, "text/csv")}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["total_messages"] == 40
    assert data["spam_count"] > 0
    assert data["ham_count"] > 0
    assert len(data["results"]) == 40
    assert data["session_id"] is not None


def test_history_and_export():
    # Fetch history
    hist_resp = client.get("/api/history")
    assert hist_resp.status_code == 200
    hist_data = hist_resp.json()
    assert hist_data["total_sessions"] > 0
    assert len(hist_data["sessions"]) > 0
    
    # Export first session
    session_id = hist_data["sessions"][0]["id"]
    export_resp = client.get(f"/api/export/{session_id}")
    assert export_resp.status_code == 200
    assert "text/csv" in export_resp.headers["content-type"]
    assert "Record_ID,Created_At,Subject" in export_resp.text


def test_gmail_connector_status():
    resp = client.get("/api/connector/gmail/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["configured"] is False
    assert data["status"] == "NOT_CONFIGURED"
    assert "gmail.readonly" in data["scope_required"]
