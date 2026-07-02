import logging
import sqlite3
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config.settings import DB_PATH

logger = logging.getLogger(__name__)


def _migrate_drop_evaluations_fk(conn: sqlite3.Connection):
    """Rimuove il FOREIGN KEY legacy evaluations.log_id -> chat_logs(id).

    log_id e' polimorfico per design (punta a chat_logs.id o user_chats.id a
    seconda del flusso): con PRAGMA foreign_keys=ON quel vincolo fa fallire
    ogni valutazione delle user chat. Le cascate sono gestite manualmente nei
    layer di delete. CREATE TABLE IF NOT EXISTS non aggiorna le tabelle
    esistenti, quindi i database creati con il vecchio schema vanno ricostruiti.
    """
    row = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='evaluations'"
    ).fetchone()
    if not row or "FOREIGN KEY" not in row[0].upper():
        return

    logger.info("Migrazione: rimozione FK legacy da evaluations…")
    conn.execute("PRAGMA foreign_keys=OFF")
    conn.executescript("""
        BEGIN;
        CREATE TABLE evaluations_new (
            id TEXT PRIMARY KEY,
            log_id TEXT,
            overall_score REAL,
            technical_score REAL,
            completeness_score REAL,
            business_score REAL,
            consistency_score REAL,
            prompt_compliance_score REAL,
            helpfulness_score REAL,
            tone_score REAL,
            hallucination_score REAL,
            efficiency_score REAL,
            source_reliability_score REAL,
            feedback TEXT,
            issues TEXT,
            created_at TEXT
        );
        INSERT INTO evaluations_new SELECT
            id, log_id, overall_score, technical_score, completeness_score,
            business_score, consistency_score, prompt_compliance_score,
            helpfulness_score, tone_score, hallucination_score,
            efficiency_score, source_reliability_score,
            feedback, issues, created_at
        FROM evaluations;
        DROP TABLE evaluations;
        ALTER TABLE evaluations_new RENAME TO evaluations;
        COMMIT;
    """)
    conn.execute("PRAGMA foreign_keys=ON")
    logger.info("Migrazione completata: evaluations ricostruita senza FK.")


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # WAL migliora la concorrenza lettura/scrittura senza lock esclusivi
    conn.execute("PRAGMA journal_mode=WAL")

    _migrate_drop_evaluations_fk(conn)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS logs_normalized (
        id TEXT PRIMARY KEY,
        external_id TEXT UNIQUE,
        ticket TEXT,
        client TEXT,
        area TEXT,
        category TEXT,
        raw_markdown TEXT,
        structured_json TEXT,
        usage_json TEXT,
        created_at TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS evaluations (
        id TEXT PRIMARY KEY,
        log_id TEXT,
        overall_score REAL,
        technical_score REAL,
        completeness_score REAL,
        business_score REAL,
        consistency_score REAL,
        prompt_compliance_score REAL,
        helpfulness_score REAL,
        tone_score REAL,
        hallucination_score REAL,
        efficiency_score REAL,
        source_reliability_score REAL,
        feedback TEXT,
        issues TEXT,
        created_at TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_logs (
        id TEXT PRIMARY KEY,
        assistant_id TEXT,
        chat_id TEXT,
        message_count INTEGER,
        messages_json TEXT,
        created_at TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_chats (
        id TEXT PRIMARY KEY,
        system_prompt TEXT,
        messages_json TEXT NOT NULL,
        message_count INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
    )
    """)

    # Indici per le query più frequenti
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_logs_chat_id ON chat_logs(chat_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_evaluations_log_id ON evaluations(log_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON evaluations(created_at)")

    conn.commit()
    conn.close()
    logger.info("Database inizializzato (WAL attivo, indici creati).")


@asynccontextmanager
async def database_lifespan(app: FastAPI):
    init_db()
    yield
