"""
MailGuard AI - SQLite Database Layer for Analysis Session Persistence.

Uses parameterized queries and stores metadata and privacy-conscious snippets.
"""

import os
import sqlite3
import uuid
import time
from typing import Dict, Any, List, Optional

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "mailguard.db")


def get_connection() -> sqlite3.Connection:
    """Creates a thread-safe connection to SQLite with row factories."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes schema if not present."""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS analysis_sessions (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                source_type TEXT NOT NULL,
                filename TEXT,
                total_messages INTEGER NOT NULL,
                spam_count INTEGER NOT NULL,
                ham_count INTEGER NOT NULL,
                spam_ratio REAL NOT NULL
            )
        """)
        
        # Classification records table (storing privacy-safe snippets)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS classification_records (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                subject TEXT,
                sender TEXT,
                snippet TEXT NOT NULL,
                prediction TEXT NOT NULL,
                is_spam INTEGER NOT NULL,
                spam_probability REAL NOT NULL,
                confidence REAL NOT NULL,
                risk_level TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES analysis_sessions(id) ON DELETE CASCADE
            )
        """)
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_session ON classification_records(session_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_created ON analysis_sessions(created_at DESC)")
        conn.commit()


def save_session(
    source_type: str,
    total_messages: int,
    spam_count: int,
    ham_count: int,
    filename: Optional[str] = None,
    records: Optional[List[Dict[str, Any]]] = None
) -> str:
    """Persists an analysis session and its classified records."""
    init_db()
    session_id = str(uuid.uuid4())[:8]
    created_at = time.strftime("%Y-%m-%d %H:%M:%S")
    spam_ratio = round((spam_count / total_messages * 100), 2) if total_messages > 0 else 0.0

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO analysis_sessions (id, created_at, source_type, filename, total_messages, spam_count, ham_count, spam_ratio)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (session_id, created_at, source_type, filename, total_messages, spam_count, ham_count, spam_ratio))

        if records:
            record_rows = []
            for r in records:
                rec_id = str(uuid.uuid4())[:12]
                snippet = (r.get("text") or r.get("snippet") or "")[:200]
                record_rows.append((
                    rec_id,
                    session_id,
                    created_at,
                    r.get("subject", ""),
                    r.get("sender", ""),
                    snippet,
                    r.get("prediction", "Unknown"),
                    1 if r.get("is_spam") else 0,
                    float(r.get("spam_probability", 0.0)),
                    float(r.get("confidence", 0.0)),
                    r.get("risk_level", "Minimal")
                ))
            
            cursor.executemany("""
                INSERT INTO classification_records (
                    id, session_id, created_at, subject, sender, snippet, prediction, is_spam, spam_probability, confidence, risk_level
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, record_rows)

        conn.commit()

    return session_id


def get_sessions(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieves recent analysis sessions."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, created_at, source_type, filename, total_messages, spam_count, ham_count, spam_ratio
            FROM analysis_sessions
            ORDER BY created_at DESC
            LIMIT ?
        """, (limit,))
        return [dict(row) for row in cursor.fetchall()]


def get_session_by_id(session_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves session metadata by ID."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM analysis_sessions WHERE id = ?", (session_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_session_records(session_id: str) -> List[Dict[str, Any]]:
    """Retrieves records for a given session."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, session_id, created_at, subject, sender, snippet, prediction, is_spam, spam_probability, confidence, risk_level
            FROM classification_records
            WHERE session_id = ?
            ORDER BY id ASC
        """, (session_id,))
        return [dict(row) for row in cursor.fetchall()]


def get_aggregate_stats() -> Dict[str, Any]:
    """Retrieves cumulative operational statistics across all sessions."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                COUNT(*) as total_sessions,
                COALESCE(SUM(total_messages), 0) as total_messages,
                COALESCE(SUM(spam_count), 0) as total_spam,
                COALESCE(SUM(ham_count), 0) as total_ham
            FROM analysis_sessions
        """)
        row = cursor.fetchone()
        total_sessions = row["total_sessions"]
        total_messages = row["total_messages"]
        total_spam = row["total_spam"]
        total_ham = row["total_ham"]
        spam_ratio = round((total_spam / total_messages * 100), 2) if total_messages > 0 else 0.0

        return {
            "total_sessions": total_sessions,
            "total_messages": total_messages,
            "total_spam": total_spam,
            "total_ham": total_ham,
            "spam_ratio": spam_ratio
        }


def delete_session(session_id: str) -> bool:
    """Deletes an analysis session and its associated records."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM classification_records WHERE session_id = ?", (session_id,))
        cursor.execute("DELETE FROM analysis_sessions WHERE id = ?", (session_id,))
        conn.commit()
        return cursor.rowcount > 0


def clear_all_history() -> bool:
    """Clears all historical sessions and records from the database."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM classification_records")
        cursor.execute("DELETE FROM analysis_sessions")
        conn.commit()
        return True

