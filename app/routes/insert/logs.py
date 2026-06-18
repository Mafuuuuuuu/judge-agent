from fastapi import APIRouter

router = APIRouter(tags=["Insert"])

@router.post("/logs")
def insert_logs():
    return {"status": "success", "message": "Endpoint log strutturato predisposto."}