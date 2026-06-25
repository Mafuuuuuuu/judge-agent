from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import sqlite3
from app.auth.dependencies import require_role
from app.database.connection import get_db

router = APIRouter(dependencies=[Depends(require_role("admin", "analyst", "viewer"))])


@router.get("/analytics/totals")
def chatlogs_totals(
    from_date: Optional[str] = Query(None, description="ISO date, es. 2024-01-01"),
    to_date: Optional[str] = Query(None, description="ISO date, es. 2024-12-31"),
    db: sqlite3.Connection = Depends(get_db),
):
    query = "SELECT COUNT(*) as totale FROM chat_logs WHERE 1=1"
    params = []

    if from_date:
        query += " AND date(created_at) >= date(?)"
        params.append(from_date)
    if to_date:
        query += " AND date(created_at) <= date(?)"
        params.append(to_date)

    row = db.execute(query, params).fetchone()
    return {"totale_chat_logs": row["totale"]}


@router.get("/analytics/mediamessaggi")
def chatlogs_media_messaggi(db: sqlite3.Connection = Depends(get_db)):
    query = """
        SELECT
            ROUND(AVG(message_count), 2) AS media,
            MIN(message_count)           AS minimo,
            MAX(message_count)           AS massimo,
            SUM(message_count)           AS totale_messaggi
        FROM chat_logs
    """
    row = db.execute(query).fetchone()
    return {
        "media_messaggi_per_chat": row["media"],
        "minimo": row["minimo"],
        "massimo": row["massimo"],
        "totale_messaggi": row["totale_messaggi"],
    }


@router.get("/analytics/distribuzioneassistant")
def chatlogs_distribuzione_assistant(db: sqlite3.Connection = Depends(get_db)):
    query = """
        SELECT
            COALESCE(assistant_id, '__nessuno__') AS assistant_id,
            COUNT(*)                              AS totale_chat,
            ROUND(AVG(message_count), 2)          AS media_messaggi,
            SUM(message_count)                    AS totale_messaggi
        FROM chat_logs
        GROUP BY assistant_id
        ORDER BY totale_chat DESC
    """
    rows = db.execute(query).fetchall()
    return {
        "distribuzione": [dict(r) for r in rows],
        "totale_assistant_distinti": len(rows),
    }


@router.get("/analytics/trend")
def chatlogs_trend(
    granularity: str = Query("day", enum=["day", "week", "month"]),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: sqlite3.Connection = Depends(get_db),
):
    format_map = {
        "day":   "%Y-%m-%d",
        "week":  "%Y-W%W",
        "month": "%Y-%m",
    }
    fmt = format_map[granularity]

    query = f"""
        SELECT
            strftime('{fmt}', created_at) AS periodo,
            COUNT(*)                       AS totale_chat,
            ROUND(AVG(message_count), 2)   AS media_messaggi
        FROM chat_logs
        WHERE 1=1
    """
    params = []

    if from_date:
        query += " AND date(created_at) >= date(?)"
        params.append(from_date)
    if to_date:
        query += " AND date(created_at) <= date(?)"
        params.append(to_date)

    query += " GROUP BY periodo ORDER BY periodo ASC"
    rows = db.execute(query, params).fetchall()
    return {
        "granularity": granularity,
        "trend": [dict(r) for r in rows],
    }


@router.get("/analytics/topchat")
def chatlogs_top_chat(
    limit: int = Query(10, ge=1, le=100),
    db: sqlite3.Connection = Depends(get_db),
):
    query = """
        SELECT
            id,
            assistant_id,
            chat_id,
            message_count,
            created_at
        FROM chat_logs
        ORDER BY message_count DESC
        LIMIT ?
    """
    rows = db.execute(query, [limit]).fetchall()
    return {
        "top_n": limit,
        "risultati": [dict(r) for r in rows],
    }

