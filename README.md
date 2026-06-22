# PlatformHero AI Quality Intelligence Layer

**Versione:** 1.2
**Stack:** Python 3.14 · FastAPI · SQLite · Jupyter

Sistema di **AI Quality & Observability** che si integra sopra PlatformHero senza sostituirlo. Recupera i log delle conversazioni del Customer Agent, le valuta tramite un LLM-as-Judge multi-dimensionale, e fornisce analytics aggregate per il monitoraggio della qualità operativa.

> Questo sistema **non** è un Customer Agent né un generatore di risposte. È un layer di controllo qualità e intelligence operativa che osserva, valuta e misura.

---

## Indice

- [Architettura](#architettura)
- [Setup](#setup)
- [Configurazione](#configurazione)
- [Avvio](#avvio)
- [Struttura del progetto](#struttura-del-progetto)
- [API Reference](#api-reference)
- [Database](#database)
- [Note di sviluppo](#note-di-sviluppo)

---

## Architettura

```
Customer Agent (esistente)
        │
        ▼
PlatformHero API (log esterni)
        │
        ▼
   Sync / Insert Layer  ──────►  SQLite Mirror DB
        │                              │
        ▼                              │
  Judge Agent (LLM Eval)  ◄────────────┘
        │
        ▼
   Evaluations DB
        │
        ▼
  Analytics Layer  ──────►  (Futuro: Dashboard Angular)
```

Tre responsabilità principali:

1. **Insert** — recupero e inserimento dei log da PlatformHero
2. **Evaluate** — valutazione automatica della qualità tramite LLM Judge (10 dimensioni di scoring)
3. **Analytics** — aggregazioni, KPI, trend per l'osservabilità

---

## Setup

### Requisiti

- Python 3.13+
- pip

### Installazione

```powershell
git clone <repo-url>
cd "Judge agent"

python -m venv .venv
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

---

## Configurazione

Copia il file di esempio e popola i valori reali:

```powershell
cp .env.example .env
```

Variabili richieste:

| Variabile | Descrizione | Esempio |
|---|---|---|
| `TOKEN` | API Key PlatformHero (Judge LLM) | `tk...` |
| `BASE_URL` | Endpoint OpenAI-compatible per il Judge | `https://api.platformhero.ai/v1` |
| `MODEL_NAME` | Modello usato per la valutazione | `TpwgLXbi` |
| `DB_PATH` | Percorso del DB SQLite mirror | `data/platformhero_mirror.db` |
| `CORS_ORIGINS` | Origine consentita (frontend Angular) | `http://localhost:4200` |
| `PORT` | Porta del server FastAPI | `8000` |

⚠️ Il `.env` non va mai committato — è già escluso in `.gitignore`.

---

## Avvio

```powershell
python -m uvicorn app.main:app --reload
```

Swagger UI disponibile su:

```
http://127.0.0.1:8000/docs
```

---

## Struttura del progetto

```
app/
├── main.py                  # App factory, CORS, registrazione router
│
├── config/
│   └── settings.py          # Tutte le configurazioni da .env
│
├── database/
│   ├── connection.py        # get_db() — dependency injection, PRAGMA foreign_keys=ON
│   └── schemas.py           # Modelli Pydantic per validazione request
│
├── core/
│   ├── auditor_core.py      # Logica del Judge LLM (prompt, scoring, salvataggio)
│   └── chat_sync_core.py    # Fetch dei log da PlatformHero
│
├── routes/
│   ├── insert/               # POST — inserimento dati (userchat, logs, chatlogs)
│   ├── evaluate/              # POST — valutazione AI Judge (userchat, chatlogs)
│   ├── analytics/             # GET — aggregazioni e KPI (userchat, chatlogs, evaluations)
│   └── delete/                 # DELETE — eliminazione con cascade
│
└── utils/                    # Funzioni di supporto condivise

notebooks/
├── log_normalization.ipynb   # Parsing markdown, batch writes
└── judge_agent.ipynb         # Sperimentazione Judge (Ollama locale)

data/
└── platformhero_mirror.db    # Database SQLite (fuori da OneDrive)
```

---

## API Reference

Naming convention: **nessun trattino**, categorizzazione per azione.

### Insert

| Metodo | Endpoint | Descrizione |
|---|---|---|
| POST | `/insert/userchat` | Inserisce una chat utente |
| POST | `/insert/logs` | Inserisce e normalizza log raw |
| POST | `/insert/chatlogs` | Inserisce/sincronizza log da PlatformHero |

### Evaluate

| Metodo | Endpoint | Descrizione |
|---|---|---|
| POST | `/evaluate/userchat/{chat_id}` | Valuta una user chat tramite AI Judge |
| POST | `/evaluate/chatlogs` | Valuta l'ultimo log sincronizzato di una chat (body: `chat_id`) |

### Analytics

| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/analytics/userchat/totals` | Totale conversazioni |
| GET | `/analytics/userchat/mediamessaggi` | Media/min/max messaggi |
| GET | `/analytics/userchat/distribuzionesystemprompt` | Distribuzione per system prompt |
| GET | `/analytics/userchat/trend` | Trend temporale |
| GET | `/analytics/userchat/topchat` | Top N chat per messaggi |
| GET | `/analytics/userchat/list` | Listato paginato |
| GET | `/analytics/userchat/summary` | **Tutto sopra in una chiamata**, incluse evaluations collegate |
| GET | `/analytics/chatlogs/*` | Equivalenti per `chat_logs` |
| GET | `/analytics/chatlogs/summary` | **Tutto in una chiamata**, incluse evaluations collegate |
| GET | `/analytics/evaluations/mediascore` | Score medi su tutte le valutazioni |
| GET | `/analytics/evaluations/list` | Listato valutazioni |

> Gli endpoint `/summary` sono pensati per la dashboard: una sola chiamata HTTP popola un'intera vista Overview, evitando 6-8 round-trip separati.

### Delete

| Metodo | Endpoint | Descrizione |
|---|---|---|
| DELETE | `/delete/userchat/{chat_id}` | Elimina una user chat (cascade manuale verso evaluations) |
| DELETE | `/delete/chatlogs/{log_id}` | Elimina un chat log (cascade automatica via FK verso evaluations) |
| DELETE | `/delete/evaluations/{evaluation_id}` | Elimina una valutazione |

---

## Database

### Tabelle principali

- **`user_chats`** — chat inserite manualmente/via API (`id`, `system_prompt`, `messages_json`, `message_count`, `created_at`)
- **`chat_logs`** — log sincronizzati da PlatformHero (`id`, `assistant_id`, `chat_id`, `message_count`, `messages_json`, `created_at`)
- **`evaluations`** — output del Judge (10 score + `overall_score`, `feedback`, `issues`)

### Integrità referenziale

`evaluations.log_id` può riferirsi a due tabelle diverse a seconda del flusso di provenienza:

| Origine valutazione | `evaluations.log_id` punta a |
|---|---|
| `/evaluate/chatlogs` | `chat_logs.id` |
| `/evaluate/userchat/{id}` | `user_chats.id` |

Per questo motivo:
- **`chat_logs → evaluations`**: protetta da `FOREIGN KEY ... ON DELETE CASCADE` nel DB
- **`user_chats → evaluations`**: gestita manualmente in `app/routes/delete/userchat.py` (la FK nativa non può puntare condizionalmente a due tabelle)

`app/database/connection.py` attiva `PRAGMA foreign_keys = ON` ad ogni connessione (SQLite non lo fa di default).

---

## Note di sviluppo

- **Scoring**: 10 dimensioni valutate dal Judge (technical, completeness, business, consistency, prompt_compliance, helpfulness, tone, hallucination, efficiency, source_reliability). `overall_score` è **sempre calcolato lato Python**, mai dall'LLM, per evitare allucinazioni nel punteggio finale.
- **Creazione tabelle**: gestita manualmente (vedi `notebooks/database_setup.ipynb`), non automatizzata negli script applicativi.
- **Naming**: zero trattini negli endpoint (`chatlogs`, non `chat-logs`); zero hardcoding di config (tutto da `.env` via `app/config/settings.py`).

---


