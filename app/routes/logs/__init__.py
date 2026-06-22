from fastapi import APIRouter
from app.routes.chatlogs import insert

router = APIRouter(prefix="/logs")
router.include_router(insert.router)