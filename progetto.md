# PlatformHero AI Quality Intelligence Layer

## LLM-as-Judge + Log Sync + Log Normalization Architecture

Version: 1.2

---

# Executive Summary

Questo sistema è un **AI Quality & Observability Layer** che si integra sopra PlatformHero senza sostituirlo.

Il sistema ha 3 responsabilità principali:

1. Recuperare i log da un database esterno via API
2. Normalizzare log semi-strutturati generati dal Customer Agent
3. Valutare automaticamente la qualità delle risposte tramite un LLM Judge
4. Generare KPI e dashboard per analisi qualità e business

Il sistema NON è un generatore di risposte, ma un **sistema di controllo qualità e intelligence operativa**.

---

# Ruolo del Sistema

## Il sistema NON è:

* ❌ Customer Agent
* ❌ Source of truth dei dati
* ❌ sistema di generazione risposte

## Il sistema È:

* ✔ Log Sync Layer
* ✔ Log Normalization Engine
* ✔ LLM-as-Judge Evaluation System
* ✔ Analytics & KPI Engine
* ✔ Mirror database per osservabilità

---

# Architettura Generale

```text id="arch1"
Customer Agent (esistente)
        │
        ▼
Database principale PlatformHero
        │
        ▼
Logs API PlatformHero
        │
        ▼
Sync Service (FastAPI)
        │
        ▼
Normalization Engine
        │
        ▼
SQLite Mirror DB
        │
        ├── Judge Agent (LLM Evaluation)
        │
        ▼
Evaluations DB (SQLite)
        │
        ▼
Analytics API
        │
        ▼
Angular Dashboard
```

---

# Flusso Operativo Completo

## STEP 1 — Generazione log (esterno)

Il Customer Agent già esistente genera:

* risposta al cliente
* ticket resolution
* output in markdown strutturato
* usage LLM

E salva tutto nel database PlatformHero.

---

## STEP 2 — Recupero log via API

Il tuo sistema NON riceve eventi, ma esegue polling API:

```text id="api1"
GET /api/logs?from=timestamp&to=timestamp
```

oppure:

```text id="api2"
GET /api/logs/latest
```

---

## STEP 3 — Log Raw (formato reale)

Esempio reale:

````json id="raw1"
{
  "usage": {
    "total_cost": 0.05455,
    "input_tokens": 10257,
    "output_tokens": 218
  },
  "message": {
    "role": "assistant",
    "content": "```markdown\n# Errore IVA su Fattura Extra CEE\n...\n## Resolution\n1. Eliminata fattura...\n```",
    "model_id": "TpAh8ldG"
  }
}
````

---

## STEP 4 — Normalization Engine (CRITICO)

Il sistema trasforma il log raw in struttura analizzabile.

### Output normalizzato:

```json id="norm1"
{
  "external_id": "TpAh8ldG",

  "ticket": "#12344",
  "client": "Big Ben Interactive Srl",
  "area": "Business Central",
  "category": "Data Correction",

  "raw_markdown": "...",

  "structured": {
    "problem": "Errore IVA su fattura extra CEE",
    "resolution_steps": [
      "Eliminata fattura errata",
      "Aggiornato numeratore FVEXCEENR25-000025",
      "Confermata assenza interventi su vendita"
    ],
    "notes": "Nessuna azione aggiuntiva necessaria"
  },

  "usage": {
    "total_cost": 0.05455,
    "input_tokens": 10257,
    "output_tokens": 218
  }
}
```

---

## STEP 5 — SQLite Mirror Storage

SQLite contiene la versione normalizzata.

### logs_normalized

```sql id="db1"
CREATE TABLE logs_normalized (
    id TEXT PRIMARY KEY,
    external_id TEXT UNIQUE,

    ticket TEXT,
    client TEXT,
    area TEXT,
    category TEXT,

    raw_markdown TEXT,
    structured_json TEXT,
    usage_json TEXT,

    created_at TEXT
);
```

---

## STEP 6 — Judge Evaluation

Il Judge Agent riceve il log normalizzato.

Valuta:

### Technical Quality

* correttezza operativa
* validità azioni

### Completeness

* copertura completa del problema

### Business Correctness

