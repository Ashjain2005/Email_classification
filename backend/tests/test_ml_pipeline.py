"""
Unit and Integration Tests for MailGuard AI ML Pipeline.
"""

import os
import sys
import pytest

# Ensure backend directory is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ml.preprocess import clean_text, format_email_input
from ml.predict import predict_single, predict_batch, is_model_available, get_pipeline
from app.services.heuristics import extract_heuristic_indicators


def test_clean_text():
    raw = "Subject: Claim YOUR $$$ 500 now at http://evil.com! escapenumber"
    cleaned = clean_text(raw)
    assert "currencydollar" in cleaned
    assert "urltoken" in cleaned
    assert "number" in cleaned
    assert "escapenumber" not in cleaned


def test_format_email_input():
    # Both subject and body
    res = format_email_input(subject="Quarterly Review", body="Please see the attached budget.")
    assert "subject: quarterly review" in res
    assert "budget" in res
    
    # Body only
    res2 = format_email_input(body="Hello team")
    assert "hello team" in res2
    
    # Empty inputs
    assert format_email_input(None, None) == ""


def test_model_artifact_exists():
    assert is_model_available() is True


def test_pipeline_loading():
    pipeline, metadata = get_pipeline()
    assert pipeline is not None
    assert metadata["model_name"] == "Logistic Regression"
    assert "Spam" in metadata["classes"]
    assert "Ham" in metadata["classes"]


def test_single_prediction_obvious_spam():
    spam_sample = (
        "URGENT: You have won $1,000,000 in the international lottery! "
        "Send your bank account details and wire transfer fee immediately to claim."
    )
    res = predict_single(spam_sample, subject="CONGRATULATIONS PRIZE WINNER")
    assert res["prediction"] == "Spam"
    assert res["is_spam"] is True
    assert res["spam_probability"] > 0.50
    assert len(res["heuristic_signals"]) > 0


def test_single_prediction_obvious_ham():
    ham_sample = (
        "Hi John, regarding tomorrow's engineering sync, I have updated the Jira tickets "
        "and pushed the pull request for code review. Let me know when you have time to look."
    )
    res = predict_single(ham_sample, subject="Sprint update")
    assert res["prediction"] == "Ham"
    assert res["is_spam"] is False
    assert res["ham_probability"] > 0.50


def test_empty_message_handling():
    res = predict_single("")
    assert res["prediction"] == "Unknown"
    assert res["confidence"] == 0.0


def test_batch_prediction():
    texts = [
        "Special discount on generic medications. Order today with free delivery.",
        "Can we reschedule our lunch meeting to Thursday at 1pm?"
    ]
    batch_res = predict_batch(texts)
    assert len(batch_res) == 2
    assert batch_res[0]["prediction"] == "Spam"
    assert batch_res[1]["prediction"] == "Ham"


def test_heuristic_indicators():
    text = "Immediate action required! Your account suspended. Wire transfer $500 to restore access."
    signals = extract_heuristic_indicators(text)
    signal_ids = [s["signal_id"] for s in signals]
    assert "account_alert" in signal_ids
    assert "financial_urgency" in signal_ids
