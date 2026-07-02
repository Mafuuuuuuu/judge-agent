# PlatformHero AI Quality Intelligence Layer

**Versione:** 1.2.0  
**Stack:** Python 3.14, FastAPI, SQLite, Jupyter — frontend Angular 20

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
Analytics Layer  ─────►  Dashboard Angular (frontend/)
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
| `JWT_SECRET_KEY` | Chiave di firma dei token JWT (obbligatoria) | stringa casuale lunga |
| `JWT_EXPIRE_MINUTES` | Durata del token in minuti | `60` |

Nota: il file `.env` non va committato ed è già escluso tramite `.gitignore`.

## Avvio

### Backend

Avvia il server FastAPI con:

```powershell
python -m uvicorn app.main:app --reload
```

Interfacce e endpoint utili:

- Swagger UI: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### Frontend (dashboard Angular)

In un secondo terminale:

```powershell
cd frontend
npm install --legacy-peer-deps   # solo la prima volta
npm start                        # http://localhost:4200
```

Il dev server usa `proxy.conf.json` per inoltrare le chiamate `/api/*` al
backend sulla porta 8000: backend e frontend vanno avviati entrambi.
Il flag `--legacy-peer-deps` serve per i pin esatti interni dei pacchetti
Angular 20 (conflitto noto del resolver npm).

Stack frontend: Angular 20 (standalone components, signals), ng2-charts /
Chart.js, SCSS. La UI adatta le azioni al ruolo dell'utente loggato:
i `viewer` vedono solo le sezioni di consultazione, gli `analyst` possono
inserire e valutare, gli `admin` hanno anche eliminazione e gestione utenti.

## Autenticazione

Tutti gli endpoint (tranne `/health` e `/api/auth/login`) richiedono un token JWT nell'header `Authorization: Bearer <token>`.

Ruoli disponibili, dal più al meno privilegiato:

| Ruolo | Analytics | Insert / Evaluate | Delete | Gestione utenti |
|---|---|---|---|---|
| `admin` | ✔ | ✔ | ✔ | ✔ |
| `analyst` | ✔ | ✔ | ✘ | ✘ |
| `viewer` | ✔ | ✘ | ✘ | ✘ |

### Endpoint auth

| Metodo | Endpoint | Ruolo | Descrizione |
|---|---|---|---|
| POST | `/api/auth/login` | pubblico (rate limit 5/min) | Restituisce `access_token` JWT |
| GET | `/api/auth/me` | autenticato | Dati dell'utente corrente |
| POST | `/api/auth/register` | admin (rate limit 3/min) | Crea un nuovo utente |
| GET | `/api/auth/users` | admin | Lista utenti |
| PATCH | `/api/auth/users/{username}/role` | admin | Cambia ruolo |
| PATCH | `/api/auth/users/{username}/password` | admin | Reset password |
| DELETE | `/api/auth/users/{username}` | admin | Elimina utente |

## API Reference

Tutti gli endpoint applicativi sono montati sotto il prefisso `/api`, organizzati per dominio e azione.

### User Chat

| Metodo | Endpoint | Ruolo minimo | Descrizione |
|---|---|---|---|
| POST | `/api/userchat/insert` | analyst | Inserisce una chat utente |
| POST | `/api/userchat/evaluate/{chat_id}` | analyst | Valuta una user chat tramite AI Judge |
| GET | `/api/userchat/analytics/totals` | viewer | Totale conversazioni |
| GET | `/api/userchat/analytics/mediamessaggi` | viewer | Media, minimo e massimo messaggi |
| GET | `/api/userchat/analytics/distribuzionesystemprompt` | viewer | Distribuzione per system prompt |
| GET | `/api/userchat/analytics/trend` | viewer | Trend temporale |
| GET | `/api/userchat/analytics/topchat` | viewer | Top N chat per messaggi |
| GET | `/api/userchat/analytics/list` | viewer | Listato paginato (`limit`/`offset`, risposta `{totale, limit, offset, risultati}`) |
| GET | `/api/userchat/analytics/summary` | viewer | Overview completa in una sola chiamata, incluse le evaluation collegate |
| DELETE | `/api/userchat/delete/{chat_id}` | admin | Elimina una chat con cascade manuale verso `evaluations` |

### Chat Logs

| Metodo | Endpoint | Ruolo minimo | Descrizione |
|---|---|---|---|
| POST | `/api/chatlogs/insert` | analyst | Inserisce o sincronizza log da PlatformHero |
| POST | `/api/chatlogs/evaluate` | analyst | Valuta l'ultimo log sincronizzato di una chat, con `chat_id` nel body |
| GET | `/api/chatlogs/analytics/*` | viewer | Endpoint equivalenti a quelli di `userchat` |
| GET | `/api/chatlogs/analytics/list` | viewer | Listato paginato (`page`/`size`, risposta `{page, size, total, items}`) |
| GET | `/api/chatlogs/analytics/summary` | viewer | Overview completa in una sola chiamata |
| DELETE | `/api/chatlogs/delete/{log_id}` | admin | Elimina un chat log con cascade automatica via foreign key |

### Evaluations

| Metodo | Endpoint | Ruolo minimo | Descrizione |
|---|---|---|---|
| GET | `/api/evaluations/analytics/mediascore` | viewer | Score medi su tutte le valutazioni (filtri `from_date`/`to_date`) |
| GET | `/api/evaluations/analytics/list` | viewer | Listato paginato (`page`/`size`, risposta `{page, size, total, items}`) |
| DELETE | `/api/evaluations/delete/{evaluation_id}` | admin | Elimina una valutazione |

### Logs raw

| Metodo | Endpoint | Ruolo minimo | Descrizione |
|---|---|---|---|
| POST | `/api/logs/insert` | analyst | Inserisce e normalizza log raw |

Gli endpoint `/summary` sono pensati per la dashboard: una singola chiamata HTTP può popolare una vista Overview completa, riducendo i round-trip.

## Struttura del progetto

```text
app/
├── main.py                  # App FastAPI, middleware e registrazione router
├── pyrightconfig.json       # Configurazione Pyright
├── auth/
│   ├── router.py            # Endpoint /api/auth (login, gestione utenti)
│   ├── service.py           # Hash password e firma/verifica JWT
│   └── dependencies.py      # get_current_user e require_role
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
├── test/
│   └── locustfile.py        # Load test con Locust
└── utils/
    ├── limiter.py           # Rate limiting (slowapi)
    └── middleware.py        # Sanitizzazione body e request-id

frontend/                    # Dashboard Angular 20 (vedi frontend/README.md)

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

Poiché `log_id` è polimorfico, la tabella `evaluations` **non ha** un vincolo
`FOREIGN KEY` (un FK rigido verso `chat_logs` farebbe fallire ogni valutazione
delle user chat): entrambe le cascate sono gestite manualmente nel layer di
delete. I database creati con il vecchio schema (che aveva il FK) vengono
migrati automaticamente all'avvio da `init_db`.

La connessione SQLite attiva `PRAGMA foreign_keys = ON` ad ogni apertura, perché SQLite non lo fa di default.

## Note di sviluppo

- Lo scoring copre 10 dimensioni: `technical`, `completeness`, `business`, `consistency`, `prompt_compliance`, `helpfulness`, `tone`, `hallucination`, `efficiency`, `source_reliability`.
- `overall_score` viene calcolato sempre lato Python, mai direttamente dall’LLM.
- La creazione delle tabelle è gestita manualmente.
- La configurazione è centralizzata in `app/config/settings.py` e non hardcoded negli endpoint.
- Il progetto include un middleware di sanitizzazione del body.


