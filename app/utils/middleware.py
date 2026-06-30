import json
import logging
import uuid

from starlette.responses import JSONResponse

from app.utils import _request_id_var

logger = logging.getLogger(__name__)

MAX_BODY_SIZE = 1_048_576  # 1 MB


class RequestIdMiddleware:
    """Assegna un ID univoco a ogni request, lo propaga nei log e lo aggiunge alla response (X-Request-ID)."""

    def __init__(self, app):
        self.app_asgi = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app_asgi(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        request_id = headers.get(b"x-request-id", b"").decode() or uuid.uuid4().hex[:8]
        token = _request_id_var.set(request_id)

        logger.info("→ %s %s", scope.get("method", ""), scope.get("path", ""))

        async def send_with_id(message):
            if message["type"] == "http.response.start":
                hdrs = list(message.get("headers", []))
                hdrs.append((b"x-request-id", request_id.encode()))
                message = {**message, "headers": hdrs}
            await send(message)

        try:
            await self.app_asgi(scope, receive, send_with_id)
        finally:
            _request_id_var.reset(token)


class SanitizeBodyMiddleware:
    def __init__(self, app):
        self.app_asgi = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            content_type = next(
                (v.decode("utf-8") for n, v in scope.get("headers", []) if n == b"content-type"),
                "",
            )
            if content_type.startswith("application/json"):
                body = b""
                more_body = True
                while more_body:
                    message = await receive()
                    body += message.get("body", b"")
                    more_body = message.get("more_body", False)
                    if len(body) > MAX_BODY_SIZE:
                        logger.warning("Payload JSON troppo grande (>%d bytes), rifiutato.", MAX_BODY_SIZE)
                        response = JSONResponse(
                            {"detail": "Payload troppo grande (max 1 MB)"},
                            status_code=413,
                        )
                        await response(scope, receive, send)
                        return

                try:
                    parsed = json.loads(body.decode("utf-8"), strict=False)
                    clean_body = json.dumps(parsed, ensure_ascii=False).encode("utf-8")
                except Exception:
                    clean_body = body

                async def clean_receive():
                    return {"type": "http.request", "body": clean_body, "more_body": False}

                await self.app_asgi(scope, clean_receive, send)
                return

        await self.app_asgi(scope, receive, send)
