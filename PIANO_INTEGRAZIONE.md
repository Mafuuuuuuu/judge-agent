# Piano di integrazione Frontend ↔ Backend

**Progetto:** PlatformHero AI Quality Intelligence Layer
**Branch di lavoro:** `feat/frontend-integration`
**Stack:** FastAPI (Python) + Angular 20 + SQLite

---

## Stato attuale (sintesi)

- I percorsi API frontend↔backend **combaciano** (`/api/userchat/...`, `/api/chatlogs/...`, `/api/evaluations/...`, `/api/auth/...`).
- CORS (`localhost:4200`) e `proxy.conf.json` (`/api` → `:8000`) già configurati e coerenti.
- Auth JWT completa lato frontend (`AuthService` con signals, `authInterceptor`, guards con ruoli, routing lazy).
- Design system già presente in `frontend/src/styles.scss` (CSS variables, palette indaco/viola, font Inter).

---

## Fase 0 — Igiene repo ✅ COMPLETATA

- [x] Verificato `frontend/.gitignore` (esclude `node_modules/`, `dist/`, `.angular/cache`).
- [x] Creato branch `feat/frontend-integration`.
- [x] Primo commit del frontend — 51 file, zero `node_modules`/`dist` → commit `aec181d`.

## Fase 1 — Integrazione end-to-end + Angular 20 ✅ COMPLETATA

- [x] Allineato lo stack a **Angular 20.3.x**:
  - tutti i `@angular/*` → `^20.1`
  - aggiunto `@angular/cdk` (peer mancante di ng2-charts)
  - `ng2-charts` → `^9` (compatibile ng20; la `^10` richiede ng21)
  - TypeScript → `~5.8`
  - commit `2b7992f`
- [x] Reinstall pulito (`npm install --legacy-peer-deps`) + **build di produzione verde**.
- [x] Verifica runtime:
  - backend FastAPI parte, `/health` ok, `/api/auth/login` → `401` su credenziali errate (auth ok);
  - `ng serve` serve la pagina (`200`) e il **proxy `/api` inoltra al backend** correttamente.
- [ ] **Da fare (bloccato):** login reale via UI — servono credenziali valide o uno script di seed per un utente di test.

---

## Fase 2 — Ottimizzazione codice ✅ COMPLETATA (commit `8fd5992`)

### Frontend
- [x] **Bug di integrazione trovato e corretto**: `evaluations` e `chatlogs` `getList()`
  tipavano la risposta come array, ma il backend risponde paginato
  (`{page, size, total, items}`) → le liste sarebbero rimaste vuote a runtime.
  I service ora chiedono `size=500` e spacchettano `items` (filtri/paginazione
  restano lato client). `userchat` era già allineato (`{totale, risultati}`).
- [x] `EvaluationMediaScore` reso nullable: con zero valutazioni SQLite
  `AVG/MIN/MAX` restituiscono `NULL`; i `?? 'N/A'` nei template ora sono
  legittimi (era il model a essere sbagliato, non i fallback).
- [x] Rimosso import inutilizzato `ScoreRadarComponent` da `evaluations-list`.
- [x] `trackBy` per id (non per indice) nella lista valutazioni; le altre liste
  usano `@for` con `track` o iterano liste statiche minuscole.
- [x] Tolti 6 `?.` superflui in `analytics.component.ts` (NG8107).
- [x] Budget SCSS `anyComponentStyle` alzato a 8kB warning / 16kB error.
- [x] **Build di produzione: 0 warning, 0 errori.**
- [x] ~~Deduplicare i 4 service~~ → **scartato consapevolmente**: i service sono
  piccoli (30-40 righe) e con differenze reali (cache in evaluations, `limit/offset`
  vs `page/size`, evaluate con/senza body). Una base class generica sarebbe
  sovra-ingegneria.
- [x] Stati loading/errore: già uniformi via `loading-skeleton` + `toast` — ok così.
- [ ] `ChangeDetectionStrategy.OnPush` / signals ovunque → rimandato: refactor
  ampio a beneficio marginale su questa scala; da valutare solo se emergono
  problemi di performance.

### Backend
- [x] `README.md` aggiornato: prefisso `/api`, sezione Autenticazione con matrice
  ruoli (admin/analyst/viewer), endpoint auth con rate limit, shape delle risposte
  paginate, variabili `JWT_SECRET_KEY`/`JWT_EXPIRE_MINUTES`, struttura progetto
  con `app/auth/`, `app/test/`, `app/utils/` e `frontend/`.
- [x] Verificati gli endpoint `/summary`: 6 query aggregate fisse, nessun N+1.
- [x] Gestione errori: pattern coerente (try/except `sqlite3.OperationalError` →
  HTTP 500 con log) — nessun intervento necessario.

---

## Fase 3 — Estetica ⬜ DA FARE

- [ ] Consolidare il design system (token di spacing, stati hover/focus, eventuale dark mode).
- [ ] Rifinire i componenti ad alto impatto: `sidebar`, `kpi-card`, grafici (`score-radar`, `trend-chart`, `bar-chart`, `doughnut-chart`), `score-badge`, `loading-skeleton`, `toast`.
- [ ] Responsive (mobile/tablet) e accessibilità (contrasto, focus visibile, `aria-label`).

---

## Fase 4 — Chiusura ⬜ DA FARE

- [ ] Test manuale per ruolo: `admin`, `analyst`, `viewer`.
- [ ] Aggiornare `README.md` con la sezione frontend (setup, avvio `ng serve`, proxy).
- [ ] Apertura Pull Request da `feat/frontend-integration`.

---

## Come avviare l'ambiente

```powershell
# Backend (dalla root del progetto)
.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload

# Frontend (in un secondo terminale)
cd frontend
npm install --legacy-peer-deps   # solo la prima volta
npm start                        # ng serve su http://localhost:4200
```

- Swagger backend: `http://127.0.0.1:8000/docs`
- App frontend: `http://localhost:4200`

> Nota: attualmente un processo `uvicorn` di test è già attivo sulla porta 8000 per proseguire i test.
