import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from app.core.config import settings
from app.core.distributed_cache import distributed_cache
from app.core.middleware import ProductionEnterpriseMiddleware
from app.db.session import SessionLocal
from app.api.v1.auth import router as auth_router
from app.api.v1.endpoints import router as api_router
from app.api.v1.super_admin import router as super_admin_router
from app.api.v1.company import router as company_router
from app.api.v1.training import router as training_router
from app.api.v1.cluster import router as cluster_router, publish_node_heartbeat
from app.api.v1.partner import router as partner_router
from app.api.v1.learner import router as learner_router
from app.api.v1.billing import router as billing_router
from app.db.seed import init_db
from app.db.migrate import run_migrations

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure uploads directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    if settings.SEED_DEMO_DATA:
        init_db()
    else:
        run_migrations()
    publish_node_heartbeat()
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
    allow_origins=settings.BACKEND_CORS_ORIGINS,
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
app.include_router(billing_router, prefix=f"{settings.API_V1_STR}/billing", tags=["Billing, Checkout & Invoices"])
app.include_router(cluster_router, prefix=f"{settings.API_V1_STR}/cluster", tags=["3-Tier Distributed Architecture & Telemetry"])
app.include_router(api_router, prefix=f"{settings.API_V1_STR}", tags=["Multi-Tenant PoSH Dashboard"])

@app.get("/health")
def health_check():
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database readiness check failed: {exc}")
    finally:
        db.close()

    publish_node_heartbeat()
    return {
        "status": "ok",
        "app": "HRYAAR Digi-PoSH Multi-Tenant SaaS",
        "version": settings.VERSION,
        "mode": "production-ready",
        "database": db_status,
        "cache_backend": distributed_cache.backend_type,
        "node_id": settings.CLUSTER_NODE_ID,
    }


@app.get("/health/live")
def liveness_probe():
    """Fast process liveness probe for load balancers (no DB query)."""
    return {"status": "alive", "node_id": settings.CLUSTER_NODE_ID}


@app.get("/health/ready")
def readiness_probe():
    """Deep readiness probe checking PostgreSQL connectivity and schema integrity."""
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        db.execute(text("SELECT COUNT(*) FROM users"))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Readiness failed: {exc}")
    finally:
        db.close()
    publish_node_heartbeat()
    return {
        "status": "ready",
        "database": "postgresql" if "postgresql" in settings.DATABASE_URL else "sqlite",
        "cache_backend": distributed_cache.backend_type,
        "node_id": settings.CLUSTER_NODE_ID,
    }
