from fastapi import APIRouter
# Importiamo i router esposti dagli __init__.py di ogni cartella
from app.routes.userchat import router as userchat_router
from app.routes.chatlogs import router as chatlogs_router
# Quando creerai gli altri domini ti basterà aggiungerli qui sotto:
from app.routes.evaluations import router as evaluations_router
from app.routes.logs import router as logs_router
from app.auth import router as auth_router

# Creiamo l'unico router principale per le API
api_router = APIRouter(prefix="/api")

# Pubblico — nessun Depends
api_router.include_router(auth_router)

# Includiamo i router dei singoli domini
api_router.include_router(userchat_router)
api_router.include_router(chatlogs_router)
api_router.include_router(evaluations_router)
api_router.include_router(logs_router)