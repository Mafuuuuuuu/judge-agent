import logging
from contextvars import ContextVar

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.utils.limiter import limiter

# ContextVar che trasporta il request ID attraverso l'intera call stack asincrona
_request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


class _RequestIdFilter(logging.Filter):
    """Inietta il request_id corrente in ogni log record."""
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = _request_id_var.get()
        return True


def configure_limiter(app):
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


def start_server():
    import uvicorn
    from app.config.settings import PORT
    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=False)


def configure_logging():
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(
        "%(asctime)s %(levelname)s [%(request_id)s] %(name)s — %(message)s"
    ))
    handler.addFilter(_RequestIdFilter())
    root = logging.getLogger()
    if not root.handlers:
        root.setLevel(logging.INFO)
        root.addHandler(handler)


if __name__ == "__main__":
    from app.utils import start_server
    start_server()
