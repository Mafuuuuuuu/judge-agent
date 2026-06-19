from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
from app.routes.insert import chatlogs as insert_chatlogs
from app.routes.insert import userchat as insert_userchat
from app.routes.insert import logs as insert_logs
from app.routes.evaluate import userchat as eval_userchat
from app.routes.evaluate import chatlogs as eval_chatlogs
from app.routes.analytics import userchat as analytics_uc
from app.routes.analytics import chatlogs as analytics_cl
from app.routes.analytics import evaluations as analytics_ev
from app.routes.delete import userchat as delete_userchat
from app.routes.delete import chatlogs as delete_chatlogs
from app.routes.delete import evaluations as delete_evaluations

from app.config.settings import (
    API_TITLE, API_VERSION, API_DESCRIPTION, CORS_ORIGINS
)

app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description=API_DESCRIPTION
)

class SanitizeBodyMiddleware:
    def __init__(self, app_asgi):
        self.app_asgi = app_asgi

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            content_type = next((v.decode("utf-8") for n, v in scope.get("headers", []) if n == b"content-type"), "")
            if content_type.startswith("application/json"):
                # Leggiamo il body grezzo completo prima che Pydantic lo validi
                body = b""
                more_body = True
                while more_body:
                    message = await receive()
                    body += message.get("body", b"")
                    more_body = message.get("more_body", False)
                
                # Puliamo i caratteri non strict e riserializziamo in modo sicuro
                try:
                    parsed = json.loads(body.decode("utf-8"), strict=False)
                    clean_body = json.dumps(parsed, ensure_ascii=False).encode("utf-8")
                except Exception:
                    clean_body = body

                # Forniamo il nuovo receive pulito alle rotte successive
                async def clean_receive():
                    return {"type": "http.request", "body": clean_body, "more_body": False}
                
                await self.app_asgi(scope, clean_receive, send)
                return
        await self.app_asgi(scope, receive, send)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Registriamo il middleware ASGI nativo per la pulizia dei body
app.add_middleware(SanitizeBodyMiddleware)


#insert
app.include_router(insert_chatlogs.router, prefix="/insert")
app.include_router(insert_userchat.router, prefix="/insert")
app.include_router(insert_logs.router, prefix="/insert")
#evaluate
app.include_router(eval_userchat.router, prefix="/evaluate")
app.include_router(eval_chatlogs.router, prefix="/evaluate")
#analytics
app.include_router(analytics_uc.router, prefix="/analytics")
app.include_router(analytics_cl.router, prefix="/analytics")
app.include_router(analytics_ev.router, prefix="/analytics")
#delete
app.include_router(delete_userchat.router, prefix="/delete")
app.include_router(delete_chatlogs.router, prefix="/delete")
app.include_router(delete_evaluations.router, prefix="/delete")


@app.get("/health")
def health():
    return {"status": "ok", "version": API_VERSION}

