"""
MailGuard AI - Production Inference Service.

Loads the persisted Scikit-learn Pipeline and provides fast single and
batch prediction with probability scores, confidence metrics, and heuristic signals.
"""

import os
import sys
import logging
from typing import Dict, Any, List, Optional
import joblib

# Add backend directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ml.preprocess import clean_text, format_email_input
from app.services.heuristics import extract_heuristic_indicators

logger = logging.getLogger("MailGuard-Inference")

_PIPELINE = None
_METADATA = None
_MODEL_PATH = os.path.join(backend_dir, "models", "mailguard_pipeline.joblib")


def get_pipeline():
    """Lazily loads and caches the trained pipeline to avoid reload overhead."""
    global _PIPELINE, _METADATA
    if _PIPELINE is None:
        if not os.path.exists(_MODEL_PATH):
            raise FileNotFoundError(
                f"Model artifact not found at {_MODEL_PATH}. "
                "Please run `python backend/ml/train.py` to train and serialize the model."
            )
        logger.info(f"Loading MailGuard pipeline from {_MODEL_PATH}...")
        artifact = joblib.load(_MODEL_PATH)
        _PIPELINE = artifact["pipeline"]
        _METADATA = artifact.get("metadata", {})
        logger.info("Pipeline loaded successfully.")
    return _PIPELINE, _METADATA


def is_model_available() -> bool:
    """Checks if the serialized model file is present."""
    return os.path.exists(_MODEL_PATH)


def explain_tokens(normalized_text: str, top_k: int = 10) -> List[Dict[str, Any]]:
    """
    Computes local feature contribution (TF-IDF value * Logistic Regression coefficient)
    for active words in normalized_text.
    """
    try:
        pipeline, _ = get_pipeline()
        tfidf = pipeline.named_steps.get("tfidf")
        clf = pipeline.named_steps.get("clf")
        if tfidf is None or clf is None:
            return []

        vec = tfidf.transform([normalized_text])
        if vec.nnz == 0:
            return []

        feature_names = tfidf.get_feature_names_out()
        coefs = clf.coef_[0]

        contributions = []
        for idx, val in zip(vec.indices, vec.data):
            token_name = feature_names[idx]
            weight = float(val * coefs[idx])
            if abs(weight) >= 0.05:
                direction = "spam" if weight > 0 else "ham"
                contributions.append({
                    "token": token_name,
                    "weight": round(weight, 3),
                    "direction": direction
                })

        contributions.sort(key=lambda x: abs(x["weight"]), reverse=True)
        return contributions[:top_k]
    except Exception as e:
        logger.warning(f"Failed to compute token explanations: {e}")
        return []


def predict_single(text: str, subject: Optional[str] = None, sender: Optional[str] = None) -> Dict[str, Any]:
    """
    Classifies a single message with class probabilities and heuristic indicators.
    """
    pipeline, metadata = get_pipeline()
    
    # Format and clean text
    normalized_text = format_email_input(subject=subject, body=text)
    if not normalized_text:
        return {
            "prediction": "Unknown",
            "is_spam": False,
            "confidence": 0.0,
            "spam_probability": 0.0,
            "ham_probability": 0.0,
            "risk_level": "None",
            "model_used": metadata.get("model_name", "Unknown"),
            "heuristic_signals": [],
            "explanation": "Empty or whitespace-only message cannot be evaluated.",
            "subject": subject or "",
            "sender": sender or "",
            "token_explanations": []
        }
        
    # Get probabilities
    raw_probs = pipeline.predict_proba([normalized_text])[0]
    # Class mapping: index 0 = Ham, index 1 = Spam
    ham_prob = float(raw_probs[0])
    spam_prob = float(raw_probs[1])
    
    is_spam = spam_prob >= 0.50
    predicted_label = "Spam" if is_spam else "Ham"
    confidence = spam_prob if is_spam else ham_prob
    
    # Determine risk category
    if spam_prob >= 0.80:
        risk_level = "High"
    elif spam_prob >= 0.50:
        risk_level = "Medium"
    elif spam_prob >= 0.20:
        risk_level = "Low"
    else:
        risk_level = "Minimal"
        
    heuristic_signals = extract_heuristic_indicators(f"{subject or ''} {text}")
    token_explanations = explain_tokens(normalized_text, top_k=10)
    
    # Construct professional, unpretentious explanation
    if is_spam:
        explanation = (
            f"The model classified this message as Spam with {spam_prob * 100:.1f}% estimated probability. "
            f"Its vocabulary and token distributions match patterns commonly observed in unsolicited or bulk messages. "
            "Note: This classification is a statistical estimate and does not provide forensic proof of malicious intent."
        )
    else:
        explanation = (
            f"The model classified this message as Ham (Legitimate) with {ham_prob * 100:.1f}% estimated probability. "
            f"Its textual structure closely aligns with legitimate correspondence. "
            "Important: A 'Ham' rating does not guarantee total safety; remain vigilant for targeted spear-phishing."
        )
        
    return {
        "prediction": predicted_label,
        "is_spam": is_spam,
        "confidence": round(confidence, 4),
        "spam_probability": round(spam_prob, 4),
        "ham_probability": round(ham_prob, 4),
        "risk_level": risk_level,
        "model_used": metadata.get("model_name", "Trained Classifier"),
        "heuristic_signals": heuristic_signals,
        "explanation": explanation,
        "subject": subject or "",
        "sender": sender or "",
        "token_explanations": token_explanations
    }


def predict_batch(texts: List[str], subjects: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Efficiently classifies a batch of texts using vectorized transform and matrix prediction.
    """
    pipeline, metadata = get_pipeline()
    
    if subjects is None:
        subjects = ["" for _ in texts]
        
    cleaned_texts = [
        format_email_input(subject=s, body=t)
        for s, t in zip(subjects, texts)
    ]
    
    # Run batch inference
    all_probs = pipeline.predict_proba(cleaned_texts)
    results = []
    
    for idx, (raw_text, s_prob_tuple) in enumerate(zip(texts, all_probs)):
        ham_prob = float(s_prob_tuple[0])
        spam_prob = float(s_prob_tuple[1])
        is_spam = spam_prob >= 0.50
        predicted_label = "Spam" if is_spam else "Ham"
        confidence = spam_prob if is_spam else ham_prob
        
        if spam_prob >= 0.80:
            risk_level = "High"
        elif spam_prob >= 0.50:
            risk_level = "Medium"
        elif spam_prob >= 0.20:
            risk_level = "Low"
        else:
            risk_level = "Minimal"
            
        results.append({
            "index": idx,
            "prediction": predicted_label,
            "is_spam": is_spam,
            "confidence": round(confidence, 4),
            "spam_probability": round(spam_prob, 4),
            "ham_probability": round(ham_prob, 4),
            "risk_level": risk_level
        })
        
    return results
