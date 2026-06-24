from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import API_TITLE, API_VERSION, API_DESCRIPTION, CORS_ORIGINS
from app.utils.middleware import SanitizeBodyMiddleware
from app.database import database_lifespan

# Importiamo direttamente il router 
from app.routes import api_router

app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description=API_DESCRIPTION,
    lifespan=database_lifespan,
    swagger_ui_parameters={"persistAuthorization": True}
)

# Middleware per pulizia del body
app.add_middleware(SanitizeBodyMiddleware)

#  Configurazione CORS per Angular
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#  Registrazione del router dei dominii
app.include_router(api_router)

@app.get("/health")
def health():
    return {"status": "ok", "version": API_VERSION}
