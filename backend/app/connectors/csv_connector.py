"""
MailGuard AI - CSV Ingestion Connector.

Parses arbitrary CSV files, auto-detects text/subject/sender columns, and yields NormalizedMessage objects.
"""

import os
import io
from typing import Generator, Optional, Dict, Any, List
import pandas as pd
from app.connectors.base import BaseEmailConnector, NormalizedMessage


class CSVConnector(BaseEmailConnector):
    def __init__(self, file_source: Any, filename: str = "upload.csv", text_col: Optional[str] = None, subject_col: Optional[str] = None, sender_col: Optional[str] = None):
        self.file_source = file_source
        self.filename = filename
        self.text_col = text_col
        self.subject_col = subject_col
        self.sender_col = sender_col
        self.detected_encoding = "utf-8"
        self.columns: List[str] = []

    def _get_buffer(self):
        if isinstance(self.file_source, bytes):
            return io.BytesIO(self.file_source)
        elif isinstance(self.file_source, str) and os.path.exists(self.file_source):
            return self.file_source
        elif hasattr(self.file_source, "read"):
            return self.file_source
        raise ValueError("Invalid file source provided to CSVConnector.")

    def test_connection(self) -> Dict[str, Any]:
        """Inspects headers and identifies best-matching columns."""
        buf = self._get_buffer()
        # Try UTF-8 first, fallback to latin1
        try:
            df_head = pd.read_csv(buf, nrows=5, encoding="utf-8", on_bad_lines="skip")
            self.detected_encoding = "utf-8"
        except (UnicodeDecodeError, Exception):
            buf = self._get_buffer()
            df_head = pd.read_csv(buf, nrows=5, encoding="latin1", on_bad_lines="skip")
            self.detected_encoding = "latin1"

        self.columns = list(df_head.columns)
        
        # Auto-detect text column if not provided
        if not self.text_col:
            for candidate in ["text", "body", "message", "email", "content", "email_text", "sms"]:
                for col in self.columns:
                    if candidate == col.lower().strip():
                        self.text_col = col
                        break
                if self.text_col:
                    break
                    
        # Auto-detect subject column
        if not self.subject_col:
            for candidate in ["subject", "title", "headline"]:
                for col in self.columns:
                    if candidate == col.lower().strip():
                        self.subject_col = col
                        break
                if self.subject_col:
                    break

        # Auto-detect sender column
        if not self.sender_col:
            for candidate in ["sender", "from", "author"]:
                for col in self.columns:
                    if candidate == col.lower().strip():
                        self.sender_col = col
                        break
                if self.sender_col:
                    break

        # If still no text col, pick first string/object column
        if not self.text_col and self.columns:
            for col in self.columns:
                if col.lower() not in ["label", "target", "class", "id", "index"]:
                    self.text_col = col
                    break
            if not self.text_col:
                self.text_col = self.columns[0]

        return {
            "ready": True,
            "filename": self.filename,
            "detected_encoding": self.detected_encoding,
            "columns": self.columns,
            "selected_text_column": self.text_col,
            "selected_subject_column": self.subject_col,
            "selected_sender_column": self.sender_col
        }

    def fetch_messages(self, limit: Optional[int] = None) -> Generator[NormalizedMessage, None, None]:
        """Streams normalized messages chunk-by-chunk."""
        self.test_connection()
        buf = self._get_buffer()
        
        chunk_size = 5000
        yielded_count = 0
        
        for chunk in pd.read_csv(
            buf,
            chunksize=chunk_size,
            encoding=self.detected_encoding,
            on_bad_lines="skip",
            low_memory=False
        ):
            for idx, row in chunk.iterrows():
                body_val = str(row[self.text_col]) if (self.text_col and self.text_col in row and pd.notna(row[self.text_col])) else ""
                subj_val = str(row[self.subject_col]) if (self.subject_col and self.subject_col in row and pd.notna(row[self.subject_col])) else ""
                sender_val = str(row[self.sender_col]) if (self.sender_col and self.sender_col in row and pd.notna(row[self.sender_col])) else ""
                
                # Filter out pure nulls
                if not body_val.strip() and not subj_val.strip():
                    continue

                msg = NormalizedMessage(
                    id=str(idx + 1),
                    subject=subj_val.strip(),
                    sender=sender_val.strip(),
                    body=body_val.strip(),
                    metadata={"source_row": idx + 1, "filename": self.filename}
                )
                yield msg
                yielded_count += 1
                if limit and yielded_count >= limit:
                    return
