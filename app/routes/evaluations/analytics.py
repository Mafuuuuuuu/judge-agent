from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import sqlite3
from app.database.connection import get_db
from app.auth.dependencies import require_role      

router = APIRouter(dependencies=[Depends(require_role("admin", "analyst", "viewer"))])



@router.get("/analytics/mediascore")
def evaluations_media_score(
    from_date: Optional[str] = Query(None, description="ISO date, es. 2024-01-01"),
    to_date: Optional[str] = Query(None, description="ISO date, es. 2024-12-31"),
    db: sqlite3.Connection = Depends(get_db),
):
    query = """
        SELECT
            COUNT(*)                                AS totale_valutazioni,
            ROUND(AVG(overall_score), 2)             AS media_overall,
            ROUND(AVG(technical_score), 2)           AS media_technical,
            ROUND(AVG(completeness_score), 2)        AS media_completeness,
            ROUND(AVG(business_score), 2)            AS media_business,
            ROUND(AVG(consistency_score), 2)         AS media_consistency,
            ROUND(AVG(prompt_compliance_score), 2)   AS media_prompt_compliance,
            ROUND(AVG(helpfulness_score), 2)         AS media_helpfulness,
            ROUND(AVG(tone_score), 2)                AS media_tone,
            ROUND(AVG(hallucination_score), 2)       AS media_hallucination,
            ROUND(AVG(efficiency_score), 2)          AS media_efficiency,
            ROUND(AVG(source_reliability_score), 2)  AS media_source_reliability,
            ROUND(MIN(overall_score), 2)             AS min_overall,
            ROUND(MAX(overall_score), 2)             AS max_overall
        FROM evaluations
        WHERE 1=1
    """
    params = []

    if from_date:
        query += " AND date(created_at) >= date(?)"
        params.append(from_date)
    if to_date:
        query += " AND date(created_at) <= date(?)"
        params.append(to_date)

    row = db.execute(query, params).fetchone()
    return {
        "totale_valutazioni": row["totale_valutazioni"],
        "score_medi": {
            "overall":            row["media_overall"],
            "technical":          row["media_technical"],
            "completeness":       row["media_completeness"],
            "business":           row["media_business"],
            "consistency":        row["media_consistency"],
            "prompt_compliance":  row["media_prompt_compliance"],
            "helpfulness":        row["media_helpfulness"],
            "tone":               row["media_tone"],
            "hallucination":      row["media_hallucination"],
            "efficiency":         row["media_efficiency"],
            "source_reliability": row["media_source_reliability"],
        },
        "overall_range": {
            "min": row["min_overall"],
            "max": row["max_overall"],
        },
    }

@router.get("/analytics/list")
def evaluations_list(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    try:
        cursor.execute("""
            SELECT 
                id, log_id, technical_score, completeness_score, business_score,
                consistency_score, prompt_compliance_score, helpfulness_score, tone_score,
                hallucination_score, efficiency_score, source_reliability_score,
                overall_score, feedback, issues, created_at
            FROM evaluations
            ORDER BY created_at DESC
        """)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except sqlite3.OperationalError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Errore di struttura database. Verifica il nome della tabella o della vista. Dettaglio: {str(e)}"
        )
    
