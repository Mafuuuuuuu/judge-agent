import json
import logging
import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import require_role
from app.config.settings import MODEL_NAME, client_openai
from app.core.auditor_core import ricalcola_overall_score, salva_valutazione_db, valuta_chat_con_LLM
from app.database.connection import get_db

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_role("admin", "analyst"))])


@router.post("/evaluate/{chat_id}")
def evaluate_user_chat(chat_id: str, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT system_prompt, messages_json FROM user_chats WHERE id = ?", (chat_id,))
    record = cursor.fetchone()
    if not record:
        raise HTTPException(status_code=404, detail=f"Chat utente con ID '{chat_id}' non trovata.")

    system_prompt_agente = record["system_prompt"] or ""
    try:
        elenco_messaggi = json.loads(record["messages_json"])
    except Exception:
        logger.exception("Parsing messaggi fallito per chat_id=%s", chat_id)
        raise HTTPException(status_code=500, detail="Errore interno nel parsing dei messaggi.")

    testo_chat_markdown = ""
    for msg in elenco_messaggi:
        ruolo = str(msg.get("role", "utente")).upper()
        contenuto_raw = msg.get("content", "")
        if isinstance(contenuto_raw, dict):
            contenuto_str = contenuto_raw.get("text", "") or contenuto_raw.get("value", "") or str(contenuto_raw)
        else:
            contenuto_str = str(contenuto_raw)
        testo_chat_markdown += f"**{ruolo}**: {contenuto_str}\n\n"

    try:
        giudizio_raw = valuta_chat_con_LLM(
            client_ai=client_openai,
            model_name=MODEL_NAME,
            chat_content=testo_chat_markdown,
            system_prompt_agente=system_prompt_agente,
        )
        res_json = json.loads(giudizio_raw)
    except Exception:
        logger.exception("AI Judge fallito per chat_id=%s", chat_id)
        raise HTTPException(status_code=502, detail="Errore durante la valutazione dell'AI Judge.")

    res_json = ricalcola_overall_score(res_json)

    cursor.execute("DELETE FROM evaluations WHERE log_id = ?", (chat_id,))
    evaluation_uuid = salva_valutazione_db(db, chat_id, json.dumps(res_json, ensure_ascii=False))
    if not evaluation_uuid:
        raise HTTPException(status_code=500, detail="Errore nel salvataggio della valutazione.")

    return {"status": "success", "evaluation_id": evaluation_uuid, "scores": res_json}
