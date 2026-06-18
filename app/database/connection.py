
import sqlite3
from app.config.settings import DB_PATH

def get_db():
    """
    Inizializza una connessione a SQLite con supporto multi-thread 
    e mappatura a dizionario (sqlite3.Row).
    """
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()