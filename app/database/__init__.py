from contextlib import asynccontextmanager
from fastapi import FastAPI
import sqlite3
from app.config.settings import DB_PATH



# setup delle tabelle nel database SQLite

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

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
    );
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
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_logs (
        id TEXT PRIMARY KEY,
        assistant_id TEXT,
        chat_id TEXT,
        message_count INTEGER,
        messages_json TEXT,
        created_at TEXT
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_chats (
        id TEXT PRIMARY KEY,
        system_prompt TEXT,
        messages_json TEXT NOT NULL,
        message_count INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
    );
    """)

    conn.commit()
    conn.close()

# Gestisce il ciclo di vita del database (creazione tabelle all'avvio)
@asynccontextmanager
async def database_lifespan(app: FastAPI):
    init_db()
    yield


