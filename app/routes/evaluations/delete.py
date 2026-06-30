import logging
import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import require_role
from app.database.connection import get_db

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_role("admin"))])


@router.delete("/delete/{evaluation_id}")
def delete_evaluation(evaluation_id: str, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    try:
        cursor.execute("DELETE FROM evaluations WHERE id = ?", (evaluation_id,))
        db.commit()

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail=f"Valutazione con ID {evaluation_id} non trovata nel database."
            )

        return {
            "status": "success",
            "message": f"Valutazione {evaluation_id} eliminata correttamente."
        }

    except HTTPException:
        raise
    except Exception:
        logger.exception("Errore eliminazione evaluation_id=%s", evaluation_id)
        raise HTTPException(status_code=500, detail="Errore interno durante l'eliminazione.")
    
