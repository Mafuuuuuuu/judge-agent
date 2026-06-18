import requests
import uuid
import json
from datetime import datetime, timezone

BASE_URL = "https://api.platformhero.ai/v1"


def fetch_chat_messages(assistant_id: str, chat_id: str, api_key: str) -> dict:
    """
    Recupera tutti i messaggi di una chat specifica da PlatformHero.
    Ritorna il payload completo con data, fetched_count, has_more.
    """
    url = f"{BASE_URL}/assistants/{assistant_id}/chats/{chat_id}/messages"
    headers = {"Authorization": f"Bearer {api_key}"}

    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        raise RuntimeError(f"Errore API ({response.status_code}): {response.text}")

    payload = response.json()

    if payload.get("status") != "success":
        raise ValueError(f"Risposta API non valida: {payload}")

    return payload

def salva_chat_su_db(conn, assistant_id: str, chat_id: str, payload: dict) -> tuple:
    """
    Estrae l'elenco dei messaggi dal payload API.
    Ritorna una tupla: (str: internal_id, bool: è_aggiornato)
    """
    messages_list = payload.get("data", [])
    message_count = len(messages_list)
    
    cursor = conn.cursor()
    
    # 1. Recupero dell'ultimo stato salvato
    cursor.execute("""
        SELECT id, message_count FROM chat_logs 
        WHERE chat_id = ? 
        ORDER BY created_at DESC LIMIT 1;
    """, (chat_id,))
    ultimo_record = cursor.fetchone()
    
    # 2. Controllo duplicati: se uguale, ritorna False
    if ultimo_record:
        ultimo_id, ultimo_count = ultimo_record
        if message_count == ultimo_count:
            print(f"-> Chat {chat_id} non modificata ({message_count} messaggi). Salto sincronizzazione.")
            return ultimo_id, False  # <--- Cambiato qui
            
        print(f"-> Rilevato aggiornamento per la chat {chat_id}: da {ultimo_count} a {message_count} messaggi.")
            
    # 3. Inserimento nuovo record o aggiornato
    messages_json = json.dumps(messages_list, ensure_ascii=False)
    internal_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    
    query = """
    INSERT INTO chat_logs (
        id, assistant_id, chat_id, message_count, messages_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?);
    """
    
    cursor.execute(query, (
        internal_id, assistant_id, chat_id, message_count, messages_json, created_at
    ))
    conn.commit()
    
    print(f"-> Chat {chat_id} sincronizzata con successo.")
    return internal_id, True  # <--- Cambiato qui