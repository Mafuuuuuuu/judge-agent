import os
from dotenv import load_dotenv
from openai import OpenAI  

load_dotenv()

API_TITLE = "PlatformHero Agent Auditor API"
API_VERSION = "1.2.0"
API_DESCRIPTION = "AI Quality Intelligence Layer for PlatformHero"

CORS_ORIGINS = os.getenv("CORS_ORIGINS")

DB_PATH = os.getenv("DB_PATH", "data/platformhero_mirror.db")

API_KEY_REMOTA = os.getenv("TOKEN")
BASE_URL = os.getenv("PLATFORMHERO_URL")
MODEL_NAME = os.getenv("MODEL_NAME")

PORT = int(os.getenv("PORT"))

client_openai = OpenAI(
    base_url=BASE_URL,
    api_key=API_KEY_REMOTA
)
