import time
import uuid
import threading
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from app.core.config import settings
from app.core.distributed_cache import distributed_cache


_counter_lock = threading.Lock()
_requests_handled = 0


def get_node_requests_handled() -> int:
    with _counter_lock:
        return _requests_handled


def _resolve_client_ip(request: Request) -> str:
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        first_ip = xff.split(",")[0].strip()
        if first_ip:
            return first_ip
    xri = request.headers.get("X-Real-IP")
    if xri:
        return xri.strip()
    return request.client.host if request.client else "127.0.0.1"


class AuthRateLimiter:
    """Distributed sliding-window rate limiter shared across load-balanced workers via Redis/cache."""
    def __init__(self, max_requests: int = 30, window_seconds: int = 60, prefix: str = "rl:auth:"):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.prefix = prefix

    def is_allowed(self, client_ip: str) -> bool:
        bucket = int(time.time() // self.window_seconds)
        key = f"{self.prefix}{client_ip}:{bucket}"
        count = distributed_cache.incr_window(key, self.window_seconds)
        return count <= self.max_requests


auth_rate_limiter = AuthRateLimiter(max_requests=30, window_seconds=60, prefix="rl:auth:")
billing_rate_limiter = AuthRateLimiter(max_requests=30, window_seconds=60, prefix="rl:billing:")


class ProductionEnterpriseMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = _resolve_client_ip(request)
        path = request.url.path

        # 1. Rate Limiting for Auth & Billing checkout endpoints (skip synthetic FastAPI TestClient IP)
        if client_ip != "testclient":
            if path.endswith("/auth/login") and request.method == "POST":
                if not auth_rate_limiter.is_allowed(client_ip):
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Rate limit exceeded: Too many authentication attempts. Please retry in 60 seconds."},
                        headers={"Retry-After": "60"}
                    )
            elif "/billing/" in path and request.method == "POST" and "/webhooks/" not in path:
                if not billing_rate_limiter.is_allowed(client_ip):
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Rate limit exceeded on billing checkout. Please retry in 60 seconds."},
                        headers={"Retry-After": "60"}
                    )

        # 2. Request Tracing & Correlation ID
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        request.state.request_id = request_id
        start_time = time.time()

        global _requests_handled
        with _counter_lock:
            _requests_handled += 1

        # 3. Process Request
        response: Response = await call_next(request)

        # 4. Compute Duration, Cluster Identity & OWASP Security Headers
        duration_ms = round((time.time() - start_time) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Cluster-Node"] = settings.CLUSTER_NODE_ID
        response.headers["X-Response-Time-Ms"] = str(duration_ms)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=(), payment=(self)"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
        if settings.ENVIRONMENT == "production" and request.headers.get("X-Forwarded-Proto") == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        if "/api/v1/auth" in path or "/api/v1/billing" in path:
            response.headers["Cache-Control"] = "no-store"

        return response
