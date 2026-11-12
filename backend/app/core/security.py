import hashlib
import uuid
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Any, Union
from jose import jwt
from app.core.config import settings

LEGACY_SHA256_SALT = "hryaar_posh_salt_secure_2026"


def create_access_token(
    subject: Union[str, Any],
    company_id: Optional[str] = None,
    role: str = "COMPANY_ADMIN",
    expires_delta: Optional[timedelta] = None,
    jti: Optional[str] = None,
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    token_jti = jti or str(uuid.uuid4())
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "company_id": company_id,
        "role": role,
        "jti": token_jti,
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def get_password_hash(password: str) -> str:
    """
    Hashes password using cryptographic salted bcrypt (12 rounds).
    Truncates raw UTF-8 to 72 bytes to comply cleanly with bcrypt spec.
    """
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def _legacy_sha256_hash(password: str) -> str:
    return hashlib.sha256(f"{LEGACY_SHA256_SALT}{password}".encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    # Salted bcrypt verification
    if hashed_password.startswith("$2"):
        try:
            pw_bytes = plain_password.encode("utf-8")[:72]
            return bcrypt.checkpw(pw_bytes, hashed_password.encode("utf-8"))
        except Exception:
            return False
    # Backward-compatible legacy SHA-256 verification for un-migrated seed rows
    return _legacy_sha256_hash(plain_password) == hashed_password


def needs_password_rehash(hashed_password: str) -> bool:
    return not (hashed_password and hashed_password.startswith("$2"))


def validate_password_strength(password: str) -> Optional[str]:
    """
    Validates password complexity. Returns None if valid, or a descriptive error string.
    Requires >= 8 characters with uppercase, lowercase, numeric, and special characters.
    """
    if not password or len(password) < 8:
        return "Password must be at least 8 characters long."
    if not any(c.isupper() for c in password):
        return "Password must include at least one uppercase letter."
    if not any(c.islower() for c in password):
        return "Password must include at least one lowercase letter."
    if not any(c.isdigit() for c in password):
        return "Password must include at least one digit."
    if not any(not c.isalnum() for c in password):
        return "Password must include at least one special character (e.g. @, #, !, $)."
    return None


def sanitize_csv_cell(value: Any) -> str:
    """Prevents CSV formula injection (=, +, -, @, tab, CR) when exported to Excel/Sheets."""
    text = "" if value is None else str(value)
    if text and text[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + text
    return text
