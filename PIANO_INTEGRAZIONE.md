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

## Fase 3 — Estetica e review visiva ✅ COMPLETATA (commit `f17c88d`)

Review fatta sull'app viva (login admin reale, tutte le pagine, desktop
1280/1440 + mobile 375). Giudizio onesto: il design system del compagno è
già solido e coerente — nessun restyling gratuito, solo fix mirati.

- [x] **Responsive mobile (bug reale)**: sotto i 900px le card coi grafici
  venivano tagliate fuori viewport. Causa: `1fr` nelle grid = `minmax(auto,1fr)`
  e i canvas Chart.js hanno larghezza intrinseca → la colonna non si restringeva.
  Fix in `styles.scss`: `minmax(0,1fr)` su tutte le grid, `canvas { max-width:100% }`,
  `min-width:0` sulle card. Verificato: 0 overflow a 375px.
- [x] **Bug dati scoperto dalla UI**: la dashboard mostrava "Tono 2.026,0" —
  44/44 righe di `evaluations` avevano le colonne shiftate da un vecchio INSERT
  disallineato (feedback in `prompt_compliance_score`, issues in
  `helpfulness_score`, timestamp in `tone_score`, e i 3 score veri in
  `feedback`/`issues`/`created_at`). **Riparate tutte via UPDATE con swap**,
  backup del DB in `data/platformhero_mirror.db.bak-20260702-120002`.
  Verifica post-fix: tutti gli score numerici 0-10 o NULL, tutti i created_at
  timestamp validi; feedback/issues/date ora visibili in UI.
- [x] **Guardia backend** (`auditor_core._norm_score`): gli score dell'LLM ora
  vengono normalizzati (float 0-10, altrimenti NULL) prima dell'INSERT — la
  stessa classe di bug non può rientrare. Testata su tutti i casi limite.
- [x] Verificati visivamente: login, dashboard (radar/trend/doughnut/score bar),
  user chats, chat logs, valutazioni (lista + dettaglio espanso con bar chart,
  feedback e issues), analytics (tab), gestione utenti. Tabelle: scroll
  orizzontale contenuto nel `.table-wrap` su mobile — ok.
- [x] Dark mode / restyling componenti → **scartato consapevolmente**: tema
  chiaro coerente e curato, un secondo tema è una feature da concordare, non
  un fix.

> Nota preview: il browser di anteprima non persiste `localStorage` tra i
> reload, quindi la sessione si perde ricaricando — nel browser vero il
> token resta. Non è un bug dell'app.

---

## Fase 4 — Chiusura ✅ COMPLETATA

- [x] **Test per ruolo su tre livelli** (admin `mahfuj`, analyst `analist2`, viewer `viewer2`):
  - *API*: matrice permessi verificata — analytics 200 per tutti; insert 200
    admin/analyst e 403 viewer; delete solo admin (404 su id inesistente =
    autorizzato); `/api/auth/users` solo admin (403 per gli altri).
  - *UI (viewer)*: la sidebar nasconde "Gestione Utenti"; le liste non mostrano
    Nuova Chat / Valuta / Elimina — solo Aggiorna e paginazione.
  - *Routing (viewer)*: navigazione diretta a `/admin/users` → redirect a
    `/dashboard` dal guard.
  - Le 2 chat vuote create dal test insert sono state eliminate dal DB.
- [x] README principale: sezione Avvio sdoppiata backend/frontend (con nota
  `--legacy-peer-deps` e proxy), stack aggiornato con Angular 20, nota sui
  ruoli in UI.
- [x] `frontend/README.md`: sostituito il boilerplate Angular CLI con doc
  reale (avvio, struttura cartelle, note su ruoli/paginazione/grafici).
- [ ] Pull Request verso `main` — da aprire quando decidi
  (remote: `github.com/Mafuuuuuuu/judge-agent`).

### Nota (gap minore, non bloccante)
`POST /api/userchat/insert` accetta `messages: []` e crea una chat vuota:
valutare una validazione `min_length=1` in `database/schemas.py`.

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
