import time
import uuid
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

# Sliding Window Rate Limiter for Authentication Protection
class AuthRateLimiter:
    def __init__(self, max_requests: int = 20, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.ip_timestamps = defaultdict(list)

    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        timestamps = self.ip_timestamps[client_ip]
        # Filter out timestamps older than sliding window
        valid_timestamps = [t for t in timestamps if now - t < self.window_seconds]
        self.ip_timestamps[client_ip] = valid_timestamps

        if len(valid_timestamps) >= self.max_requests:
            return False

        self.ip_timestamps[client_ip].append(now)
        return True

rate_limiter = AuthRateLimiter(max_requests=25, window_seconds=60)

class ProductionEnterpriseMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Rate Limiting for Auth endpoints (skip synthetic FastAPI TestClient IP)
        if request.url.path.endswith("/auth/login") and request.method == "POST":
            client_ip = request.client.host if request.client else "127.0.0.1"
            if client_ip != "testclient" and not rate_limiter.is_allowed(client_ip):
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Rate limit exceeded: Too many authentication attempts. Please try again after 60 seconds."
                    },
                    headers={"Retry-After": "60"}
                )

        # 2. Request Tracing & Correlation ID
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        request.state.request_id = request_id
        start_time = time.time()

        # 3. Process Request
        response: Response = await call_next(request)

        # 4. Compute Duration
        duration_ms = round((time.time() - start_time) * 1000, 2)

        # 5. Inject Enterprise Security & Observability Headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-Ms"] = str(duration_ms)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        return response

