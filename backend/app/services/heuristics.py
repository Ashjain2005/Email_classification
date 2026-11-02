"""
MailGuard AI - Heuristic Signal Analyzer.

Extracts identifiable suspicious patterns, urgency triggers, and phishing markers.
These are surfaced purely as assistive heuristic signals, NOT as definitive proof.
"""

import re
from typing import List, Dict, Any


SUSPICIOUS_PATTERNS = [
    {
        "id": "financial_urgency",
        "name": "Financial Urgency / Wire Transfer",
        "pattern": r"\b(wire transfer|western union|moneygram|bank account|routing number|cryptocurrency|bitcoin|wallet address)\b",
        "description": "Requests for untraceable or immediate financial transactions."
    },
    {
        "id": "account_alert",
        "name": "Urgent Account Action",
        "pattern": r"\b(account suspended|unauthorized access|verify your identity|security alert|login immediately|password expiring|click here to verify)\b",
        "description": "Classic social-engineering prompt urging hasty credentials verification."
    },
    {
        "id": "prize_lottery",
        "name": "Prize or Lottery Claim",
        "pattern": r"\b(congratulations|you have won|lottery|prize winner|claim your reward|free gift|million dollars|inheritance)\b",
        "description": "Unsolicited reward or lottery notification."
    },
    {
        "id": "pharmaceutical",
        "name": "Pharmaceutical / Prescription Offer",
        "pattern": r"\b(cialis|viagra|valium|xanax|phentermine|prescription free|pharmacy online|weight loss pill)\b",
        "description": "Unsolicited pharmaceutical and medication advertising."
    },
    {
        "id": "pressure_words",
        "name": "High-Pressure Deadline",
        "pattern": r"\b(act now|limited time|urgent response|final notice|expires in 24 hours|immediate action required)\b",
        "description": "Artificial deadlines designed to bypass rational scrutiny."
    },
    {
        "id": "unsubscribe_obfuscation",
        "name": "Commercial Bulk Mail Pattern",
        "pattern": r"\b(opt-out|click here to unsubscribe|to unsubscribe|remove your email|marketing mailing list)\b",
        "description": "Automated marketing or bulk distribution signature."
    }
]


def extract_heuristic_indicators(text: str) -> List[Dict[str, str]]:
    """
    Scans email text for rule-based heuristic indicators.
    Returns matched signals with explanations.
    """
    if not text or not isinstance(text, str):
        return []

    signals = []
    text_lower = text.lower()
    
    for item in SUSPICIOUS_PATTERNS:
        matches = list(set(re.findall(item["pattern"], text_lower, flags=re.IGNORECASE)))
        if matches:
            matched_terms = ", ".join(matches[:4])
            signals.append({
                "signal_id": item["id"],
                "name": item["name"],
                "description": item["description"],
                "matched_terms": matched_terms
            })
            
    # Check for excessive capitalization in original text
    caps_count = sum(1 for c in text if c.isupper())
    total_letters = sum(1 for c in text if c.isalpha())
    if total_letters > 20 and (caps_count / total_letters) > 0.40:
        signals.append({
            "signal_id": "excessive_caps",
            "name": "Excessive Capitalization",
            "description": "High density of uppercase lettering often used in attention-grabbing spam.",
            "matched_terms": f"{int((caps_count / total_letters) * 100)}% uppercase"
        })
        
    return signals
