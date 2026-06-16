import os
import json
import sqlite3
import requests
from fastapi import FastAPI, HTTPException,Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any,Dict, List, Optional
from dotenv import load_dotenv
from openai import OpenAI
import uuid
from datetime import datetime, timezone

# Importiamo le funzioni stabili e corrette dal tuo file core
from src.auditor_core import salva_chat_su_db, valuta_chat_con_LLM, salva_valutazione_db

load_dotenv()

app = FastAPI(
    title="PlatformHero Agent Auditor API",
    version="1.0.0",
    description="Backend definitivo per l'auditing dei nodi di conversazione con LLM-as-a-Judge"
)

# Configurazione CORS abilitata per far parlare Angular (porta 4200) con FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurazione variabili d'ambiente e Client Cloud
DB_PATH = "data/platformhero_mirror.db"
API_KEY_REMOTA = os.getenv("TOKEN")

client_openai = OpenAI(
    base_url="https://api.platformhero.ai/v1",
    api_key=API_KEY_REMOTA
)

MODEL_NAME = "TpwgLXbi"  


# Gestore delle connessioni al database SQLite
def get_db():
    # Aggiungi 'check_same_thread=False' dentro le parentesi di connect
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


# --- SCHEMI PYDANTIC PER LA VALIDAZIONE DEI DATI IN INGRESSO ---
class SyncRequest(BaseModel):
    assistant_id: str
    chat_id: str

class AuditRequest(BaseModel):
    chat_id: str
    system_prompt_agente: Optional[str] = ""  # Opzionale: se vuoto, esclude la prompt compliance dal calcolo


# Schema per l'inserimento della chat personalizzata
class UserChatUploadRequest(BaseModel):
    chat_id: Optional[str] = None  # Se vuoto, lo generiamo noi nel backend
    system_prompt: Optional[str] = None
    messages: List[Dict[str, Any]]  # Accetta la lista di messaggi in formato JSON pura


