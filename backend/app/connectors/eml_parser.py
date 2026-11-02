"""
MailGuard AI - Raw .EML / RFC 822 Email Parser.

Extracts headers, multipart plain text and HTML bodies, attachment names,
and performs RFC-822 header security diagnostics (e.g. Reply-To domain spoofing,
missing Message-ID, Received hop count, DKIM/SPF indicators).
"""

import email
from email.header import decode_header
import re
from typing import Dict, Any, List, Optional

from app.connectors.base import NormalizedMessage
from app.connectors.imap_connector import decode_mime_words, extract_body_from_email_message


def extract_domain(email_address: str) -> str:
    """Extracts lowercase domain from an email address string like 'Name <user@domain.com>'."""
    match = re.search(r'@([\w.-]+)', email_address)
    return match.group(1).lower() if match else ""


def parse_eml_bytes(raw_bytes: bytes, filename: str = "message.eml") -> Dict[str, Any]:
    """
    Parses raw bytes of an .eml email file into structured metadata,
    extracted body text, and header security diagnostics.
    """
    msg = email.message_from_bytes(raw_bytes)

    subject = decode_mime_words(msg.get("Subject", "(No Subject)"))
    sender = decode_mime_words(msg.get("From", "(Unknown Sender)"))
    recipient = decode_mime_words(msg.get("To", ""))
    cc = decode_mime_words(msg.get("Cc", ""))
    date = decode_mime_words(msg.get("Date", ""))
    message_id = msg.get("Message-ID", "")
    reply_to = decode_mime_words(msg.get("Reply-To", ""))

    # Count hops
    received_headers = msg.get_all("Received", [])
    hop_count = len(received_headers)

    # Auth headers
    auth_results = msg.get("Authentication-Results", "")
    dkim_signature = bool(msg.get("DKIM-Signature", ""))

    # Attachments
    attachments = []
    if msg.is_multipart():
        for part in msg.walk():
            disposition = str(part.get("Content-Disposition", ""))
            if "attachment" in disposition or part.get_filename():
                fname = part.get_filename() or "unnamed_attachment"
                payload = part.get_payload(decode=True)
                size_bytes = len(payload) if payload else 0
                attachments.append({
                    "filename": decode_mime_words(fname),
                    "content_type": part.get_content_type(),
                    "size_bytes": size_bytes
                })

    body = extract_body_from_email_message(msg)

    # Security header diagnostics
    header_anomalies = []
    from_domain = extract_domain(sender)
    reply_to_domain = extract_domain(reply_to) if reply_to else ""

    if reply_to_domain and from_domain and reply_to_domain != from_domain:
        header_anomalies.append({
            "code": "SPOOF_REPLY_TO_MISMATCH",
            "severity": "High",
            "description": f"Reply-To domain (@{reply_to_domain}) differs from From domain (@{from_domain}). Common indicator of display name spoofing or credential phishing."
        })

    if not message_id:
        header_anomalies.append({
            "code": "MISSING_MESSAGE_ID",
            "severity": "Medium",
            "description": "Standard RFC 5322 Message-ID header is absent. Typical in amateur spam generator scripts."
        })

    normalized = NormalizedMessage(
        id=filename,
        subject=subject,
        sender=sender,
        body=body,
        date=date,
        metadata={
            "recipient": recipient,
            "cc": cc,
            "message_id": message_id,
            "reply_to": reply_to,
            "hop_count": hop_count,
            "has_dkim": dkim_signature,
            "attachments": attachments,
            "header_anomalies": header_anomalies,
            "source": "EML_FILE"
        }
    )

    return {
        "normalized": normalized,
        "headers": {
            "subject": subject,
            "sender": sender,
            "recipient": recipient,
            "cc": cc,
            "date": date,
            "message_id": message_id,
            "reply_to": reply_to,
            "hop_count": hop_count,
            "has_dkim": dkim_signature,
            "auth_results": auth_results[:120] if auth_results else "None recorded",
            "attachments": attachments,
            "header_anomalies": header_anomalies
        }
    }