* rispetto processi aziendali

### Consistency

* coerenza tra problema e soluzione

---

## Output Judge:

```json id="judge1"
{
  "overall_score": 8.6,
  "technical_score": 8.8,
  "completeness_score": 8.5,
  "business_score": 9.0,
  "consistency_score": 8.2,
  "feedback": [
    "Ottima gestione del caso",
    "Lieve rischio di over-correction nella fase iniziale"
  ],
  "issues": []
}
```

---

## STEP 7 — Evaluation Storage

```sql id="db2"
CREATE TABLE evaluations (
    id TEXT PRIMARY KEY,
    log_id TEXT,

    overall_score REAL,
    technical_score REAL,
    completeness_score REAL,
    business_score REAL,
    consistency_score REAL,

    feedback TEXT,
    issues TEXT,

    created_at TEXT
);
```

---

## STEP 8 — Analytics Layer

Il sistema genera:

* KPI qualità agent
* error rate
* distribuzione score
* trend temporali
* anomalie operative

---

## STEP 9 — Angular Dashboard

### Sezioni:

#### Overview

* score medio globale
* performance agent
* qualità risposte

#### Logs Explorer

* ticket
* cliente
* output AI

#### Evaluations

* giudizi Judge
* errori rilevati

#### Trends

* andamento qualità nel tempo
* regressioni

#### Business Insights

* rischio operativo
* efficienza team
* qualità processi

---

# Architettura Componenti

## 1. Sync Service

Responsabilità:

* chiamata API PlatformHero
* polling logs
* gestione paginazione

---

## 2. Normalization Engine (NUOVO CORE)

Responsabilità:

* parsing markdown
* estrazione campi strutturati
* trasformazione log raw → structured

---

## 3. SQLite Mirror DB

Ruolo:

* storage locale
* analytics layer
* cache query

---

## 4. Judge Agent

Responsabilità:

* valutazione qualità output
* scoring multi-dimensionale
* detection errori

---

## 5. Analytics Engine

Responsabilità:

* KPI
* trend
* anomaly detection

---

## 6. Dashboard Angular

Responsabilità:

* visualizzazione
* monitoring
* business intelligence

---

# Stack Tecnologico

## Backend

* Python
* FastAPI
* httpx
* Pydantic
* SQLite

---

## AI Layer

* GPT-5 / Claude / Gemini
* LLM Judge prompting system

---

## Frontend

* Angular
* Angular Material
* ApexCharts

---

# ADR Principali

## ADR-001 — LLM-as-Judge Architecture

Separazione tra:

* sistema operativo (Customer Agent)
* sistema di valutazione (Judge Layer)

---

## ADR-002 — Log Sync via API

Il sistema non è source of truth ma:

> mirror osservazionale basato su API polling

---

## ADR-003 — Log Normalization Layer

Obbligatorio introdurre un layer intermedio per:

* parsing markdown
* estrazione strutturata
* miglioramento qualità dati

---

## ADR-004 — SQLite per MVP

Scelta SQLite per:

* rapidità sviluppo
* semplicità deployment
* testing veloce

Evoluzione futura: PostgreSQL

---

# Roadmap

## Phase 1 — MVP

* Sync logs via API
* Normalization engine
* SQLite mirror
* Judge evaluation
* Dashboard base

---

## Phase 2 — Intelligence Layer

* KPI avanzati
* anomaly detection
* business insights

---

## Phase 3 — Feedback Loop

* ottimizzazione prompt
* dataset generation
* miglioramento Customer Agent

---

## Phase 4 — Enterprise Scaling

* Postgres
* streaming logs
* multi-judge system
* real-time evaluation

---

# Obiettivo Finale

Creare un sistema di **AI Quality Intelligence Layer** capace di:

* osservare agenti AI in produzione
* normalizzare output non strutturati
* valutare automaticamente qualità tecnica e operativa
* identificare errori sistemici
* misurare impatto business (errori, rischi, inefficienze)
* trasformare i log in intelligence operativa

Il sistema diventa un layer di governance AI sopra PlatformHero, simile a strumenti come Langfuse, ma focalizzato su:

* ticket resolution
* consulenza tecnica
* process automation
* controllo qualità operativo
