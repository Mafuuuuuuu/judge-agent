# app/database/connection.py
import os
import sqlite3
from app.config.settings import DB_PATH

def get_db():
    db_dir = os.path.dirname(DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    # Manteniamo il timeout alto per le code, ma togliamo il WAL ricorsivo
    conn = sqlite3.connect(DB_PATH, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    
    try:
        yield conn
    finally:
        conn.close()