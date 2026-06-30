"""
save_results.py — Salva i risultati dell'ultimo test Locust su SQLite

Struttura cartelle prevista:
    progetto/
    └── test/
        ├── locustfile.py
        ├── save_results.py
        └── csv/                  ← generato automaticamente

Uso (dalla cartella test/, dopo aver fermato il test dalla UI):
    python save_results.py
    python save_results.py --notes "Test dopo fix WAL"

Prerequisito — avvia Locust così:
    python -m locust -f locustfile.py --host http://127.0.0.1:8000 --csv csv/locust_results
"""

import os
import argparse
import csv
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Configurazione
# ---------------------------------------------------------------------------
DB_PATH    = r"C:\Judge agent\data\platformhero_mirror.db"

# Path CSV relativo a dove si trova save_results.py (cartella test/)
THIS_DIR   = Path(__file__).parent
CSV_DIR    = THIS_DIR / "csv"
CSV_PREFIX = str(CSV_DIR / "locust_results")   # → test/csv/locust_results_stats.csv

# Determina lo scenario dal tipo di test impostato
TEST_TYPE  = os.getenv("LOCUST_TEST_TYPE", "stress").lower()

if TEST_TYPE == "soak":
    SCENARIO = "SoakTest_Endurance"
elif TEST_TYPE == "spike":
    SCENARIO = "ExtremeSpikeTest"
elif TEST_TYPE == "breakpoint":
    SCENARIO = "BreakpointTest"
elif TEST_TYPE == "robustness":
    SCENARIO = "ErrorInjectionRobustnessTest"
elif TEST_TYPE == "cascade":
    SCENARIO = "CascadeFailureRecoveryTest"
elif TEST_TYPE == "churn":
    SCENARIO = "ConcurrentChurnTest"
else:
    SCENARIO = "GradualStressShape_5stage"


# ---------------------------------------------------------------------------
# Argomenti CLI
# ---------------------------------------------------------------------------
def parse_args():
    parser = argparse.ArgumentParser(
        description="Salva i risultati dell'ultimo test Locust su SQLite."
    )
    parser.add_argument("--notes", default="", help="Note opzionali per questa run")
    return parser.parse_args()


# ---------------------------------------------------------------------------
# Parsing sicuro dei valori numerici
# ---------------------------------------------------------------------------
def safe_float(value: str, default: float = 0.0) -> float:
    try:
        return float(value) if value and value.strip() else default
    except (ValueError, AttributeError):
        return default

def safe_int(value: str, default: int = 0) -> int:
    try:
        return int(float(value)) if value and value.strip() else default
    except (ValueError, AttributeError):
        return default


