from fastapi import APIRouter
from app.routes.chatlogs import insert, evaluate, analytics, delete

router = APIRouter(prefix="/evaluations")
router.include_router(insert.router)
router.include_router(evaluate.router)
router.include_router(analytics.router)
router.include_router(delete.router)