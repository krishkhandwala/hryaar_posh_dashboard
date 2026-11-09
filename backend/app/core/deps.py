from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db
from app.models.models import User, Company
from app.core.distributed_cache import distributed_cache

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active or user.status == "SUSPENDED":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive or suspended user account")
    
    # Tier 2 Distributed Caching for Tenant Standing (High-Concurrency optimization)
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
    if current_user.role not in ["SUPER_ADMIN", "PLATFORM_ADMIN", "PARTNER_ADMIN", "MIDDLEMAN_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Partner / Middleman Administrator privileges required"
        )
    return current_user

def get_tenant_company_id(
    requested_company_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> str:
    """
    CRITICAL MULTI-TENANCY ENFORCEMENT:
    Platform Super Admins can access or switch to any specified company.
    Partner Admins can access their partner account and their mutually exclusive assigned clients.
    Company HR Admins can ONLY access their own company_id.
    """
    if current_user.role in ["PLATFORM_ADMIN", "SUPER_ADMIN"]:
        if requested_company_id:
            comp = db.query(Company).filter(Company.id == requested_company_id).first()
            if not comp:
                raise HTTPException(status_code=404, detail="Target company not found")
            return requested_company_id
        if current_user.company_id:
            return current_user.company_id
        first_comp = db.query(Company).first()
        return first_comp.id if first_comp else ""

    if current_user.role in ["PARTNER_ADMIN", "MIDDLEMAN_ADMIN"]:
        if requested_company_id:
            comp = db.query(Company).filter(Company.id == requested_company_id).first()
            if not comp:
                raise HTTPException(status_code=404, detail="Target company not found")
            if comp.id != current_user.company_id and comp.partner_id != current_user.company_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Cross-partner data access prohibited")
            return requested_company_id
        return current_user.company_id or ""
    
    # Strictly enforce tenant ownership
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not assigned to any tenant organization")
    
    if requested_company_id and requested_company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: cross-tenant access attempt detected"
        )
    return current_user.company_id
