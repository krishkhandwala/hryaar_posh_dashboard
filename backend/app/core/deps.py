from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db
from app.models.models import User, Company, UserSession
from app.core.distributed_cache import distributed_cache
from app.core.permissions import user_has_permission

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

PARTNER_ROLES = [
    "PARTNER_ADMIN",
    "MIDDLEMAN_ADMIN",
    "PARTNER_OPERATIONS",
    "PARTNER_SALES",
    "PARTNER_VIEWER",
]


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        jti: Optional[str] = payload.get("jti")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Session revocation check
    if jti:
        session = db.query(UserSession).filter(UserSession.jti == jti).first()
        if session and session.is_revoked:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been revoked. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active or user.status == "SUSPENDED":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive or suspended user account")

    # Tiered Distributed Caching for Tenant Standing (High-Concurrency optimization)
    if user.company_id and user.role not in ["PLATFORM_ADMIN", "SUPER_ADMIN"]:
        cached_status = distributed_cache.get(f"comp_status:{user.company_id}")
        if cached_status:
            if cached_status == "SUSPENDED":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Company organization has been suspended. Please contact platform administration."
                )
        else:
            company = db.query(Company).filter(Company.id == user.company_id).first()
            if not company or not company.is_active or company.status == "SUSPENDED":
                distributed_cache.set(f"comp_status:{user.company_id}", "SUSPENDED", ttl_seconds=60)
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Company organization has been suspended. Please contact platform administration."
                )
            distributed_cache.set(f"comp_status:{user.company_id}", "ACTIVE", ttl_seconds=120)

    return user


def require_permission(permission_key: str):
    """
    Granular RBAC dependency (Deny-by-default).
    Checks both role-default permission matrix and explicit DB role/permission assignments.
    """
    def permission_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        if not user_has_permission(current_user, permission_key, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: missing '{permission_key}'"
            )
        return current_user
    return permission_checker


def require_role(allowed_roles: List[str]):
    # Normalize roles for compatibility (SUPER_ADMIN = PLATFORM_ADMIN, COMPANY_ADMIN = HR_ADMIN)
    normalized = set(allowed_roles)
    if "SUPER_ADMIN" in normalized:
        normalized.add("PLATFORM_ADMIN")
    if "PLATFORM_ADMIN" in normalized:
        normalized.add("SUPER_ADMIN")
    if "COMPANY_ADMIN" in normalized:
        normalized.add("HR_ADMIN")
    if "HR_ADMIN" in normalized:
        normalized.add("COMPANY_ADMIN")

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in normalized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for user role: {current_user.role}"
            )
        return current_user
    return role_checker


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ["SUPER_ADMIN", "PLATFORM_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Administrator privileges required"
        )
    return current_user


def require_company_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ["SUPER_ADMIN", "PLATFORM_ADMIN", "COMPANY_ADMIN", "HR_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company Administrator privileges required"
        )
    return current_user


def require_partner_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ["SUPER_ADMIN", "PLATFORM_ADMIN"] + PARTNER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Partner Administrator privileges required"
        )
    return current_user


def get_tenant_company_id(
    requested_company_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> str:
    """
    CRITICAL MULTI-TENANCY ENFORCEMENT:
    - Platform Admins (SUPER_ADMIN): Can access or inspect any specified valid company.
    - Partner Users (PARTNER_*): Can ONLY access their own partner company or their
      mutually exclusive assigned client companies (comp.partner_id == current_user.company_id).
      Never grants access to direct clients (partner_id IS NULL) or another partner's clients.
    - Client Users / Employees: Strictly locked to their authenticated user.company_id.
    """
    if current_user.role in ["PLATFORM_ADMIN", "SUPER_ADMIN"]:
        if requested_company_id:
            comp = db.query(Company).filter(Company.id == requested_company_id).first()
            if not comp:
                raise HTTPException(status_code=404, detail="Target company not found")
            return requested_company_id
        if current_user.company_id:
            return current_user.company_id
        first_comp = db.query(Company).filter(Company.company_type == "CLIENT").first() or db.query(Company).first()
        return first_comp.id if first_comp else ""

    if current_user.role in PARTNER_ROLES:
        if not current_user.company_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Partner user is not assigned to an organisation")
        if requested_company_id:
            comp = db.query(Company).filter(Company.id == requested_company_id).first()
            if not comp:
                raise HTTPException(status_code=404, detail="Target company not found")
            is_own_partner = (comp.id == current_user.company_id)
            is_assigned_client = (comp.partner_id is not None and comp.partner_id == current_user.company_id)
            if not (is_own_partner or is_assigned_client):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access forbidden: cross-organisation access attempt rejected"
                )
            return requested_company_id
        return current_user.company_id

    # Strictly enforce client / learner tenant ownership
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not assigned to any tenant organization")

    if requested_company_id and requested_company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: cross-tenant access attempt detected"
        )
    return current_user.company_id
