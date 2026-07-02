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

## Fase 2 — Ottimizzazione codice ⬜ DA FARE

### Frontend
- [ ] Rimuovere warning di build:
  - import inutilizzato `ScoreRadarComponent` in
    `frontend/src/app/features/evaluations/evaluations-list/evaluations-list.component.ts:18`
  - `??` ridondanti in `analytics.component.ts:440-441` e `dashboard.component.ts:67`
  - budget SCSS superato su `sidebar`, `analytics`, `evaluations-list` (alzare budget o snellire stile)
- [ ] Deduplicare i 4 service (`userchat`, `chatlogs`, `evaluations`, `auth`): base URL e pattern CRUD → possibile service generico/base.
- [ ] `trackBy` nelle liste, `ChangeDetectionStrategy.OnPush` / signals dove manca.
- [ ] Gestione uniforme degli stati loading/errore (già presenti `loading-skeleton` e `toast`).
- [ ] Verificare l'allineamento tra i model TypeScript (`core/models/*.ts`) e le response reali del backend, in particolare gli endpoint `/summary` e i 10 score.

### Backend
- [ ] Aggiornare il `README.md`: gli endpoint reali hanno prefisso `/api` e sono protetti da auth JWT (il README attuale documenta percorsi senza `/api` e non menziona l'auth).
- [ ] Verificare eventuali query N+1 negli endpoint `/summary`.
- [ ] Coerenza nella gestione degli errori tra i router.

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
