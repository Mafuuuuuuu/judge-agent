# app/routes/evaluate/userchat.py
import json
import sqlite3
from fastapi import APIRouter, Depends, HTTPException
from app.database.connection import get_db
from app.core.auditor_core import valuta_chat_con_LLM, salva_valutazione_db
from app.config.settings import client_openai, MODEL_NAME

router = APIRouter(tags=["Evaluate"])

@router.post("/userchat/{chat_id}")
async def evaluate_user_chat(chat_id: str, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    
    # 1. Recupero la chat inserita dall'utente
    cursor.execute("SELECT system_prompt, messages_json FROM user_chats WHERE id = ?", (chat_id,))
    record = cursor.fetchone()
    
    if not record:
        raise HTTPException(status_code=404, detail=f"Chat utente con ID '{chat_id}' non trovata.")
    
    system_prompt_agente = record["system_prompt"] or ""
    messages_json_str = record["messages_json"]
    
    # 2. Parsing dei messaggi e conversione in Markdown per l'LLM Judge
    try:
        elenco_messaggi = json.loads(messages_json_str)
    except Exception:
        raise HTTPException(status_code=500, detail="Errore nel parsing dei messaggi memorizzati.")
    
    testo_chat_markdown = ""
    for msg in elenco_messaggi:
        ruolo = str(msg.get("role", "utente")).upper()
        contenuto_raw = msg.get("content", "")
        if isinstance(contenuto_raw, dict):
            contenuto_str = contenuto_raw.get("text", "") or contenuto_raw.get("value", "") or str(contenuto_raw)
        else:
            contenuto_str = str(contenuto_raw)
            
        testo_chat_markdown += f"**{ruolo}**: {contenuto_str}\n\n"
        
    # 3. Chiamiamo l'AI Judge in Cloud
    try:
        giudizio_raw = valuta_chat_con_LLM(
            client_ai=client_openai, 
            model_name=MODEL_NAME, 
            chat_content=testo_chat_markdown, 
            system_prompt_agente=system_prompt_agente
        )
        if "{" in giudizio_raw and "}" in giudizio_raw:
            giudizio_raw = giudizio_raw[giudizio_raw.find("{"):giudizio_raw.rfind("}") + 1]
        res_json = json.loads(giudizio_raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore durante l'interrogazione dell'AI Judge: {str(e)}")

    # 4. Patch anti-allucinazione matematica
    try:
        kpi_fondamentali = ["technical_score", "completeness_score", "business_score", "consistency_score", "prompt_compliance_score", "helpfulness_score", "tone_score", "hallucination_score", "efficiency_score", "source_reliability_score"]
        voti_validi = [float(res_json.get(k)) for k in kpi_fondamentali if res_json.get(k) is not None and res_json.get(k) != ""]
        res_json["overall_score"] = round(sum(voti_validi) / len(voti_validi), 1) if voti_validi else 0.0
        giudizio_raw = json.dumps(res_json, ensure_ascii=False)
    except Exception as e:
        print(f"[WARNING] Fallita la normalizzazione: {e}")

    # Pulizia vecchie valutazioni
    cursor.execute("DELETE FROM evaluations WHERE log_id = ?", (chat_id,))

    # 5. Salvataggio tramite la funzione core
    evaluation_uuid = salva_valutazione_db(db, chat_id, giudizio_raw)
    if not evaluation_uuid:
        raise HTTPException(status_code=500, detail="Errore nel salvataggio della valutazione.")
        
    return {"status": "success", "evaluation_id": evaluation_uuid, "scores": res_json}