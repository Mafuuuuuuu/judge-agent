import os
import uuid
import random
import time
from locust import HttpUser, task, between, LoadTestShape, events

TEST_TYPE = os.getenv("LOCUST_TEST_TYPE", "stress").lower()

# ---------------------------------------------------------------------------
# Credenziali utenti di test
# ---------------------------------------------------------------------------
USERS = {
    "admin":   {"username": "mahfuj",   "password": "mahfuj12"},
    "analyst": {"username": "analist2", "password": "analist2"},
    "viewer":  {"username": "viewer2",  "password": "viewer2"},
}

# ---------------------------------------------------------------------------
# Helper globale per il login
# ---------------------------------------------------------------------------
def get_token(client, role: str, _retry: bool = True) -> str | None:
    credentials = USERS[role]
    with client.post(
        "/api/auth/login",
        json=credentials,
        catch_response=True,
        name="[AUTH] /api/auth/login",
    ) as resp:
        if resp.status_code == 200:
            resp.success()
            return resp.json().get("access_token")
        elif resp.status_code == 429:
            resp.success()  # non conta come failure — è un backoff atteso
            if _retry:
                wait = 12 + random.uniform(0, 6)  # finestra >12s: il rate limiter resetta
                time.sleep(wait)
                return get_token(client, role, _retry=False)
        elif resp.status_code == 401:
            resp.failure(f"Login fallito [401]: Credenziali non valide per '{role}'")
        else:
            resp.failure(f"Login fallito [{resp.status_code}]: {resp.text}")
    return None


# ---------------------------------------------------------------------------
# Classe base — logica di auth condivisa tra tutti i ruoli
# ---------------------------------------------------------------------------
class AuthenticatedUser(HttpUser):
    """
    Classe base astratta. Non viene istanziata direttamente da Locust
    perché non ha task propri né weight definito.
    Fornisce _login() e _ensure_token() a tutte le sottoclassi.
    """
    abstract = True
    role: str = None  # override nelle sottoclassi

    def on_start(self):
        time.sleep(random.uniform(0, 4))  # jitter anti-thundering-herd
        self.token = None
        self.headers = {}
        self.token_acquired_at = 0.0
        self._login()

    def _login(self):
        self.token = get_token(self.client, self.role)
        self.token_acquired_at = time.time() if self.token else 0.0
        self.headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}

    def _ensure_token(self):
        # Re-login se token mancante o più vecchio di 50 minuti
        if not self.token or (time.time() - self.token_acquired_at) > 3000:
            self._login()


