"""
MailGuard AI - IMAP & Live Email Connector.

Provides authenticated TLS/SSL IMAP connection to Gmail, Outlook, Yahoo,
and custom mail servers, parses MIME message parts, extracts clean body text,
and yields standard NormalizedMessage objects for ML classification.
Also provides a zero-credential simulated mailbox stream for live demonstrations.
"""

import imaplib
import email
from email.header import decode_header
import re
from typing import List, Dict, Any, Generator, Optional
from datetime import datetime

from app.connectors.base import BaseEmailConnector, NormalizedMessage


def decode_mime_words(raw_header: Optional[str]) -> str:
    """Decodes MIME encoded header strings (e.g. =?UTF-8?B?...?=) into unicode."""
    if not raw_header:
        return ""
    decoded_fragments = []
    try:
        for fragment, encoding in decode_header(raw_header):
            if isinstance(fragment, bytes):
                try:
                    decoded_fragments.append(fragment.decode(encoding or "utf-8", errors="replace"))
                except (LookupError, UnicodeDecodeError):
                    decoded_fragments.append(fragment.decode("latin-1", errors="replace"))
            else:
                decoded_fragments.append(str(fragment))
        return " ".join(decoded_fragments).strip()
    except Exception:
        return str(raw_header)


def extract_body_from_email_message(msg: email.message.Message) -> str:
    """Extracts plain text body (or strips HTML if only HTML exists) from email message."""
    text_content = ""
    html_content = ""

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition", ""))

            # Skip file attachments
            if "attachment" in content_disposition:
                continue

            try:
                payload = part.get_payload(decode=True)
                if not payload:
                    continue
                charset = part.get_content_charset() or "utf-8"
                decoded = payload.decode(charset, errors="replace")

                if content_type == "text/plain" and not text_content:
                    text_content = decoded
                elif content_type == "text/html" and not html_content:
                    html_content = decoded
            except Exception:
                continue
    else:
        try:
            payload = msg.get_payload(decode=True)
            if payload:
                charset = msg.get_content_charset() or "utf-8"
                decoded = payload.decode(charset, errors="replace")
                if msg.get_content_type() == "text/html":
                    html_content = decoded
                else:
                    text_content = decoded
        except Exception:
            text_content = str(msg.get_payload() or "")

    # Prefer plain text; if only HTML, strip HTML tags
    body = text_content or html_content
    if not text_content and html_content:
        # Basic tag stripper
        body = re.sub(r"<style[\s\S]*?</style>", "", body, flags=re.IGNORECASE)
        body = re.sub(r"<script[\s\S]*?</script>", "", body, flags=re.IGNORECASE)
        body = re.sub(r"<[^>]+>", " ", body)
        body = re.sub(r"\s+", " ", body).strip()

    return body.strip()


