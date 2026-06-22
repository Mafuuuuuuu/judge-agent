# app/utils/middleware.py
import json


class SanitizeBodyMiddleware:
    def __init__(self, app):
        self.app_asgi = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            content_type = next(
                (v.decode("utf-8") for n, v in scope.get("headers", []) if n == b"content-type"),
                ""
            )
            if content_type.startswith("application/json"):
                body = b""
                more_body = True
                while more_body:
                    message = await receive()
                    body += message.get("body", b"")
                    more_body = message.get("more_body", False)

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