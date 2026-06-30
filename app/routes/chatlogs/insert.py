import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import require_role
from app.config.settings import API_KEY_REMOTA
from app.core.chat_sync_core import fetch_chat_messages, salva_chat_su_db
from app.database.connection import get_db
from app.database.schemas import SyncRequest

router = APIRouter(dependencies=[Depends(require_role("admin", "analyst"))])


@router.post("/insert")
def sync_chat(payload: SyncRequest, db: sqlite3.Connection = Depends(get_db)):
    if not API_KEY_REMOTA:
        raise HTTPException(status_code=500, detail="Token di PlatformHero non configurato nel file .env.")

    try:
        payload_api = fetch_chat_messages(
            assistant_id=payload.assistant_id,
            chat_id=payload.chat_id,
            api_key=API_KEY_REMOTA,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    log_id, is_updated = salva_chat_su_db(db, payload.assistant_id, payload.chat_id, payload_api)

    return {
        "status": "success",
        "log_id": log_id,
        "is_updated": is_updated,
        "message": "Sincronizzazione completata." if is_updated else "Nessun nuovo messaggio rilevato.",
    }
