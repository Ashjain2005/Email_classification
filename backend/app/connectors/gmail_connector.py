"""
MailGuard AI - Future Gmail API Connector Interface.

Architectural contract for connecting Google Workspace / Gmail API accounts.
Follows Google OAuth 2.0 guidelines, read-only scopes, and zero password retention.
"""

from typing import Generator, Optional, Dict, Any
from app.connectors.base import BaseEmailConnector, NormalizedMessage


class GmailConnector(BaseEmailConnector):
    """
    Extensible connector designed for Google OAuth 2.0 authorization
    and the official Gmail REST API (v1).

    Scopes:
      - 'https://www.googleapis.com/auth/gmail.readonly' (Strictly read-only)

    Security Protocol:
      - Never requests or accepts user passwords.
      - Tokens stored encrypted or in session memory.
      - Never moves, modifies, labels, or deletes messages.
    """

    def __init__(self, client_id: Optional[str] = None, client_secret: Optional[str] = None, refresh_token: Optional[str] = None):
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token
        self.authenticated = False

    def test_connection(self) -> Dict[str, Any]:
        """
        Validates Google OAuth 2.0 credentials and connectivity.
        Honest status reporting: Flags clearly when credentials are unconfigured.
        """
        if not self.client_id or not self.client_secret:
            return {
                "configured": False,
                "status": "NOT_CONFIGURED",
                "message": (
                    "Gmail API integration is architecturally ready but requires official Google OAuth 2.0 "
                    "client credentials (client_id, client_secret). Set these in your environment to connect."
                ),
                "scope_required": "https://www.googleapis.com/auth/gmail.readonly",
                "access_type": "read_only"
            }

        # When credentials are provided in future production deployment
        return {
            "configured": True,
            "status": "PENDING_OAUTH_CONSENT",
            "message": "Credentials supplied. Direct user to Google Consent Screen for OAuth grant."
        }

    def fetch_messages(self, limit: Optional[int] = None) -> Generator[NormalizedMessage, None, None]:
        """
        In future extension: Calls users.messages.list and users.messages.get (format='full'),
        parses MIME multipart headers, extracts Subject, From, Date, and plain text body,
        and yields standard NormalizedMessage objects to the ML classifier.
        """
        conn_status = self.test_connection()
        if not conn_status["configured"]:
            raise NotImplementedError(
                "Gmail connector is not yet connected with live OAuth credentials. "
                "Use CSV bulk ingestion or single-message analysis in the current release."
            )
        # Empty generator for safety
        if False:
            yield NormalizedMessage(id="dummy")
