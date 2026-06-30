import json
import sqlite3
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.dependencies import require_role
from app.database.connection import get_db
from app.database.schemas import UserChatUploadRequest

router = APIRouter(dependencies=[Depends(require_role("admin", "analyst"))])


@router.post("/insert")
def upload_user_chat(
    payload: UserChatUploadRequest,
    overwrite: bool = Query(False, description="Se True, sovrascrive una chat con lo stesso ID"),
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()

    final_chat_id = payload.chat_id.strip() if payload.chat_id else f"user-chat-{uuid.uuid4().hex[:8]}"
    messages_str = json.dumps(payload.messages, ensure_ascii=False)
    count_messages = len(payload.messages)
    timestamp = datetime.now(timezone.utc).isoformat()

    sql = (
        "INSERT OR REPLACE INTO user_chats (id, system_prompt, messages_json, message_count, created_at) VALUES (?, ?, ?, ?, ?)"
        if overwrite
        else "INSERT INTO user_chats (id, system_prompt, messages_json, message_count, created_at) VALUES (?, ?, ?, ?, ?)"
    )

    try:
        cursor.execute(sql, (final_chat_id, payload.system_prompt, messages_str, count_messages, timestamp))
        db.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=409,
            detail=f"ID '{final_chat_id}' già esistente. Usa ?overwrite=true per sovrascrivere.",
        )

    return {
        "status": "success",
        "message": f"Chat {'aggiornata' if overwrite else 'caricata'} correttamente.",
        "chat_id": final_chat_id,
        "message_count": count_messages,
        "overwritten": overwrite,
    }