# --- PEZZO 1: Endpoint di Sincronizzazione della Chat ---
@app.post("/api/v1/chats/sync")
async def sync_chat(payload: SyncRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    Scarica i messaggi correnti da PlatformHero e aggiorna il database locale
    solo se ci sono novità (Controllo Idempotenza).
    """
    if not API_KEY_REMOTA:
        raise HTTPException(status_code=500, detail="Token di PlatformHero non configurato nel file .env.")

    # URL CORRETTO (Prende sia l'assistant_id che il chat_id dal payload)
    url_platform_hero = f"https://api.platformhero.ai/v1/assistants/{payload.assistant_id}/chats/{payload.chat_id}/messages"

    headers = {"Authorization": f"Bearer {API_KEY_REMOTA}", "Content-Type": "application/json"}

    try:
        response = requests.get(url_platform_hero, headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"Errore PlatformHero: {response.text}")
        payload_api = response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Errore di rete con PlatformHero: {e}")

    log_id_interno, è_aggiornato = salva_chat_su_db(db, payload.assistant_id, payload.chat_id, payload_api)

    return {
        "status": "success",
        "log_id": log_id_interno,
        "is_updated": è_aggiornato,
        "message": "Sincronizzazione completata." if è_aggiornato else "Nessun nuovo messaggio rilevato."
    }


# --- PEZZO 2: Endpoint di Valutazione Conversazione (AI Judge) ---
@app.post("/api/v1/audit/evaluate")
async def evaluate_chat(payload: AuditRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    Estrae l'ultimo log dal DB, lo formatta in Markdown, interroga l'AI Judge in cloud,
    normalizza matematicamente i 10 KPI e storicizza la valutazione su SQLite.
    """
    cursor = db.cursor()
    
    # 1. Recupero dell'ultimo log utile salvato nella tabella chat_logs
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
        
    # 2. Estrazione sicura del testo per evitare crash sui dizionari nativi di PlatformHero
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

    # 3. Chiamata alla funzione core dell'AI Judge Remoto
    try:
        prompt_operativo = payload.system_prompt_agente or ""
        risposta_ai = valuta_chat_con_LLM(client_openai, MODEL_NAME, testo_ticket_markdown, prompt_operativo)
        
        # Isolamento standard del blocco JSON puro
        risposta_pulita = risposta_ai.strip()
        if "{" in risposta_pulita and "}" in risposta_pulita:
            risposta_pulita = risposta_pulita[risposta_pulita.find("{"):risposta_pulita.rfind("}") + 1]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Errore durante l'invocazione dell'AI Judge Cloud: {e}")

    # 4. PATCH UNIVERSALE ANTI-ALLUCINAZIONE AGGIORNATA (10 KPI)
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
        
        # Calcolo media esatta in Python (blindato contro allucinazioni matematiche dell'LLM)
        if voti_validi:
            media_reale = round(sum(voti_validi) / len(voti_validi), 1)
        else:
            media_reale = 0.0
            
        valutazione_dati["overall_score"] = media_reale
        risposta_pulita = json.dumps(valutazione_dati, ensure_ascii=False)
        
    except Exception as e:
        print(f"[WARNING] Fallita la normalizzazione preventiva del JSON: {e}")

    # 5. Scrittura fisica nel database tramite funzione core
    eval_id_interno = salva_valutazione_db(db, log_id_db, risposta_pulita)
    if not eval_id_interno:
        raise HTTPException(status_code=500, detail="Errore durante la registrazione della valutazione a DB.")

    # Ritorniamo i dati strutturati pronti per essere letti da Angular
    return {
        "status": "success",
        "evaluation_id": eval_id_interno,
        "log_id": log_id_db,
        "scores": valutazione_dati
    }

# --- PEZZO 3: Endpoint per il recupero dello storico delle valutazioni ---
@app.get("/api/v1/audit/evaluations")
async def list_evaluations(db: sqlite3.Connection = Depends(get_db)):
    """
    Recupera l'elenco completo di tutte le valutazioni salvate nel database,
    ordinate dalla più recente alla più datata.
    """
    cursor = db.cursor()
    try:
        # Eseguiamo la query sulla vista o sulla tabella delle valutazioni
        # NOTA: Se la tua tabella ha un nome leggermente diverso (es. 'evaluations'), adeguato qui sotto
        cursor.execute("""
            SELECT 
                id,
                log_id,
                technical_score,
                completeness_score,
                business_score,
                consistency_score,
                prompt_compliance_score,
                helpfulness_score,
                tone_score,
                hallucination_score,
                efficiency_score,
                source_reliability_score,
                overall_score,
                feedback,
                issues,
                created_at
            FROM evaluations
            ORDER BY created_at DESC
        """)
        
        rows = cursor.fetchall()
        
        # Trasformiamo i record di SQLite (sqlite3.Row) in normali dizionari Python
        # in modo che FastAPI possa serializzarli automaticamente in JSON
        evaluations_list = [dict(row) for row in rows]
        
        return evaluations_list

    except sqlite3.OperationalError as e:
        # Se la tabella 'evaluations' non esiste ancora o ha un nome diverso, FastAPI lo segnalerà chiaramente
        raise HTTPException(
            status_code=500, 
            detail=f"Errore di struttura database. Verifica il nome della tabella o della vista. Dettaglio: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Errore interno durante il recupero dei dati: {str(e)}"
        )
    
# --- Endpoint per recuperare lo storico dei LOG GREZZI ---
@app.get("/api/v1/audit/logs")
async def list_chat_logs(db: sqlite3.Connection = Depends(get_db)):
    """
    Recupera l'elenco completo di tutti i log delle chat sincronizzati da PlatformHero,
    incluso il payload JSON dei messaggi.
    """
    cursor = db.cursor()
    try:
        cursor.execute("""
            SELECT 
                id,
                assistant_id,
                chat_id,
                message_count,
                messages_json,
                created_at
            FROM chat_logs
            ORDER BY created_at DESC
        """)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
        
    except sqlite3.OperationalError as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Errore tabella chat_logs. Dettaglio: {str(e)}"
        )
    

# --- Endpoint per recuperare lo storico delle VALUTAZIONI ---
    

# --- PEZZO 4: Endpoint per eliminare una riga da evaluations ---
@app.delete("/api/v1/audit/evaluations/{evaluation_id}")
async def delete_evaluation(evaluation_id: str, db: sqlite3.Connection = Depends(get_db)):
    """
    Elimina una specifica valutazione dal database tramite il suo ID.
    """
    cursor = db.cursor()
    try:
        # Cambiato da chat_evaluations a evaluations
        cursor.execute("DELETE FROM evaluations WHERE id = ?", (evaluation_id,))
        db.commit()
        
        # Verifichiamo se SQLite ha effettivamente trovato ed eliminato la riga
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
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Errore interno durante l'eliminazione della valutazione: {str(e)}"
        )


