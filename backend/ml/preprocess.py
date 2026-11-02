"""
MailGuard AI - Text Preprocessing and Normalization Module.

Handles cleaning, text normalization, and formatting for email inputs.
Designed to handle both raw email text and combined Subject/Body fields.
"""

import re
from typing import Optional, Union, List
import pandas as pd


def clean_text(text: Union[str, float, None]) -> str:
    """
    Cleans raw email or SMS text while preserving semantic signals:
    - Normalizes common Kaggle replacement tokens (e.g., 'escapenumber').
    - Standardizes URL and email address occurrences into representative tokens.
    - Preserves monetary/currency symbols ($ £ €) as valuable spam indicators.
    - Strips excessive whitespace and non-printable control characters.
    """
    if text is None or pd.isna(text):
        return ""
    
    s = str(text)
    
    # Normalize kaggle-specific tokens found in datasets
    s = re.sub(r'escapenumber', ' number ', s, flags=re.IGNORECASE)
    
    # Normalize URLs to a uniform token
    s = re.sub(r'https?://\S+|www\.\S+', ' urltoken ', s)
    
    # Normalize email addresses
    s = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', ' emailtoken ', s)
    
    # Normalize dollar amounts and numbers
    s = re.sub(r'[\$£€]\s*\d+[\d,.]*', ' currencydollar ', s)
    
    # Remove control characters and non-ascii artifacts
    s = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', ' ', s)
    
    # Collapse consecutive whitespace
    s = re.sub(r'\s+', ' ', s).strip()
    
    return s.lower()


def format_email_input(subject: Optional[str] = None, body: Optional[str] = None, raw_text: Optional[str] = None) -> str:
    """
    Prepares a unified text string for classification.
    Supports Subject + Body separation or single text fields.
    """
    if raw_text and raw_text.strip():
        return clean_text(raw_text)
    
    parts = []
    if subject and subject.strip():
        parts.append(f"Subject: {subject.strip()}")
    if body and body.strip():
        parts.append(body.strip())
        
    combined = " ".join(parts) if parts else ""
    return clean_text(combined)


def batch_clean_texts(texts: List[str]) -> List[str]:
    """Efficient batch text cleaner."""
    return [clean_text(t) for t in texts]
