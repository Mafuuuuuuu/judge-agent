import os
from slowapi import Limiter
from slowapi.util import get_remote_address

# Consente di disabilitare il rate limit per i test di carico (es. Locust) tramite variabile d'ambiente
disable_rate_limit = os.getenv("DISABLE_RATE_LIMIT", "false").lower() == "true"

limiter = Limiter(
    key_func=get_remote_address,
    enabled=not disable_rate_limit
)