# --- PEZZO 5: Endpoint per eliminare una riga da chat_logs ---
@app.delete("/api/v1/audit/logs/{log_id}")
async def delete_chat_log(log_id: str, db: sqlite3.Connection = Depends(get_db)):
    """
    Elimina il log grezzo di una chat dal database tramite il suo ID.
    """
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
            "message": f"Log della chat {log_id} eliminato correttamente dallo storico."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Errore interno durante l'eliminazione del log: {str(e)}"
        )
    
# --- NUOVA SEZIONE: GESTIONE CHAT UTENTE PERSONALIZZATE

    
@app.post("/api/v1/user-chats")
async def upload_user_chat(payload: UserChatUploadRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    Riceve una chat in formato JSON dall'utente, un eventuale system prompt,
    e la memorizza nella tabella 'user_chats' per essere valutata in seguito.
    """
    cursor = db.cursor()
    
    # Se il frontend non passa un chat_id, generiamo un UUID univoco
    final_chat_id = payload.chat_id.strip() if payload.chat_id else f"user-chat-{uuid.uuid4().hex[:8]}"
    
    # Serializziamo la lista di messaggi in stringa JSON per SQLite
    messages_str = json.dumps(payload.messages)
    count_messages = len(payload.messages)
    
    try:
        cursor.execute("""
            INSERT INTO user_chats (id, system_prompt, messages_json, message_count)
            VALUES (?, ?, ?, ?)
        """, (final_chat_id, payload.system_prompt, messages_str, count_messages))
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore durante il salvataggio: {str(e)}")
    

 # valutazione della chat caricata dall'utente   
@app.post("/api/v1/user-chats/{chat_id}/evaluate")
async def evaluate_user_chat(chat_id: str, db: sqlite3.Connection = Depends(get_db)):
    """
    Prende una chat precedentemente caricata nella tabella 'user_chats',
    la formatta e la manda all'AI Judge, salvando il risultato nella tabella 'evaluations'.
    Gestisce automaticamente la data di creazione e sovrascrive valutazioni precedenti per evitare duplicati.
    """
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
        res_json = json.loads(giudizio_raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore durante l'interrogazione dell'AI Judge: {str(e)}")

    # --- GESTIONE DUPLICATI: Cancella la vecchia valutazione se esiste già per questa chat ---
    try:
        cursor.execute("DELETE FROM evaluations WHERE log_id = ?", (chat_id,))
    except Exception as e:
        print(f"Nota: nessuna vecchia valutazione da ripulire. Dettaglio: {str(e)}")

    # --- GESTIONE DATA: Generiamo il timestamp ISO completo come le altre righe ---
    timestamp_attuale = datetime.now(timezone.utc).isoformat()

    # 4. Storico del risultato nella tabella 'evaluations'
    evaluation_uuid = f"eval-{uuid.uuid4().hex[:8]}"
    try:
        # Aggiunta la colonna 'created_at' nella INSERT
        cursor.execute("""
            INSERT INTO evaluations (
                id, log_id, technical_score, completeness_score, business_score,
                consistency_score, prompt_compliance_score, helpfulness_score, tone_score,
                hallucination_score, efficiency_score, source_reliability_score, overall_score,
                feedback, issues, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            evaluation_uuid,
            chat_id,  
            res_json.get("technical_score"),
            res_json.get("completeness_score"),
            res_json.get("business_score"),
            res_json.get("consistency_score"),
            res_json.get("prompt_compliance_score"),
            res_json.get("helpfulness_score"),
            res_json.get("tone_score"),
            res_json.get("hallucination_score"),
            res_json.get("efficiency_score"),
            res_json.get("source_reliability_score"),
            res_json.get("overall_score"),
            res_json.get("feedback", ""),
            res_json.get("issues", ""),
            timestamp_attuale # Passiamo la data corretta a SQLite
        ))
        db.commit()
        
        return {"status": "success", "evaluation_id": evaluation_uuid, "scores": res_json}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nel salvataggio della valutazione: {str(e)}")
    

