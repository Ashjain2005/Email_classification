"""
Integration Tests for MailGuard AI Live Email Connector & EML Parser.
"""

import os
import sys
import io
import pytest
from fastapi.testclient import TestClient

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app

client = TestClient(app)


def test_imap_demo_scan():
    """Validates simulated live email inbox scanning."""
    response = client.post("/api/connector/imap/demo")
    assert response.status_code == 200
    data = response.json()
    assert data["total_messages"] >= 5
    assert data["spam_count"] > 0
    assert data["ham_count"] > 0
    assert len(data["results"]) == data["total_messages"]
    assert data["session_id"] is not None


def test_imap_connection_test_missing_creds():
    """Validates rejection of missing IMAP credentials."""
    payload = {
        "host": "imap.gmail.com",
        "port": 993,
        "username": "",
        "password": "",
        "folder": "INBOX",
        "use_ssl": True
    }
    response = client.post("/api/connector/imap/test", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert data["status"] == "MISSING_CREDENTIALS"


def test_predict_single_with_token_explanations():
    """Validates that predict_single returns local feature token explanations."""
    payload = {
        "subject": "Urgent Prize Notification",
        "text": "Congratulations you won a free cash prize wire transfer! Claim immediately.",
        "sender": "lottery@scam.org"
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "token_explanations" in data
    assert isinstance(data["token_explanations"], list)
    assert len(data["token_explanations"]) > 0
    # At least one token has spam direction
    assert any(t["direction"] == "spam" for t in data["token_explanations"])


def test_eml_file_upload_classification():
    """Validates RFC-822 .eml file parsing and header diagnostic extraction."""
    raw_eml = b"""From: PayPal Security <service@paypal-alerts.com>
Reply-To: phisher@attacker-server.ru
To: victim@company.com
Subject: URGENT: Your PayPal Account Has Been Suspended!
Date: Mon, 2 Nov 2026 09:30:00 +0000
Message-ID: <12345@paypal-alerts.com>
Content-Type: text/plain; charset="utf-8"

FINAL WARNING: You have won a cash prize and your PayPal account has been restricted.
Click here immediately to verify your credit card and bank wire details to claim $5,000,000 USD funds.
"""
    files = {
        "file": ("phishing_alert.eml", io.BytesIO(raw_eml), "message/rfc822")
    }
    response = client.post("/api/predict/eml", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "phishing_alert.eml"
    assert data["headers"]["subject"] == "URGENT: Your PayPal Account Has Been Suspended!"
    assert len(data["headers"]["header_anomalies"]) > 0
    assert any(a["code"] == "SPOOF_REPLY_TO_MISMATCH" for a in data["headers"]["header_anomalies"])
    assert data["is_spam"] is True
