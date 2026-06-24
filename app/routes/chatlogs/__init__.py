from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.routes.chatlogs import insert, evaluate, analytics, delete

router = APIRouter(prefix="/chatlogs", dependencies=[Depends(get_current_user)])
router.include_router(insert.router)
router.include_router(evaluate.router)
router.include_router(analytics.router)
router.include_router(delete.router)