import sqlite3
from fastapi import APIRouter, Depends, HTTPException
from app.database.connection import get_db

router = APIRouter(tags=["Delete"])


@router.delete("/chatlogs/{log_id}")
def delete_chat_log(log_id: str, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    try:
        cursor.execute("DELETE FROM chat_logs WHERE id = ?", (log_id,))
        db.commit()

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail=f"Log della chat con ID {log_id} non trovato nel database."
            )

        return {
            "status": "success",
            "message": f"Log della chat {log_id} eliminato correttamente (evaluations collegate rimosse automaticamente via FK)."
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Errore interno durante l'eliminazione del log: {str(e)}"
        )
    
