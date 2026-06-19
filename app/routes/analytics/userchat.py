from fastapi import APIRouter, Depends, Query
from typing import Optional
import sqlite3
from app.database.connection import get_db

router = APIRouter(tags=["Analytics - UserChat"])


@router.get("/userchat/totals")
def userchat_totals(
    from_date: Optional[str] = Query(None, description="ISO date, es. 2024-01-01"),
    to_date: Optional[str] = Query(None, description="ISO date, es. 2024-12-31"),
    db: sqlite3.Connection = Depends(get_db),
):
    query = "SELECT COUNT(*) as totale FROM user_chats WHERE 1=1"
    params = []

    if from_date:
        query += " AND date(created_at) >= date(?)"
        params.append(from_date)
    if to_date:
        query += " AND date(created_at) <= date(?)"
        params.append(to_date)

    row = db.execute(query, params).fetchone()
    return {"totale_conversazioni": row["totale"]}


@router.get("/userchat/mediamessaggi")
def userchat_media_messaggi(db: sqlite3.Connection = Depends(get_db)):
    query = """
        SELECT
            ROUND(AVG(message_count), 2) AS media,
            MIN(message_count)           AS minimo,
            MAX(message_count)           AS massimo,
            SUM(message_count)           AS totale_messaggi
        FROM user_chats
    """
    row = db.execute(query).fetchone()
    return {
        "media_messaggi_per_chat": row["media"],
        "minimo": row["minimo"],
        "massimo": row["massimo"],
        "totale_messaggi": row["totale_messaggi"],
    }


@router.get("/userchat/distribuzionesystemprompt")
def userchat_distribuzione_system_prompt(db: sqlite3.Connection = Depends(get_db)):
    query = """
        SELECT
            COALESCE(system_prompt, '__nessuno__') AS system_prompt,
            COUNT(*)                               AS totale,
            ROUND(AVG(message_count), 2)           AS media_messaggi
        FROM user_chats
        GROUP BY system_prompt
        ORDER BY totale DESC
    """
    rows = db.execute(query).fetchall()
    return {
        "distribuzione": [dict(r) for r in rows],
        "totale_prompt_distinti": len(rows),
    }


@router.get("/userchat/trend")
def userchat_trend(
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
        FROM user_chats
        WHERE 1=1
    """
    params = []

    if from_date:
        query += " AND created_at >= ?"
        params.append(from_date)
    if to_date:
        query += " AND created_at <= ?"
        params.append(to_date)

    query += " GROUP BY periodo ORDER BY periodo ASC"
    rows = db.execute(query, params).fetchall()
    return {
        "granularity": granularity,
        "trend": [dict(r) for r in rows],
    }


@router.get("/userchat/topchat")
def userchat_top_chat(
    limit: int = Query(10, ge=1, le=100),
    db: sqlite3.Connection = Depends(get_db),
):
    query = """
        SELECT id, system_prompt, message_count, created_at
        FROM user_chats
        ORDER BY message_count DESC
        LIMIT ?
    """
    rows = db.execute(query, [limit]).fetchall()
    return {
        "top_n": limit,
        "risultati": [dict(r) for r in rows],
    }

@router.get("/userchat/list")
def userchat_list(
    limit: int = Query(100, ge=1, le=1000, description="Numero massimo di righe (default 100)"),
    offset: int = Query(0, ge=0, description="Offset per paginazione"),
    db: sqlite3.Connection = Depends(get_db),
):
    total = db.execute("SELECT COUNT(*) as totale FROM user_chats").fetchone()["totale"]
    rows = db.execute(
        "SELECT id, system_prompt, messages_json, message_count, created_at FROM user_chats ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [limit, offset]
    ).fetchall()
    return {
        "totale": total,
        "limit": limit,
        "offset": offset,
        "risultati": [dict(r) for r in rows],
    }


@router.get("/userchat/summary")
def userchat_summary(
    limit_top: int = Query(5, ge=1, le=50),
    db: sqlite3.Connection = Depends(get_db),
):
    totals_row = db.execute("SELECT COUNT(*) as totale FROM user_chats").fetchone()

    media_row = db.execute("""
        SELECT
            ROUND(AVG(message_count), 2) AS media,
            MIN(message_count)           AS minimo,
            MAX(message_count)           AS massimo,
            SUM(message_count)           AS totale_messaggi
        FROM user_chats
    """).fetchone()

    distribuzione_rows = db.execute("""
        SELECT
            COALESCE(system_prompt, '__nessuno__') AS system_prompt,
            COUNT(*)                               AS totale,
            ROUND(AVG(message_count), 2)           AS media_messaggi
        FROM user_chats
        GROUP BY system_prompt
        ORDER BY totale DESC
    """).fetchall()

    trend_rows = db.execute("""
        SELECT
            strftime('%Y-%m-%d', created_at) AS periodo,
            COUNT(*)                          AS totale_chat,
            ROUND(AVG(message_count), 2)      AS media_messaggi
        FROM user_chats
        GROUP BY periodo ORDER BY periodo ASC
    """).fetchall()

    top_rows = db.execute("""
        SELECT id, system_prompt, message_count, created_at
        FROM user_chats
        ORDER BY message_count DESC
        LIMIT ?
    """, [limit_top]).fetchall()

    # --- Evaluations collegate (JOIN su evaluations.log_id = user_chats.id) ---
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
        INNER JOIN user_chats u ON e.log_id = u.id
    """).fetchone()

    totale_chat = totals_row["totale"]
    totale_valutate = eval_row["totale_valutate"] or 0
    percentuale_valutate = round((totale_valutate / totale_chat) * 100, 1) if totale_chat else 0.0

    return {
        "totale_conversazioni": totale_chat,
        "media_messaggi": {
            "media": media_row["media"],
            "minimo": media_row["minimo"],
            "massimo": media_row["massimo"],
            "totale_messaggi": media_row["totale_messaggi"],
        },
        "distribuzione_system_prompt": [dict(r) for r in distribuzione_rows],
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