## API di agregazione user-chats
    
# GET /kpi/user-chats/totale
# Totale conversazioni (opzionale: filtro date)
@app.get("/kpi/user-chats/totale")
def totale_conversazioni(
    from_date: Optional[str] = Query(None, description="ISO date, es. 2024-01-01"),
    to_date: Optional[str] = Query(None, description="ISO date, es. 2024-12-31"),
    db: sqlite3.Connection = Depends(get_db),
):
    query = "SELECT COUNT(*) as totale FROM user_chats WHERE 1=1"
    params = []
 
    if from_date:
        query += " AND created_at >= ?"
        params.append(from_date)
    if to_date:
        query += " AND created_at <= ?"
        params.append(to_date)
 
    row = db.execute(query, params).fetchone()
    return {"totale_conversazioni": row["totale"]}


# media messaggi per chat, minimo, massimo e totale messaggi
@app.get("/kpi/user-chats/media-messaggi")
def media_messaggi(db: sqlite3.Connection = Depends(get_db)):
    query = """
        SELECT
            ROUND(AVG(message_count), 2) AS media,
            MIN(message_count)           AS minimo,
            MAX(message_count)           AS massimo,
            SUM(message_count)           AS totale_messaggi
        FROM user_chats
    """
    row = db.execute(query).fetchone()
    return {
        "media_messaggi_per_chat": row["media"],
        "minimo": row["minimo"],
        "massimo": row["massimo"],
        "totale_messaggi": row["totale_messaggi"],
    }


# distribuzione delle chat per system prompt (quante chat hanno quale prompt, media messaggi per ogni prompt, totale messaggi per ogni prompt)

@app.get("/kpi/user-chats/distribuzione-system-prompt")
def distribuzione_system_prompt(db: sqlite3.Connection = Depends(get_db)):
    query = """
        SELECT
            COALESCE(system_prompt, '__nessuno__') AS system_prompt,
            COUNT(*)                               AS totale,
            ROUND(AVG(message_count), 2)           AS media_messaggi
        FROM user_chats
        GROUP BY system_prompt
        ORDER BY totale DESC
    """
    rows = db.execute(query).fetchall()
    return {
        "distribuzione": [dict(r) for r in rows],
        "totale_prompt_distinti": len(rows),
    }

#trend delle conversazioni nel tempo, raggruppate per giorno, settimana o mese, con media messaggi per periodo
# GET /kpi/user-chats/trend?granularity=day|week|month
@app.get("/kpi/user-chats/trend")
def trend_conversazioni(
    granularity: str = Query("day", enum=["day", "week", "month"]),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: sqlite3.Connection = Depends(get_db),
):
    format_map = {
        "day":   "%Y-%m-%d",
        "week":  "%Y-W%W",
        "month": "%Y-%m",
    }
    fmt = format_map[granularity]
 
    query = f"""
        SELECT
            strftime('{fmt}', created_at) AS periodo,
            COUNT(*)                       AS totale_chat,
            ROUND(AVG(message_count), 2)   AS media_messaggi
        FROM user_chats
        WHERE 1=1
    """
    params = []
 
    if from_date:
        query += " AND created_at >= ?"
        params.append(from_date)
    if to_date:
        query += " AND created_at <= ?"
        params.append(to_date)
 
    query += " GROUP BY periodo ORDER BY periodo ASC"
    rows = db.execute(query, params).fetchall()
    return {
        "granularity": granularity,
        "trend": [dict(r) for r in rows],
    }


# top N chat con più messaggi, con possibilità di limitare il numero di risultati
# GET /kpi/user-chats/top-chat?limit=10
@app.get("/kpi/user-chats/top-chat")
def top_chat(
    limit: int = Query(10, ge=1, le=100),
    db: sqlite3.Connection = Depends(get_db),
):
    query = """
        SELECT id, system_prompt, message_count, created_at
        FROM user_chats
        ORDER BY message_count DESC
        LIMIT ?
    """
    rows = db.execute(query, [limit]).fetchall()
    return {
        "top_n": limit,
        "risultati": [dict(r) for r in rows],
    }

## API di aggregazione chat_logs

