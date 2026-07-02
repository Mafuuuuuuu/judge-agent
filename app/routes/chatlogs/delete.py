import logging
import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import require_role
from app.database.connection import get_db

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_role("admin"))])


@router.delete("/delete/{log_id}")
def delete_chat_log(log_id: str, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    try:
        # Cascade manuale come per user_chats: evaluations.log_id e' polimorfico
        # e la tabella non ha (piu') un FOREIGN KEY verso chat_logs
        cursor.execute("DELETE FROM chat_logs WHERE id = ?", (log_id,))
        if cursor.rowcount == 0:
            db.rollback()
            raise HTTPException(
                status_code=404,
                detail=f"Log della chat con ID {log_id} non trovato nel database."
            )
        cursor.execute("DELETE FROM evaluations WHERE log_id = ?", (log_id,))
        db.commit()

        return {
            "status": "success",
            "message": f"Log della chat {log_id} eliminato correttamente insieme alle evaluations collegate."
        }

    except HTTPException:
        raise
    except Exception:
        logger.exception("Errore eliminazione log_id=%s", log_id)
        raise HTTPException(status_code=500, detail="Errore interno durante l'eliminazione.")
    
