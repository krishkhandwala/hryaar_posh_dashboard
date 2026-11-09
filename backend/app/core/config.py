import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional, List

class Settings(BaseSettings):
    PROJECT_NAME: str = "HRYAAR Digi-PoSH Multi-Tenant SaaS"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Secret key for JWT
    SECRET_KEY: str = "hryaar_super_secret_posh_key_2026_production_grade_99x"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Database: supports SQLite for zero-config local dev and PostgreSQL for Supabase/production
    DATABASE_URL: str = "sqlite:///./hryaar_posh.db"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 30
    DB_POOL_RECYCLE: int = 1800
    DB_POOL_TIMEOUT: int = 30
    
    # Tier 2 & Tier 3 Distributed Systems Configuration
    REDIS_URL: Optional[str] = "redis://localhost:6379/0"
    ENABLE_DISTRIBUTED_CACHE: bool = True
    CLUSTER_NODE_ID: str = os.getenv("CLUSTER_NODE_ID", "api-worker-alpha-1")
    WORKER_CONCURRENCY: int = 8
    
    # Distributed Object Storage (Local FS / MinIO / S3)
    STORAGE_PROVIDER: str = "LOCAL" # 'LOCAL' or 'S3'
    S3_ENDPOINT: Optional[str] = None
    S3_BUCKET: str = "posh-documents"
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    
    # Uploads directory
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "uploads")
    
    # Allowed CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://app.hryaar.com",
    ]

    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="allow"
    )

settings = Settings()