class IMAPEmailConnector(BaseEmailConnector):
    """
    Direct IMAP over SSL Email Connector.
    Supports Gmail (imap.gmail.com), Outlook (outlook.office365.com), Yahoo, and custom hosts.
    """

    PRESETS = {
        "gmail": {"host": "imap.gmail.com", "port": 993, "ssl": True},
        "outlook": {"host": "outlook.office365.com", "port": 993, "ssl": True},
        "yahoo": {"host": "imap.mail.yahoo.com", "port": 993, "ssl": True},
    }

    def __init__(
        self,
        host: str = "imap.gmail.com",
        port: int = 993,
        username: Optional[str] = None,
        password: Optional[str] = None,
        folder: str = "INBOX",
        use_ssl: bool = True
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.folder = folder
        self.use_ssl = use_ssl

    def test_connection(self) -> Dict[str, Any]:
        """Tests IMAP connection and credentials, returning available mailboxes and status."""
        if not self.username or not self.password:
            return {
                "success": False,
                "status": "MISSING_CREDENTIALS",
                "message": "Email address and App Password are required."
            }

        try:
            if self.use_ssl:
                mail = imaplib.IMAP4_SSL(self.host, self.port)
            else:
                mail = imaplib.IMAP4(self.host, self.port)

            mail.login(self.username, self.password)
            status, folders = mail.list()
            folder_names = []
            if status == "OK" and folders:
                for f in folders:
                    match = re.search(r'"[^"]*" "([^"]+)"|([^\s]+)$', f.decode("utf-8", errors="replace"))
                    if match:
                        folder_names.append(match.group(1) or match.group(2))

            # Select target folder and get message count
            res, data = mail.select(self.folder, readonly=True)
            msg_count = 0
            if res == "OK" and data and data[0]:
                msg_count = int(data[0].decode("utf-8", errors="replace"))

            mail.logout()

            return {
                "success": True,
                "status": "CONNECTED",
                "message": f"Successfully connected to {self.host} as {self.username}.",
                "target_folder": self.folder,
                "total_messages": msg_count,
                "folders": folder_names[:10]
            }
        except imaplib.IMAP4.error as e:
            return {
                "success": False,
                "status": "AUTH_FAILED",
                "message": f"IMAP Authentication failed: {str(e)}. (Note: Gmail requires an App Password from your Google Account)."
            }
        except Exception as e:
            return {
                "success": False,
                "status": "CONNECTION_ERROR",
                "message": f"Failed to connect to {self.host}:{self.port} - {str(e)}"
            }

    def fetch_messages(self, limit: Optional[int] = 10) -> Generator[NormalizedMessage, None, None]:
        """Fetches the latest messages from the configured IMAP folder."""
        fetch_limit = limit or 10

        if not self.username or not self.password:
            raise ValueError("Credentials missing for IMAP connector.")

        mail = imaplib.IMAP4_SSL(self.host, self.port) if self.use_ssl else imaplib.IMAP4(self.host, self.port)
        mail.login(self.username, self.password)
        res, _ = mail.select(self.folder, readonly=True)
        if res != "OK":
            mail.logout()
            raise RuntimeError(f"Could not open mailbox folder '{self.folder}'")

        # Search for message IDs
        status, data = mail.search(None, "ALL")
        if status != "OK" or not data or not data[0]:
            mail.logout()
            return

        id_list = data[0].split()
        # Grab the newest messages (tail of ID list)
        target_ids = id_list[-fetch_limit:]
        target_ids.reverse()  # Newest first

        try:
            for msg_id in target_ids:
                res, msg_data = mail.fetch(msg_id, "(RFC822)")
                if res != "OK" or not msg_data:
                    continue

                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        raw_email = response_part[1]
                        parsed = email.message_from_bytes(raw_email)

                        subject = decode_mime_words(parsed.get("Subject", "(No Subject)"))
                        sender = decode_mime_words(parsed.get("From", "(Unknown Sender)"))
                        date_str = decode_mime_words(parsed.get("Date", ""))
                        body = extract_body_from_email_message(parsed)

                        yield NormalizedMessage(
                            id=msg_id.decode("utf-8", errors="replace"),
                            subject=subject,
                            sender=sender,
                            body=body,
                            date=date_str,
                            metadata={"folder": self.folder, "source": "IMAP_LIVE"}
                        )
        finally:
            try:
                mail.close()
                mail.logout()
            except Exception:
                pass


# --- Demonstration Live Inbox Generator ---

DEMO_LIVE_EMAILS = [
    {
        "id": "LIVE-101",
        "sender": "security-alerts@accounts-verify.com",
        "subject": "URGENT: Unauthorized login attempt detected on your profile",
        "date": "Just now",
        "body": "Security Incident Notification: We detected an unrecognized IP address (185.220.101.4) attempting to sign in to your corporate account. If this was not you, please click here immediately to verify your identity and update your credentials within 2 hours or access will be restricted.",
        "expected_label": "Spam"
    },
    {
        "id": "LIVE-102",
        "sender": "sarah.jenkins@acme-engineering.org",
        "subject": "Updated Architecture Diagrams & Thursday Design Review Notes",
        "date": "14 mins ago",
        "body": "Hi team, thanks for the lively discussion during yesterday's system design session. I have pushed the revised microservice sequence diagrams to the shared drive and addressed David's comments on the caching layer. Please review before tomorrow's 2 PM sync.",
        "expected_label": "Ham"
    },
    {
        "id": "LIVE-103",
        "sender": "rewards@international-sweepstakes-lottery.org",
        "subject": "FINAL NOTICE: Claim your $3,800,000 USD lottery prize payout",
        "date": "28 mins ago",
        "body": "Congratulations Valued Beneficiary, your email was selected as the 1st tier lucky winner of 3,800,000 USD in our annual consumer drawing. To arrange swift international wire transfer dispatch, kindly provide your full banking details, phone number, and mailing address to our accredited agent.",
        "expected_label": "Spam"
    },
    {
        "id": "LIVE-104",
        "sender": "alex.miller@consulting-partners.com",
        "subject": "Quick sync regarding Q4 budget deliverables",
        "date": "1 hour ago",
        "body": "Hey Alex, following up on our call yesterday regarding the Q4 fiscal estimates. Are you available for a 15-minute quick touchpoint this afternoon to finalize the department line items? Let me know what time works best on your calendar.",
        "expected_label": "Ham"
    },
    {
        "id": "LIVE-105",
        "sender": "rx-discount@generic-meds-express.biz",
        "subject": "Save 75% on authentic prescription medications — No doctor visit needed!",
        "date": "2 hours ago",
        "body": "Special clearance event! Premium generic Viagra, Cialis, antibiotics, and sleep aids shipped discreetly to your doorstep with guaranteed fast delivery. No prior prescription or consultation required. Shop our secure online pharmacy store now and enjoy massive savings.",
        "expected_label": "Spam"
    },
    {
        "id": "LIVE-106",
        "sender": "billing-support@cloud-invoicing.net",
        "subject": "Action Required: Overdue invoice #INV-94021 for server renewals",
        "date": "3 hours ago",
        "body": "Notice of pending account suspension: Your server hosting subscription invoice #INV-94021 totaling $849.00 remains unpaid. Click the attached payment link now to execute wire transfer or credit card settlement immediately to prevent cloud infrastructure shutdown.",
        "expected_label": "Spam"
    },
    {
        "id": "LIVE-107",
        "sender": "notifications@github.com",
        "subject": "[GitHub] Pull Request #48 merged into main: Add rate-limiting middleware",
        "date": "4 hours ago",
        "body": "DevOps Engineer has merged pull request #48 into repository 'security-backend'. 12 commits, 4 files changed. All automated GitHub Actions CI tests and lint checks have passed successfully.",
        "expected_label": "Ham"
    },
    {
        "id": "LIVE-108",
        "sender": "karen.wong@university-dept.edu",
        "subject": "Project Viva Voce Schedule & Presentation Guidelines",
        "date": "5 hours ago",
        "body": "Dear Students, please find attached the final project defense timetable for next week. Each team will have 20 minutes for live demonstration followed by 10 minutes of question-and-answer with the external examination committee. Please ensure all code repositories and test suites are verified beforehand.",
        "expected_label": "Ham"
    }
]


def get_demo_inbox_messages() -> List[NormalizedMessage]:
    """Returns normalized demo messages representing a realistic live email inbox."""
    messages = []
    for item in DEMO_LIVE_EMAILS:
        messages.append(
            NormalizedMessage(
                id=item["id"],
                subject=item["subject"],
                sender=item["sender"],
                body=item["body"],
                date=item["date"],
                metadata={"source": "DEMO_INBOX", "expected": item["expected_label"]}
            )
        )
    return messages

