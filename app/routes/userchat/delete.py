import sqlite3
from fastapi import APIRouter, Depends, HTTPException
from app.database.connection import get_db
from app.auth.dependencies import require_role

router = APIRouter(dependencies=[Depends(require_role("admin"))])

@router.delete("/delete/{chat_id}")
def delete_user_chat(chat_id: str, db: sqlite3.Connection = Depends(get_db)):
    row = db.execute("SELECT id FROM user_chats WHERE id = ?", [chat_id]).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=f"Chat '{chat_id}' non trovata")

    # Cascade manuale: evaluations.log_id qui contiene lo user_chats.id
    db.execute("DELETE FROM evaluations WHERE log_id = ?", [chat_id])
    db.execute("DELETE FROM user_chats WHERE id = ?", [chat_id])
    db.commit()

    return {"status": "deleted", "chat_id": chat_id}