# ---------------------------------------------------------------------------
# Lettura CSV
# ---------------------------------------------------------------------------
def read_csv_stats(csv_prefix: str) -> dict:
    stats_file = Path(f"{csv_prefix}_stats.csv")
    if not stats_file.exists():
        raise FileNotFoundError(
            f"\n File '{stats_file}' non trovato.\n"
            "   Assicurati di aver lanciato Locust con:\n"
            "   python -m locust -f locustfile.py --host http://127.0.0.1:8000 --csv csv/locust_results\n"
            "   e che il test sia stato avviato almeno una volta."
        )

    with open(stats_file, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("Name") == "Aggregated":
                return row

    raise ValueError(
        f"Riga 'Aggregated' non trovata in {stats_file}.\n"
        "Il test potrebbe non essere stato completato."
    )


def build_run_label(max_vu: int) -> str:
    """Formato: YYYYMMDD_HHMM_spike<max_vu>vu — es. 20250629_1742_spike100vu"""
    now = datetime.now()
    return f"{now.strftime('%Y%m%d_%H%M')}_spike{max_vu}vu"


# ---------------------------------------------------------------------------
# INSERT su SQLite
# ---------------------------------------------------------------------------
def save_to_db(db_path: str, data: dict) -> str:
    if not Path(db_path).exists():
        raise FileNotFoundError(f"Database non trovato: {db_path}")

    run_id  = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    conn = sqlite3.connect(db_path)
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("""
            INSERT INTO load_test_runs (
                id, run_label, scenario, vus,
                duration_seconds, total_requests, failures,
                avg_response_ms, p95_response_ms, p99_response_ms,
                rps, notes, created_at
            ) VALUES (
                :id, :run_label, :scenario, :vus,
                :duration_seconds, :total_requests, :failures,
                :avg_response_ms, :p95_response_ms, :p99_response_ms,
                :rps, :notes, :created_at
            )
        """, {**data, "id": run_id, "created_at": now_iso})
        conn.commit()
    finally:
        conn.close()

    return run_id


def get_test_duration(csv_prefix: str) -> int:
    """Calcola la durata effettiva del test in secondi dai log storici (dove gli utenti sono > 0)."""
    history_file = Path(f"{csv_prefix}_stats_history.csv")
    if not history_file.exists():
        return 240  # Fallback

    try:
        with open(history_file, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            timestamps = []
            for row in reader:
                ts = row.get("Timestamp")
                users = row.get("User Count")
                if ts and ts.isdigit() and users and users.isdigit():
                    if int(users) > 0:
                        timestamps.append(int(ts))
            if timestamps:
                return max(timestamps) - min(timestamps)
    except Exception:
        pass
    return 240


def get_max_user_count(csv_prefix: str) -> int:
    """Rileva il numero massimo di utenti concorrenti raggiunti leggendo stats_history.csv."""
    history_file = Path(f"{csv_prefix}_stats_history.csv")
    if not history_file.exists():
        return 0

    try:
        with open(history_file, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            user_counts = []
            for row in reader:
                uc = row.get("User Count")
                if uc and uc.isdigit():
                    user_counts.append(int(uc))
            if user_counts:
                return max(user_counts)
    except Exception:
        pass
    return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    args = parse_args()

    # Crea la cartella csv/ se non esiste ancora
    CSV_DIR.mkdir(exist_ok=True)

    # 1. Leggi CSV
    print(f" Lettura {CSV_PREFIX}_stats.csv...")
    try:
        row = read_csv_stats(CSV_PREFIX)
    except (FileNotFoundError, ValueError) as e:
        print(e)
        sys.exit(1)

    # 2. Estrai metriche
    total_req = safe_int(row.get("Request Count", "0"))
    failures  = safe_int(row.get("Failure Count", "0"))
    avg_ms    = safe_float(row.get("Average Response Time", "0"))
    p95_ms    = safe_float(row.get("95%", "0"))
    p99_ms    = safe_float(row.get("99%", "0"))
    duration  = get_test_duration(CSV_PREFIX)
    rps       = total_req / duration if duration > 0 else 0.0
    
    max_vu    = get_max_user_count(CSV_PREFIX)
    if max_vu == 0:
        max_vu = 100 if TEST_TYPE in ("stress", "spike", "breakpoint") else (15 if TEST_TYPE == "soak" else 10)
        
    run_label = build_run_label(max_vu)

    data = {
        "run_label":        run_label,
        "scenario":         SCENARIO,
        "vus":              max_vu,
        "duration_seconds": duration,
        "total_requests":   total_req,
        "failures":         failures,
        "avg_response_ms":  avg_ms,
        "p95_response_ms":  p95_ms,
        "p99_response_ms":  p99_ms,
        "rps":              rps,
        "notes":            args.notes,
    }

    # 3. Salva su DB
    print(f" Salvataggio su: {DB_PATH}")
    try:
        run_id = save_to_db(DB_PATH, data)
    except (FileNotFoundError, sqlite3.Error) as e:
        print(f"\n Errore salvataggio: {e}")
        sys.exit(1)

    # 4. Report
    fail_rate = (failures / total_req * 100) if total_req > 0 else 0.0
    print("\n" + "=" * 60)
    print("  RISULTATI SALVATI IN load_test_runs")
    print("=" * 60)
    print(f"Run Label          : {run_label}")
    print(f"VU Massimi         : {max_vu}")
    print(f"Durata             : {duration}s")
    print(f"Richieste Totali   : {total_req}")
    print(f"Fallimenti         : {failures}  ({fail_rate:.2f}%)")
    print(f"RPS Medio          : {rps:.2f}")
    print(f"Avg Response       : {avg_ms:.0f} ms")
    print(f"P95 Response       : {p95_ms:.0f} ms")
    print(f"P99 Response       : {p99_ms:.0f} ms")
    if args.notes:
        print(f"Note               : {args.notes}")
    print("=" * 60)
    print(f"\n Inserito in load_test_runs (id: {run_id[:8]}...)\n")


if __name__ == "__main__":
    main()