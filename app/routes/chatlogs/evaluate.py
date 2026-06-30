import json
import logging
import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import require_role
from app.config.settings import MODEL_NAME, client_openai
from app.core.auditor_core import ricalcola_overall_score, salva_valutazione_db, valuta_chat_con_LLM
from app.database.connection import get_db
from app.database.schemas import AuditRequest

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_role("admin", "analyst"))])


@router.post("/evaluate")
def evaluate_chat(payload: AuditRequest, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT id, messages_json FROM chat_logs
        WHERE chat_id = ?
        ORDER BY created_at DESC LIMIT 1
    """, (payload.chat_id,))
    record = cursor.fetchone()
    if not record:
        raise HTTPException(
            status_code=404,
            detail=f"Nessun record trovato per la chat {payload.chat_id}. Esegui prima la sincronizzazione.",
        )

    log_id_db, messages_json_str = record["id"], record["messages_json"]
    try:
        elenco_messaggi = json.loads(messages_json_str)
    except Exception:
        logger.exception("Parsing messaggi fallito per log_id=%s", log_id_db)
        raise HTTPException(status_code=500, detail="Errore interno nel parsing dei messaggi.")

    testo_ticket_markdown = ""
    for msg in elenco_messaggi:
        ruolo = str(msg.get("role", "utente")).upper()
        contenuto_raw = msg.get("content", "")
        if isinstance(contenuto_raw, dict):
            contenuto_str = contenuto_raw.get("text") or contenuto_raw.get("value") or str(contenuto_raw)
        elif isinstance(contenuto_raw, list):
            contenuto_str = " ".join(b.get("text", "") if isinstance(b, dict) else str(b) for b in contenuto_raw)
        else:
            contenuto_str = str(contenuto_raw)
        testo_ticket_markdown += f"--- {ruolo} ---\n{contenuto_str.strip()}\n\n"

    # AuditRequest.sanitize_prompt già filtra i control char via Pydantic validator
    prompt_operativo = payload.system_prompt_agente or ""

    try:
        risposta_ai = valuta_chat_con_LLM(client_openai, MODEL_NAME, testo_ticket_markdown, prompt_operativo)
        valutazione_dati = json.loads(risposta_ai)
    except Exception:
        logger.exception("AI Judge fallito per chat_id=%s", payload.chat_id)
        raise HTTPException(status_code=502, detail="Errore durante la valutazione dell'AI Judge.")

    valutazione_dati = ricalcola_overall_score(valutazione_dati)

    eval_id = salva_valutazione_db(db, log_id_db, json.dumps(valutazione_dati, ensure_ascii=False))
    if not eval_id:
        raise HTTPException(status_code=500, detail="Errore durante la registrazione della valutazione.")

    return {
        "status": "success",
        "evaluation_id": eval_id,
        "log_id": log_id_db,
        "scores": valutazione_dati,
    }
