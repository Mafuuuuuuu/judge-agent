from fastapi import APIRouter

router = APIRouter()

@router.post("/insert")
def insert_logs():
    return {"status": "success", "message": "Endpoint log strutturato predisposto."}