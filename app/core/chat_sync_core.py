import json
import logging
import uuid
from datetime import datetime, timezone

import requests

from app.config.settings import PLATFORMHERO_API_URL

logger = logging.getLogger(__name__)


def fetch_chat_messages(assistant_id: str, chat_id: str, api_key: str) -> dict:
    url = f"{PLATFORMHERO_API_URL}/assistants/{assistant_id}/chats/{chat_id}/messages"
    headers = {"Authorization": f"Bearer {api_key}"}

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise RuntimeError(f"Errore API PlatformHero (HTTP {response.status_code})")

    payload = response.json()
    if payload.get("status") != "success":
        raise ValueError("Risposta API PlatformHero non valida")

    return payload


def salva_chat_su_db(conn, assistant_id: str, chat_id: str, payload: dict) -> tuple:
    """
    Salva i messaggi della chat nel DB solo se il conteggio è aumentato.
    Ritorna (internal_id, is_updated).
    """
    messages_list = payload.get("data", [])
    message_count = len(messages_list)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, message_count FROM chat_logs
        WHERE chat_id = ?
        ORDER BY created_at DESC LIMIT 1
    """, (chat_id,))
    ultimo = cursor.fetchone()

    if ultimo:
        ultimo_id, ultimo_count = ultimo
        if message_count == ultimo_count:
            logger.info("Chat %s invariata (%d messaggi), skip.", chat_id, message_count)
            return ultimo_id, False
        logger.info("Chat %s aggiornata: %d → %d messaggi.", chat_id, ultimo_count, message_count)

    internal_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
        INSERT INTO chat_logs (id, assistant_id, chat_id, message_count, messages_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        internal_id, assistant_id, chat_id, message_count,
        json.dumps(messages_list, ensure_ascii=False), created_at,
    ))
    conn.commit()
    logger.info("Chat %s sincronizzata (%d messaggi).", chat_id, message_count)
    return internal_id, True
