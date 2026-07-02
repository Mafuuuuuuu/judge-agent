import json
import uuid
import logging
from datetime import datetime, timezone
from app.core.judge_prompt import build_judge_prompt, KPI_LIST

logger = logging.getLogger(__name__)


def valuta_chat_con_LLM(client_ai, model_name: str, chat_content: str, system_prompt_agente: str = "") -> str:
    prompt = build_judge_prompt(chat_content, system_prompt_agente)
    response = client_ai.chat.completions.create(
        model=model_name,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        max_tokens=2000,
        stream=False,
    )
    return response.choices[0].message.content


def ricalcola_overall_score(dati: dict) -> dict:
    """Ricalcola overall_score come media aritmetica dei KPI presenti, sovrascrivendo il valore dell'LLM."""
    voti_validi = []
    for k in KPI_LIST:
        v = dati.get(k)
        if v is not None and v != "":
            try:
                voti_validi.append(float(v))
            except (ValueError, TypeError):
                pass
    dati["overall_score"] = round(sum(voti_validi) / len(voti_validi), 1) if voti_validi else 0.0
    return dati


def _norm_score(value) -> float | None:
    """Normalizza uno score dell'LLM: float nel range 0-10, altrimenti None.

    SQLite non applica type check sulle colonne: senza questa guardia una
    risposta malformata del Judge (stringhe, valori fuori scala) finirebbe
    in tabella cosi' com'e' e inquinerebbe le medie delle analytics.
    """
    if value is None or value == "":
        return None
    try:
        v = float(value)
    except (ValueError, TypeError):
        return None
    return v if 0.0 <= v <= 10.0 else None


def salva_valutazione_db(conn, log_id: str, risposta_json_str: str) -> str | None:
    try:
        dati = json.loads(risposta_json_str)
    except Exception:
        logger.exception("Errore parsing JSON risposta AI Judge (log_id=%s)", log_id)
        return None

    internal_eval_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO evaluations (
            id, log_id, overall_score, technical_score, completeness_score,
            business_score, consistency_score, prompt_compliance_score,
            helpfulness_score, tone_score, hallucination_score,
            efficiency_score, source_reliability_score,
            feedback, issues, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        internal_eval_id, log_id,
        _norm_score(dati.get("overall_score")), _norm_score(dati.get("technical_score")),
        _norm_score(dati.get("completeness_score")), _norm_score(dati.get("business_score")),
        _norm_score(dati.get("consistency_score")), _norm_score(dati.get("prompt_compliance_score")),
        _norm_score(dati.get("helpfulness_score")), _norm_score(dati.get("tone_score")),
        _norm_score(dati.get("hallucination_score")), _norm_score(dati.get("efficiency_score")),
        _norm_score(dati.get("source_reliability_score")),
        dati.get("feedback"), dati.get("issues"), created_at,
    ))
    conn.commit()
    logger.info("Valutazione salvata — log_id=%s overall=%.1f", log_id, dati.get("overall_score", 0))
    return internal_eval_id
