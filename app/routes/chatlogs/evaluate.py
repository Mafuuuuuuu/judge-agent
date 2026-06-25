# app/routes/evaluate/chatlogs.py
import json
import sqlite3
import unicodedata
from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import require_role
from app.database.connection import get_db
from app.database.schemas import AuditRequest
from app.core.auditor_core import valuta_chat_con_LLM, salva_valutazione_db
from app.config.settings import client_openai, MODEL_NAME

router = APIRouter(dependencies=[Depends(require_role("admin", "analyst"))])

@router.post("/evaluate")
async def evaluate_chat(payload: AuditRequest, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    
    #  Recupero dell'ultimo log utile salvato nella tabella chat_logs
    cursor.execute("""
        SELECT id, messages_json FROM chat_logs 
        WHERE chat_id = ? 
        ORDER BY created_at DESC LIMIT 1;
    """, (payload.chat_id,))
    
    record = cursor.fetchone()
    if not record:
        raise HTTPException(
            status_code=404, 
            detail=f"Nessun record trovato in chat_logs per la chat {payload.chat_id}. Esegui prima la sincronizzazione!"
        )
        
    log_id_db, messages_json_str = record["id"], record["messages_json"]
    
    try:
        elenco_messaggi = json.loads(messages_json_str)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore parsing interno dei messaggi: {e}")
        
    # Estrazione sicura del testo per l'AI Judge
    testo_ticket_markdown = ""
    for msg in elenco_messaggi:
        ruolo = str(msg.get("role", "utente")).upper()
        contenuto_raw = msg.get("content", "")
        
        if isinstance(contenuto_raw, dict):
            contenuto_str = contenuto_raw.get("text") or contenuto_raw.get("value") or str(contenuto_raw)
        elif isinstance(contenuto_raw, list):
            contenuto_str = " ".join([b.get("text", "") if isinstance(b, dict) else str(b) for b in contenuto_raw])
        else:
            contenuto_str = str(contenuto_raw)
            
        testo_ticket_markdown += f"--- {ruolo} ---\n{contenuto_str.strip()}\n\n"

    # Chiamata al core dell'AI Judge Cloud con protezione caratteri di controllo
    try:
        prompt_operativo = "".join(
            c for c in (payload.system_prompt_agente or "")
            if not unicodedata.category(c).startswith("C") or c in ("\n", "\t")
        ).strip()

        risposta_ai = valuta_chat_con_LLM(client_openai, MODEL_NAME, testo_ticket_markdown, prompt_operativo)
        risposta_pulita = risposta_ai.strip()
        if "{" in risposta_pulita and "}" in risposta_pulita:
            risposta_pulita = risposta_pulita[risposta_pulita.find("{"):risposta_pulita.rfind("}") + 1]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Errore durante l'invocazione dell'AI Judge Cloud: {e}")

    #  Patch anti-allucinazione matematica sui 10 KPI
    try:
        valutazione_dati = json.loads(risposta_pulita)
        kpi_fondamentali = [
            "technical_score", "completeness_score", "business_score", "consistency_score", 
            "prompt_compliance_score", "helpfulness_score", "tone_score", 
            "hallucination_score", "efficiency_score", "source_reliability_score"
        ]
        
        voti_validi = []
        for kpi in kpi_fondamentali:
            valore = valutazione_dati.get(kpi)
            if valore is not None and valore != "":
                try:
                    voti_validi.append(float(valore))
                except (ValueError, TypeError):
                    pass 
        
        valutazione_dati["overall_score"] = round(sum(voti_validi) / len(voti_validi), 1) if voti_validi else 0.0
        risposta_pulita = json.dumps(valutazione_dati, ensure_ascii=False)
    except Exception as e:
        print(f"[WARNING] Fallita la normalizzazione preventiva del JSON: {e}")

    #  Scrittura fisica nel database tramite funzione core condivisa
    eval_id_interno = salva_valutazione_db(db, log_id_db, risposta_pulita)
    if not eval_id_interno:
        raise HTTPException(status_code=500, detail="Errore durante la registrazione della valutazione a DB.")

    return {
        "status": "success",
        "evaluation_id": eval_id_interno,
        "log_id": log_id_db,
        "scores": valutazione_dati
    }