"""
MailGuard AI - Base Email Connector Interface.

Decouples ingestion source (CSV, Future Gmail API, IMAP, etc.) from the ML pipeline.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Generator, Optional


@dataclass
class NormalizedMessage:
    """Standardized message schema passed directly to the classification engine."""
    id: str
    subject: str = ""
    sender: str = ""
    body: str = ""
    date: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def get_classification_text(self) -> str:
        """Constructs canonical text for model vectorization."""
        if self.subject and self.body:
            return f"Subject: {self.subject} {self.body}"
        return self.body or self.subject or ""


class BaseEmailConnector(ABC):
    """Abstract connector contract that all message sources must implement."""

    @abstractmethod
    def test_connection(self) -> Dict[str, Any]:
        """Validates connection or file readiness."""
        pass

    @abstractmethod
    def fetch_messages(self, limit: Optional[int] = None) -> Generator[NormalizedMessage, None, None]:
        """Streams or returns normalized messages."""
        pass
