from fastapi import APIRouter, Depends

from app.auth.dependencies import require_role

router = APIRouter(dependencies=[Depends(require_role("admin", "analyst"))])


@router.post("/insert")
def insert_logs():
    return {"status": "success", "message": "Endpoint log strutturato predisposto."}