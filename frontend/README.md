# Frontend — Judge Agent Dashboard

Dashboard Angular 20 per il layer di AI Quality Intelligence: visualizza
analytics, liste e valutazioni prodotte dal backend FastAPI (vedi il
[README principale](../README.md) per architettura, API e autenticazione).

## Avvio

```powershell
npm install --legacy-peer-deps   # solo la prima volta
npm start                        # dev server su http://localhost:4200
```

Richiede il backend attivo sulla porta 8000: le chiamate `/api/*` vengono
inoltrate dal dev server tramite `proxy.conf.json`.

Build di produzione: `npm run build` (output in `dist/frontend`).

## Struttura

```text
src/app/
├── core/
│   ├── guards/          # authGuard (ruoli da route data) e guestGuard
│   ├── interceptors/    # Bearer token + gestione 401/403/429
│   ├── models/          # Tipi delle risposte API (inclusi i paginati)
│   └── services/        # AuthService (signals) + un service per dominio
├── features/            # Pagine lazy-loaded (dashboard, liste, analytics…)
└── shared/              # Componenti riusabili: kpi-card, score-badge,
                         # grafici (radar/trend/bar/doughnut), toast, dialog…
```

## Note

- **Ruoli**: le route dichiarano i ruoli ammessi in `data.roles`; la UI
  nasconde le azioni non permesse (es. i viewer non vedono Valuta/Elimina).
- **Liste paginate**: il backend risponde `{page, size, total, items}`
  (evaluations/chatlogs) o `{totale, limit, offset, risultati}` (userchat);
  i service spacchettano la risposta, filtri e paginazione sono lato client.
- **Grafici**: i canvas Chart.js hanno larghezza intrinseca — le grid usano
  `minmax(0, 1fr)` per permettere alle colonne di restringersi (responsive).
- Il token JWT è salvato in `localStorage` con chiave `judge_agent_token`.
