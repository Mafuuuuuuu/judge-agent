from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import API_TITLE, API_VERSION, API_DESCRIPTION, CORS_ORIGINS, PORT
from app.utils.middleware import SanitizeBodyMiddleware, RequestIdMiddleware
from app.database import database_lifespan
from app.utils import configure_limiter, configure_logging
from app.routes import api_router

configure_logging()

app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description=API_DESCRIPTION,
    lifespan=database_lifespan,
    swagger_ui_parameters={"persistAuthorization": True},
)

configure_limiter(app)

app.add_middleware(SanitizeBodyMiddleware)
app.add_middleware(CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Outermost: si esegue per prima su ogni request, imposta il request_id per tutti i log
app.add_middleware(RequestIdMiddleware)

app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok", "version": API_VERSION}


if __name__ == "__main__":
    from app.utils import start_server
    start_server()
