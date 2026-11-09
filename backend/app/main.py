import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.middleware import ProductionEnterpriseMiddleware
from app.api.v1.auth import router as auth_router
from app.api.v1.endpoints import router as api_router
from app.api.v1.super_admin import router as super_admin_router
from app.api.v1.company import router as company_router
from app.api.v1.training import router as training_router
from app.api.v1.cluster import router as cluster_router
from app.api.v1.partner import router as partner_router
from app.api.v1.learner import router as learner_router
from app.db.seed import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure uploads directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise Multi-Tenant PoSH Management SaaS Platform for HRYAAR",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enterprise Observability & Security Middleware
app.add_middleware(ProductionEnterpriseMiddleware)

# Serve uploaded static assets (logos, files)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication & Session"])
app.include_router(super_admin_router, prefix=f"{settings.API_V1_STR}/super-admin", tags=["Super Admin Platform Governance"])
app.include_router(company_router, prefix=f"{settings.API_V1_STR}/company", tags=["Company Admin & Branding"])
app.include_router(partner_router, prefix=f"{settings.API_V1_STR}/partner", tags=["Middleman Partner Management"])
app.include_router(training_router, prefix=f"{settings.API_V1_STR}/training", tags=["Statutory Training & Certification"])
app.include_router(learner_router, prefix=f"{settings.API_V1_STR}/learner", tags=["Employee Learner Portal & Curriculum"])
app.include_router(cluster_router, prefix=f"{settings.API_V1_STR}/cluster", tags=["3-Tier Distributed Architecture & Telemetry"])
app.include_router(api_router, prefix=f"{settings.API_V1_STR}", tags=["Multi-Tenant PoSH Dashboard"])

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "app": "HRYAAR Digi-PoSH Multi-Tenant SaaS",
        "version": settings.VERSION,
        "mode": "production-ready"
    }
