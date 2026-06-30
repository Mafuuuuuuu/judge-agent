import os
from dotenv import load_dotenv
from openai import OpenAI  

load_dotenv()

API_TITLE = "PlatformHero Agent Auditor API"
API_VERSION = "1.2.0"
API_DESCRIPTION = "AI Quality Intelligence Layer for PlatformHero"

# CORS_ORIGINS è una lista separata da virgole, es: "http://localhost:4200,https://app.example.com"
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

DB_PATH = os.getenv("DB_PATH")

API_KEY_REMOTA = os.getenv("TOKEN")
BASE_URL = os.getenv("PLATFORMHERO_URL")
PLATFORMHERO_API_URL = os.getenv("PLATFORMHERO_API_URL", "https://api.platformhero.ai/v1")
MODEL_NAME = os.getenv("MODEL_NAME")

PORT = int(os.getenv("PORT", "8000"))

client_openai = OpenAI(
    base_url=BASE_URL,
    api_key=API_KEY_REMOTA
)

JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY")
JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

# Validazione esplicita all'avvio: meglio un errore chiaro qui che un crash oscuro a runtime
_required = {"DB_PATH": DB_PATH, "JWT_SECRET_KEY": JWT_SECRET_KEY}
_missing = [name for name, value in _required.items() if not value]
if _missing:
    raise RuntimeError(
        f"Variabili d'ambiente obbligatorie mancanti: {', '.join(_missing)}. "
        "Controlla il tuo file .env (vedi '.env .example')."
    )