# contatore totale dei log delle chat, con possibilità di filtrare per intervallo di date
# GET /kpi/chat-logs/totale
@app.get("/kpi/chat-logs/totale")
def totale_chat_logs(
    from_date: Optional[str] = Query(None, description="ISO date, es. 2024-01-01"),
    to_date: Optional[str] = Query(None, description="ISO date, es. 2024-12-31"),
    db: sqlite3.Connection = Depends(get_db),
):
    query = "SELECT COUNT(*) as totale FROM chat_logs WHERE 1=1"
    params = []

    if from_date:
        query += " AND created_at >= ?"
        params.append(from_date)
    if to_date:
        query += " AND created_at <= ?"
        params.append(to_date)

    row = db.execute(query, params).fetchone()
    return {"totale_chat_logs": row["totale"]}


# media messaggi per chat, minimo, massimo e totale messaggi
# GET /kpi/chat-logs/media-messaggi
@app.get("/kpi/chat-logs/media-messaggi")
def media_messaggi_chat_logs(db: sqlite3.Connection = Depends(get_db)):
    query = """
        SELECT
            ROUND(AVG(message_count), 2) AS media,
            MIN(message_count)           AS minimo,
            MAX(message_count)           AS massimo,
            SUM(message_count)           AS totale_messaggi
        FROM chat_logs
    """
    row = db.execute(query).fetchone()
    return {
        "media_messaggi_per_chat": row["media"],
        "minimo": row["minimo"],
        "massimo": row["massimo"],
        "totale_messaggi": row["totale_messaggi"],
    }

# distribuzione delle chat per assistant_id (quante chat hanno quale assistant_id, media messaggi per ogni assistant_id, totale messaggi per ogni assistant_id)
# GET /kpi/chat-logs/distribuzione-assistant
@app.get("/kpi/chat-logs/distribuzione-assistant")
def distribuzione_assistant(db: sqlite3.Connection = Depends(get_db)):
    query = """
        SELECT
            COALESCE(assistant_id, '__nessuno__') AS assistant_id,
            COUNT(*)                              AS totale_chat,
            ROUND(AVG(message_count), 2)          AS media_messaggi,
            SUM(message_count)                    AS totale_messaggi
        FROM chat_logs
        GROUP BY assistant_id
        ORDER BY totale_chat DESC
    """
    rows = db.execute(query).fetchall()
    return {
        "distribuzione": [dict(r) for r in rows],
        "totale_assistant_distinti": len(rows),
    }

# trend delle conversazioni nel tempo, raggruppate per giorno, settimana o mese, con media messaggi per periodo
# GET /kpi/chat-logs/trend?granularity=day|week|month
@app.get("/kpi/chat-logs/trend")
def trend_chat_logs(
    granularity: str = Query("day", enum=["day", "week", "month"]),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: sqlite3.Connection = Depends(get_db),
):
    format_map = {
        "day":   "%Y-%m-%d",
        "week":  "%Y-W%W",
        "month": "%Y-%m",
    }
    fmt = format_map[granularity]

    query = f"""
        SELECT
            strftime('{fmt}', created_at) AS periodo,
            COUNT(*)                       AS totale_chat,
            ROUND(AVG(message_count), 2)   AS media_messaggi
        FROM chat_logs
        WHERE 1=1
    """
    params = []

    if from_date:
        query += " AND created_at >= ?"
        params.append(from_date)
    if to_date:
        query += " AND created_at <= ?"
        params.append(to_date)

    query += " GROUP BY periodo ORDER BY periodo ASC"
    rows = db.execute(query, params).fetchall()
    return {
        "granularity": granularity,
        "trend": [dict(r) for r in rows],
    }


# chat con più messaggi
# GET /kpi/chat-logs/top-chat?limit=10
@app.get("/kpi/chat-logs/top-chat")
def top_chat_logs(
    limit: int = Query(10, ge=1, le=100),
    db: sqlite3.Connection = Depends(get_db),
):
    query = """
        SELECT
            id,
            assistant_id,
            chat_id,
            message_count,
            created_at
        FROM chat_logs
        ORDER BY message_count DESC
        LIMIT ?
    """
    rows = db.execute(query, [limit]).fetchall()
    return {
        "top_n": limit,
        "risultati": [dict(r) for r in rows],
    }