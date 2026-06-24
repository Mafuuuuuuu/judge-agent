from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.routes.logs import insert

router = APIRouter(prefix="/logs", dependencies=[Depends(get_current_user)])
router.include_router(insert.router)