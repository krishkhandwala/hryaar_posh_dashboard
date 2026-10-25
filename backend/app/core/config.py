from pydantic_settings import BaseSettings
from typing import Optional, List

class Settings(BaseSettings):
    PROJECT_NAME: str = "HRYAAR Digi-PoSH"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Secret key for JWT
    SECRET_KEY: str = "hryaar_super_secret_posh_key_2026_production_grade_99x"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Database: supports SQLite for zero-config local dev and PostgreSQL for Supabase/production
    DATABASE_URL: str = "sqlite:///./hryaar_posh.db"
    
    # Allowed CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://app.hryaar.com",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