# ---------------------------------------------------------------------------
# Utente Analista — inserimenti + analytics (weight 3 = 50%)
# ---------------------------------------------------------------------------
class AnalystUser(AuthenticatedUser):
    weight = 0 if TEST_TYPE == "robustness" else 3
    role = "analyst"
    wait_time = between(1, 3)

    @task(2)
    def insert_userchat(self):
        self._ensure_token()
        if not self.token:
            return

        payload = {
            "chat_id": f"user-chat-{uuid.uuid4().hex[:8]}",
            "system_prompt": "Sei un auditor di qualità software.",
            "messages": [
                {"role": "user",      "content": "Il sistema genera risposte corrette?"},
                {"role": "assistant", "content": "Sto analizzando i log per verificarlo."},
            ],
        }

        with self.client.post(
            "/api/userchat/insert",
            json=payload,
            headers=self.headers,
            catch_response=True,
            name="[ANALYST] POST /userchat/insert",
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            elif resp.status_code == 401:
                self.token = None  # forza re-login al prossimo ciclo
                resp.failure("Token scaduto (401) — re-login schedulato")
            else:
                resp.failure(f"Insert Userchat fallito [{resp.status_code}]")

    @task(2)
    def get_chatlogs_summary(self):
        self._ensure_token()
        if not self.token:
            return

        with self.client.get(
            "/api/chatlogs/analytics/summary",
            headers=self.headers,
            catch_response=True,
            name="[ANALYST] GET /chatlogs/summary",
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Summary Chatlogs fallito [{resp.status_code}]")

    @task(1)
    def get_userchat_summary(self):
        self._ensure_token()
        if not self.token:
            return

        with self.client.get(
            "/api/userchat/analytics/summary",
            headers=self.headers,
            catch_response=True,
            name="[ANALYST] GET /userchat/summary",
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Summary Userchat fallito [{resp.status_code}]")


# ---------------------------------------------------------------------------
# Utente Viewer — solo lettura analytics (weight 2 = ~33%)
# ---------------------------------------------------------------------------
class ViewerUser(AuthenticatedUser):
    weight = 0 if TEST_TYPE == "robustness" else 2
    role = "viewer"
    wait_time = between(2, 5)

    @task(3)
    def get_chatlogs_summary(self):
        self._ensure_token()
        if not self.token:
            return

        with self.client.get(
            "/api/chatlogs/analytics/summary",
            headers=self.headers,
            catch_response=True,
            name="[VIEWER] GET /chatlogs/summary",
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Viewer Summary fallito [{resp.status_code}]")

    @task(1)
    def get_userchat_summary(self):
        self._ensure_token()
        if not self.token:
            return

        with self.client.get(
            "/api/userchat/analytics/summary",
            headers=self.headers,
            catch_response=True,
            name="[VIEWER] GET /userchat/summary",
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Viewer Userchat Summary fallito [{resp.status_code}]")


# ---------------------------------------------------------------------------
# Utente Admin — gestione utenti + analytics (weight 1 = ~17%)
# ---------------------------------------------------------------------------
class AdminUser(AuthenticatedUser):
    weight = 0 if TEST_TYPE == "robustness" else 1
    role = "admin"
    wait_time = between(3, 7)

    @task(2)
    def get_chatlogs_summary(self):
        self._ensure_token()
        if not self.token:
            return

        with self.client.get(
            "/api/chatlogs/analytics/summary",
            headers=self.headers,
            catch_response=True,
            name="[ADMIN] GET /chatlogs/summary",
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Admin Summary fallito [{resp.status_code}]")

    @task(1)
    def get_current_user(self):
        """Verifica che il token admin sia valido e il profilo sia accessibile."""
        self._ensure_token()
        if not self.token:
            return

        with self.client.get(
            "/api/auth/me",
            headers=self.headers,
            catch_response=True,
            name="[ADMIN] GET /auth/me",
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            elif resp.status_code == 401:
                self.token = None
                resp.failure("Token admin scaduto (401)")
            else:
                resp.failure(f"GET /auth/me fallito [{resp.status_code}]")


# ---------------------------------------------------------------------------
# Utente Robustness — iniezione errori intenzionali (weight 5 = 100% in modalità robustness)
# ---------------------------------------------------------------------------
class RobustnessUser(HttpUser):
    """
    Invia intenzionalmente richieste errate per verificare che l'API
    le rifiuti in modo sicuro con i codici HTTP appropriati (401, 422).
    """
    weight = 5 if TEST_TYPE == "robustness" else 0
    wait_time = between(1, 2)

    @task(1)
    def login_with_wrong_credentials(self):
        """Atteso: 401 Unauthorized"""
        payload = {"username": "invalid_user", "password": "wrong_password"}
        with self.client.post(
            "/api/auth/login",
            json=payload,
            catch_response=True,
            name="[ROBUSTNESS] POST /login (credenziali errate)",
        ) as resp:
            if resp.status_code == 401:
                resp.success()
            else:
                resp.failure(f"Atteso 401, ricevuto {resp.status_code}")

    @task(1)
    def insert_chat_without_auth(self):
        """Atteso: 401 Unauthorized — nessun Authorization header"""
        payload = {
            "chat_id": f"test-{uuid.uuid4().hex[:8]}",
            "system_prompt": "Test",
            "messages": [{"role": "user", "content": "Test"}],
        }
        with self.client.post(
            "/api/userchat/insert",
            json=payload,
            catch_response=True,
            name="[ROBUSTNESS] POST /userchat/insert (no auth)",
        ) as resp:
            if resp.status_code == 401:
                resp.success()
            else:
                resp.failure(f"Atteso 401, ricevuto {resp.status_code}")

    @task(1)
    def insert_chat_with_corrupted_token(self):
        """Atteso: 401 Unauthorized — JWT corrotto"""
        headers = {"Authorization": "Bearer corrupted.jwt.token.invalid"}
        payload = {
            "chat_id": f"test-{uuid.uuid4().hex[:8]}",
            "system_prompt": "Test",
            "messages": [{"role": "user", "content": "Test"}],
        }
        with self.client.post(
            "/api/userchat/insert",
            json=payload,
            headers=headers,
            catch_response=True,
            name="[ROBUSTNESS] POST /userchat/insert (token corrotto)",
        ) as resp:
            if resp.status_code == 401:
                resp.success()
            else:
                resp.failure(f"Atteso 401, ricevuto {resp.status_code}")

    @task(1)
    def login_with_malformed_json(self):
        """Atteso: 422 Unprocessable Entity — JSON incompleto/malformato"""
        # Invia un payload senza i campi obbligatori al login
        payload = {"username": "test"}  # manca password
        with self.client.post(
            "/api/auth/login",
            json=payload,
            catch_response=True,
            name="[ROBUSTNESS] POST /login (JSON malformato)",
        ) as resp:
            if resp.status_code == 422:
                resp.success()  # 422 è atteso — marker come success
            else:
                resp.failure(f"Atteso 422, ricevuto {resp.status_code}")


# ---------------------------------------------------------------------------
# Utente Cascade Failure — alternanza tra endpoint A (chatlogs) e B (userchat)
# ---------------------------------------------------------------------------
class CascadeFailureUser(AuthenticatedUser):
    """
    Test di recovery tra switchover di carico.
    Alterna richieste tra /chatlogs/summary e /userchat/summary
    per simulare shift di carico da un'API all'altra.
    """
    weight = 2
    role = "analyst"
    wait_time = between(1, 2)

    @task(1)
    def get_chatlogs_summary(self):
        self._ensure_token()
        if not self.token:
            return
        with self.client.get(
            "/api/chatlogs/analytics/summary",
            headers=self.headers,
            catch_response=True,
            name="[CASCADE] GET /chatlogs/summary",
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Chatlogs summary fallito [{resp.status_code}]")

    @task(1)
    def get_userchat_summary(self):
        self._ensure_token()
        if not self.token:
            return
        with self.client.get(
            "/api/userchat/analytics/summary",
            headers=self.headers,
            catch_response=True,
            name="[CASCADE] GET /userchat/summary",
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Userchat summary fallito [{resp.status_code}]")


# ---------------------------------------------------------------------------
# Utente Churn — sessioni brevi e frequenti (login/uso/logout simulato)
# ---------------------------------------------------------------------------
class ChurnUser(HttpUser):
    """
    Simula utenti che entrano e escono frequentemente.
    Ogni "sessione" è breve: login, 1-2 richieste, timeout implicito.
    """
    weight = 2
    wait_time = between(0.5, 1.5)

    def on_start(self):
        self.token = None
        self.headers = {}
        self._login()

    def _login(self):
        role = random.choice(["analyst", "viewer"])
        credentials = USERS[role]
        with self.client.post(
            "/api/auth/login",
            json=credentials,
            catch_response=True,
            name="[CHURN] POST /login",
        ) as resp:
            if resp.status_code == 200:
                resp.success()
                self.token = resp.json().get("access_token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
            else:
                resp.failure(f"Login fallito [{resp.status_code}]")
                self.token = None

    @task(2)
    def quick_analytics_read(self):
        if not self.token:
            self._login()
            if not self.token:
                return

        with self.client.get(
            "/api/chatlogs/analytics/summary",
            headers=self.headers,
            catch_response=True,
            name="[CHURN] GET /chatlogs/summary",
        ) as resp:
            if resp.status_code in (200, 401):
                resp.success()
                if resp.status_code == 401:
                    self.token = None  # sessione terminata, re-login prossima volta
            else:
                resp.failure(f"Analytics read fallito [{resp.status_code}]")

    @task(1)
    def simulate_session_end(self):
        # Simula fine sessione forzando un re-login
        self.token = None
        self.headers = {}


# ---------------------------------------------------------------------------
# Shape di carico progressiva (Master — seleziona scenario)
# ---------------------------------------------------------------------------
class DynamicLoadShape(LoadTestShape):
    """
    Seleziona lo scenario di carico in base alla variabile d'ambiente LOCUST_TEST_TYPE:
    - 'stress' (default): 5 stage incrementali (fino a 100 utenti, durata 4 minuti)
    - 'soak': carico costante di 15 utenti per un periodo prolungato (durata 30 minuti)
    - 'spike': picco repentino da 0 a 100 utenti, discesa immediata a 0 (durata 2.5 minuti)
    - 'breakpoint': rampa lineare infinita (+10 utenti ogni 15s) fino allo stop manuale
    - 'robustness': test di iniezione errori con 20 utenti costanti per 2 minuti
    - 'cascade': test di recovery tra switchover di carico (3 minuti)
    - 'churn': test di alta turnover di sessioni utente (2.5 minuti)
    """
    stress_stages = [
        {"duration":  45, "users":   5, "spawn_rate": 1},   # Stage 1 — Smoke
        {"duration":  90, "users":  20, "spawn_rate": 3},   # Stage 2 — Load
        {"duration": 150, "users":  50, "spawn_rate": 5},   # Stage 3 — Stress
        {"duration": 180, "users": 100, "spawn_rate": 20},  # Stage 4 — Spike
        {"duration": 240, "users":  10, "spawn_rate": 5},   # Stage 5 — Recovery
    ]

    soak_stages = [
        {"duration": 1800, "users": 15, "spawn_rate": 2}    # Soak Test: 15 utenti costanti per 30 minuti
    ]

    spike_stages = [
        {"duration":  90, "users": 100, "spawn_rate": 20},  # Salita immediata a 100 utenti (in 5s) e mantenimento
        {"duration": 120, "users":   0, "spawn_rate": 20},  # Discesa immediata a 0 utenti (in 5s)
        {"duration": 150, "users":   0, "spawn_rate": 1}    # Quiete finale
    ]

    robustness_stages = [
        {"duration": 120, "users": 20, "spawn_rate": 5}     # Robustness Test: 20 utenti costanti per 2 minuti
    ]

    cascade_stages = [
        {"duration":  60, "users": 30, "spawn_rate": 5},   # Fase 1: Carico su chatlogs
        {"duration":  90, "users": 15, "spawn_rate": 3},   # Fase 2: Recovery (carico cala)
        {"duration": 150, "users": 30, "spawn_rate": 5},   # Fase 3: Carico su userchat
        {"duration": 180, "users":  0, "spawn_rate": 5},   # Fase 4: Cooldown
    ]

    churn_stages = [
        {"duration":  30, "users": 40, "spawn_rate": 10},   # Ramp-up
        {"duration":  60, "users": 40, "spawn_rate": 5},    # Maintain con churn
        {"duration":  90, "users": 20, "spawn_rate": 10},   # Drop
        {"duration": 120, "users": 60, "spawn_rate": 10},   # Ramp-up
        {"duration": 150, "users": 60, "spawn_rate": 5},    # Final soak
    ]

    def tick(self):
        run_time = self.get_run_time()
        test_type = os.getenv("LOCUST_TEST_TYPE", "stress").lower()

        if test_type == "soak":
            stages = self.soak_stages
        elif test_type == "spike":
            stages = self.spike_stages
        elif test_type == "robustness":
            stages = self.robustness_stages
        elif test_type == "cascade":
            stages = self.cascade_stages
        elif test_type == "churn":
            stages = self.churn_stages
        elif test_type == "breakpoint":
            # Rampa lineare infinita: +10 utenti ogni 15 secondi (spawn rate: 5/s)
            step = int(run_time / 15)
            users = (step + 1) * 10
            spawn_rate = 5
            return users, spawn_rate
        else:
            stages = self.stress_stages

        for stage in stages:
            if run_time < stage["duration"]:
                return stage["users"], stage["spawn_rate"]
        return None


# ---------------------------------------------------------------------------
# Report finale a console
# ---------------------------------------------------------------------------
@events.quitting.add_listener
def on_quitting(environment, **kwargs):
    stats = environment.stats
    total = stats.total
    run_time = getattr(environment.runner, "run_time", 0) if environment.runner else 0
    if run_time is None:
        run_time = 0

    # RPS calcolato su durata effettiva del test (non current_rps che è 0 al quit)
    avg_rps = total.num_requests / run_time if run_time > 0 else 0.0

    print("\n" + "=" * 60)
    print("  RUN DI LOAD TEST COMPLETATA")
    print("=" * 60)
    print(f"Durata Test        : {run_time:.0f}s")
    print(f"Richieste Totali   : {total.num_requests}")
    print(f"Fallimenti         : {total.num_failures}")
    print(f"Tasso di Errore    : {total.fail_ratio * 100:.2f}%")
    print(f"RPS Medio          : {avg_rps:.2f}")
    print(f"Tempo Medio Resp   : {total.avg_response_time:.0f} ms")
    print(f"P95 Risposta       : {total.get_response_time_percentile(0.95):.0f} ms")
    print(f"P99 Risposta       : {total.get_response_time_percentile(0.99):.0f} ms")
    print("=" * 60 + "\n")