@router.get("/analytics/list")
def chatlogs_list(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    try:
        cursor.execute("""
            SELECT 
                id, assistant_id, chat_id, message_count, messages_json, created_at
            FROM chat_logs
            ORDER BY created_at DESC
        """)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Errore tabella chat_logs. Dettaglio: {str(e)}")
    

@router.get("/analytics/summary")
def chatlogs_summary(
    limit_top: int = Query(5, ge=1, le=50),
    db: sqlite3.Connection = Depends(get_db),
):
    totals_row = db.execute("SELECT COUNT(*) as totale FROM chat_logs").fetchone()

    media_row = db.execute("""
        SELECT
            ROUND(AVG(message_count), 2) AS media,
            MIN(message_count)           AS minimo,
            MAX(message_count)           AS massimo,
            SUM(message_count)           AS totale_messaggi
        FROM chat_logs
    """).fetchone()

    distribuzione_rows = db.execute("""
        SELECT
            COALESCE(assistant_id, '__nessuno__') AS assistant_id,
            COUNT(*)                              AS totale_chat,
            ROUND(AVG(message_count), 2)          AS media_messaggi,
            SUM(message_count)                    AS totale_messaggi
        FROM chat_logs
        GROUP BY assistant_id
        ORDER BY totale_chat DESC
    """).fetchall()

    trend_rows = db.execute("""
        SELECT
            strftime('%Y-%m-%d', created_at) AS periodo,
            COUNT(*)                          AS totale_chat,
            ROUND(AVG(message_count), 2)      AS media_messaggi
        FROM chat_logs
        GROUP BY periodo ORDER BY periodo ASC
    """).fetchall()

    top_rows = db.execute("""
        SELECT id, assistant_id, chat_id, message_count, created_at
        FROM chat_logs
        ORDER BY message_count DESC
        LIMIT ?
    """, [limit_top]).fetchall()

    #  Evaluations collegate (JOIN su evaluations.log_id = chat_logs.id) 
    eval_row = db.execute("""
        SELECT
            COUNT(*)                                AS totale_valutate,
            ROUND(AVG(e.overall_score), 2)           AS media_overall,
            ROUND(AVG(e.technical_score), 2)         AS media_technical,
            ROUND(AVG(e.completeness_score), 2)      AS media_completeness,
            ROUND(AVG(e.business_score), 2)          AS media_business,
            ROUND(AVG(e.consistency_score), 2)       AS media_consistency,
            ROUND(AVG(e.helpfulness_score), 2)       AS media_helpfulness,
            ROUND(AVG(e.tone_score), 2)              AS media_tone,
            ROUND(AVG(e.hallucination_score), 2)     AS media_hallucination,
            ROUND(AVG(e.efficiency_score), 2)        AS media_efficiency,
            ROUND(AVG(e.source_reliability_score), 2) AS media_source_reliability
        FROM evaluations e
        INNER JOIN chat_logs c ON e.log_id = c.id
    """).fetchone()

    totale_chat = totals_row["totale"]
    totale_valutate = eval_row["totale_valutate"] or 0
    percentuale_valutate = round((totale_valutate / totale_chat) * 100, 1) if totale_chat else 0.0

    return {
        "totale_chat_logs": totale_chat,
        "media_messaggi": {
            "media": media_row["media"],
            "minimo": media_row["minimo"],
            "massimo": media_row["massimo"],
            "totale_messaggi": media_row["totale_messaggi"],
        },
        "distribuzione_assistant": [dict(r) for r in distribuzione_rows],
        "trend_giornaliero": [dict(r) for r in trend_rows],
        "top_chat": [dict(r) for r in top_rows],
        "evaluations": {
            "totale_valutate": totale_valutate,
            "percentuale_valutate": percentuale_valutate,
            "score_medi": {
                "overall":            eval_row["media_overall"],
                "technical":          eval_row["media_technical"],
                "completeness":       eval_row["media_completeness"],
                "business":           eval_row["media_business"],
                "consistency":        eval_row["media_consistency"],
                "helpfulness":        eval_row["media_helpfulness"],
                "tone":               eval_row["media_tone"],
                "hallucination":      eval_row["media_hallucination"],
                "efficiency":         eval_row["media_efficiency"],
                "source_reliability": eval_row["media_source_reliability"],
            }
        }
    }