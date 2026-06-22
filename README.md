# PlatformHero AI Quality Intelligence Layer

**Versione:** 1.2.0  
**Stack:** Python 3.14, FastAPI, SQLite, Jupyter

PlatformHero AI Quality Intelligence Layer è un sistema di **AI Quality & Observability** che si innesta sopra PlatformHero senza sostituirlo. Recupera i log delle conversazioni del Customer Agent, li valuta tramite un approccio **LLM-as-Judge** multi-dimensionale e restituisce analytics aggregate per monitorare la qualità operativa.

> Questo progetto **non** è un Customer Agent e **non** genera risposte per gli utenti finali. È un layer di controllo qualità e intelligence operativa che osserva, valuta e misura.

## Indice

- [Architettura](#architettura)
- [Funzionalità](#funzionalità)
- [Requisiti](#requisiti)
- [Setup](#setup)
- [Configurazione](#configurazione)
- [Avvio](#avvio)
- [API Reference](#api-reference)
- [Struttura del progetto](#struttura-del-progetto)
- [Database](#database)
- [Note di sviluppo](#note-di-sviluppo)

## Architettura

```text
Customer Agent (esistente)
        │
        ▼
PlatformHero API (log esterni)
        │
        ▼
Sync / Insert Layer  ─────►  SQLite Mirror DB
        │                        │
        ▼                        │
Judge Agent (LLM Eval) ◄─────────┘
        │
        ▼
Evaluations DB
        │
        ▼
Analytics Layer  ─────►  (futuro: dashboard Angular)
```

Il sistema si articola in tre responsabilità principali:

1. **Insert**: recupero e inserimento dei log da PlatformHero.
2. **Evaluate**: valutazione automatica della qualità tramite LLM Judge su 10 dimensioni di scoring.
3. **Analytics**: aggregazioni, KPI e trend per l’osservabilità.

## Funzionalità

- Sincronizzazione dei log conversazionali da PlatformHero.
- Inserimento manuale o via API di `userchat`, `logs` e `chatlogs`.
- Valutazione automatica delle chat con punteggi multidimensionali.
- Calcolo di `overall_score` lato Python per evitare distorsioni del modello.
- Endpoint di analytics per overview, trend e confronti.
- Cancellazione con gestione della cascata tra tabelle correlate.
- Supporto CORS per frontend Angular.

## Requisiti

- Python 3.13 o superiore
- `pip`
- Accesso a un endpoint OpenAI-compatible per il Judge

## Setup

### 1. Clona il repository

```powershell
git clone <repo-url>
cd "Judge agent"
```

### 2. Crea e attiva l'ambiente virtuale

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 3. Installa le dipendenze

```powershell
pip install -r requirements.txt
```

## Configurazione

Copia il file di esempio e compila le variabili reali:

```powershell
Copy-Item -LiteralPath '.env .example' -Destination '.env'
```

Variabili principali:

| Variabile | Descrizione | Esempio |
|---|---|---|
| `TOKEN` | API key PlatformHero usata dal Judge | `tk...` |
| `PLATFORMHERO_URL` | Endpoint OpenAI-compatible | `https://api.platformhero.ai/v1` |
| `MODEL_NAME` | Modello usato per la valutazione | `TpwgLXbi` |
| `DB_PATH` | Percorso del database SQLite mirror | `data/platformhero_mirror.db` |
| `CORS_ORIGINS` | Origine consentita per il frontend | `http://localhost:4200` |
| `PORT` | Porta del server FastAPI | `8000` |

Nota: il file `.env` non va committato ed è già escluso tramite `.gitignore`.

## Avvio

Avvia il server FastAPI con:

```powershell
python -m uvicorn app.main:app --reload
```

Interfacce e endpoint utili:

- Swagger UI: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

## API Reference

La naming convention evita i trattini e organizza gli endpoint per azione e dominio.

### Insert

| Metodo | Endpoint | Descrizione |
|---|---|---|
| POST | `/insert/userchat` | Inserisce una chat utente |
| POST | `/insert/logs` | Inserisce e normalizza log raw |
| POST | `/insert/chatlogs` | Inserisce o sincronizza log da PlatformHero |

### Evaluate

| Metodo | Endpoint | Descrizione |
|---|---|---|
| POST | `/evaluate/userchat/{chat_id}` | Valuta una user chat tramite AI Judge |
| POST | `/evaluate/chatlogs` | Valuta l'ultimo log sincronizzato di una chat, con `chat_id` nel body |

### Analytics

| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/analytics/userchat/totals` | Totale conversazioni |
| GET | `/analytics/userchat/mediamessaggi` | Media, minimo e massimo messaggi |
| GET | `/analytics/userchat/distribuzionesystemprompt` | Distribuzione per system prompt |
| GET | `/analytics/userchat/trend` | Trend temporale |
| GET | `/analytics/userchat/topchat` | Top N chat per messaggi |
| GET | `/analytics/userchat/list` | Listato paginato |
| GET | `/analytics/userchat/summary` | Overview completa in una sola chiamata, incluse le evaluation collegate |
| GET | `/analytics/chatlogs/*` | Endpoint equivalenti per `chat_logs` |
| GET | `/analytics/chatlogs/summary` | Overview completa in una sola chiamata, incluse le evaluation collegate |
| GET | `/analytics/evaluations/mediascore` | Score medi su tutte le valutazioni |
| GET | `/analytics/evaluations/list` | Listato valutazioni |

Gli endpoint `/summary` sono pensati per la dashboard: una singola chiamata HTTP può popolare una vista Overview completa, riducendo i round-trip.

### Delete

| Metodo | Endpoint | Descrizione |
|---|---|---|
| DELETE | `/delete/userchat/{chat_id}` | Elimina una chat utente con cascade manuale verso `evaluations` |
| DELETE | `/delete/chatlogs/{log_id}` | Elimina un chat log con cascade automatica via foreign key |
| DELETE | `/delete/evaluations/{evaluation_id}` | Elimina una valutazione |

## Struttura del progetto

```text
app/
├── main.py                  # App FastAPI, CORS e registrazione router
├── pyrightconfig.json       # Configurazione Pyright
├── config/
│   └── settings.py          # Configurazioni lette da .env
├── core/
│   ├── auditor_core.py      # Logica del Judge LLM
│   └── chat_sync_core.py    # Fetch dei log da PlatformHero
├── database/
│   ├── connection.py        # Connessione SQLite e PRAGMA foreign_keys=ON
│   └── schemas.py           # Modelli Pydantic per validazione request
├── routes/
│   ├── chatlogs/
│   │   ├── insert.py        # Inserimento/sync dei log PlatformHero
│   │   ├── evaluate.py      # Valutazione dei chat log
│   │   ├── analytics.py     # Analytics sui chat log
│   │   └── delete.py        # Eliminazione dei chat log
│   ├── evaluations/
│   │   ├── analytics.py     # Analytics sulle valutazioni
│   │   └── delete.py        # Eliminazione delle valutazioni
│   ├── logs/
│   │   └── insert.py        # Inserimento e normalizzazione dei log raw
│   └── userchat/
│       ├── insert.py        # Inserimento chat utente
│       ├── evaluate.py      # Valutazione chat utente
│       ├── analytics.py     # Analytics sulle chat utente
│       └── delete.py        # Eliminazione chat utente
└── utils/                   # Utility condivise

notebooks/
├── database_setup.ipynb     # Setup manuale delle tabelle SQLite
├── judge_agent.ipynb        # Sperimentazione del Judge locale
└── log_normalization.ipynb  # Parsing markdown e batch writes

data/
└── platformhero_mirror.db   # Database SQLite mirror

backup/                      # Versioni precedenti e materiale storico

requirements.txt             # Dipendenze Python
README.md                    # Documentazione del progetto
```

## Database

### Tabelle principali

- `user_chats`: chat inserite manualmente o via API.
- `chat_logs`: log sincronizzati da PlatformHero.
- `evaluations`: output del Judge con 10 score, `overall_score`, `feedback` e `issues`.

### Integrità referenziale

`evaluations.log_id` può riferirsi a due tabelle diverse a seconda del flusso di provenienza:

| Origine valutazione | `evaluations.log_id` punta a |
|---|---|
| `/evaluate/chatlogs` | `chat_logs.id` |
| `/evaluate/userchat/{id}` | `user_chats.id` |

Per questo motivo:

- `chat_logs -> evaluations` è protetta da `FOREIGN KEY ... ON DELETE CASCADE`.
- `user_chats -> evaluations` è gestita manualmente nel layer di delete.

La connessione SQLite attiva `PRAGMA foreign_keys = ON` ad ogni apertura, perché SQLite non lo fa di default.

## Note di sviluppo

- Lo scoring copre 10 dimensioni: `technical`, `completeness`, `business`, `consistency`, `prompt_compliance`, `helpfulness`, `tone`, `hallucination`, `efficiency`, `source_reliability`.
- `overall_score` viene calcolato sempre lato Python, mai direttamente dall’LLM.
- La creazione delle tabelle è gestita manualmente.
- La configurazione è centralizzata in `app/config/settings.py` e non hardcoded negli endpoint.
- Il progetto include un middleware di sanitizzazione del body.


