# app/config/settings.py
import os
from dotenv import load_dotenv
from openai import OpenAI  # <--- AGGIUNTO IMPORT

load_dotenv()

# --- API ---
API_TITLE = "PlatformHero Agent Auditor API"
API_VERSION = "1.2.0"
API_DESCRIPTION = "AI Quality Intelligence Layer for PlatformHero"

# --- CORS ---
CORS_ORIGINS = [os.getenv("CORS_ORIGINS", "http://localhost:4200")]

# --- Database ---
DB_PATH = os.getenv("DB_PATH", "data/platformhero_mirror.db")

# --- PlatformHero Cloud ---
API_KEY_REMOTA = os.getenv("PLATFORMHERO_TOKEN")
BASE_URL = os.getenv("BASE_URL", "https://api.platformhero.ai/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "TpwgLXbi")

# --- Server ---
PORT = int(os.getenv("PORT", 8000))

client_openai = OpenAI(
    base_url=BASE_URL,
    api_key=API_KEY_REMOTA
)