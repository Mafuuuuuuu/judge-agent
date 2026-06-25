import json
import uuid
import sqlite3
from datetime import datetime, timezone 
from fastapi import APIRouter, Depends, HTTPException
from app.database.connection import get_db
from app.database.schemas import UserChatUploadRequest
from app.auth.dependencies import require_role

router = APIRouter(dependencies=[Depends(require_role("admin", "analyst"))])


@router.post("/insert")
async def upload_user_chat(payload: UserChatUploadRequest, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    
    final_chat_id = payload.chat_id.strip() if payload.chat_id else f"user-chat-{uuid.uuid4().hex[:8]}"
    messages_str = json.dumps(payload.messages)
    count_messages = len(payload.messages)
    
    # Generiamo lo stesso timestamp ISO usato nel resto dell'applicazione
    timestamp_attuale = datetime.now(timezone.utc).isoformat()

    try:
        # Aggiunto il campo 'created_at' sia nella colonna che nei VALUES
        cursor.execute("""
            INSERT INTO user_chats (id, system_prompt, messages_json, message_count, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (final_chat_id, payload.system_prompt, messages_str, count_messages, timestamp_attuale))
        db.commit()

        return {
            "status": "success",
            "message": "Chat caricata correttamente nel sistema.",
            "chat_id": final_chat_id,
            "message_count": count_messages
        }
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=400,
            detail=f"L'ID chat '{final_chat_id}' esiste già. Usa un ID diverso o modificalo."
        )
    

