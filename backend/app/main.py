from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.auth import router as auth_router
from app.api.v1.endpoints import router as api_router
from app.db.seed import init_db

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Multi-Tenant PoSH Training Management API for HRYAAR"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # local dev & staging
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(api_router, prefix=f"{settings.API_V1_STR}", tags=["Multi-Tenant PoSH Dashboard"])

@app.get("/health")
def health_check():
    return {"status": "ok", "app": "HRYAAR Digi-PoSH", "version": settings.VERSION}
