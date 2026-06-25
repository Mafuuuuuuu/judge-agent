from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.routes.logs import analytics, delete

router = APIRouter(prefix="/evaluations", dependencies=[Depends(get_current_user)])
router.include_router(analytics.router)
router.include_router(delete.router)