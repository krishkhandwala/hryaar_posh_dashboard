from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db
from app.models.models import User, Company

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
    if user is None or not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive or non-existent user")
    return user

def require_role(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for your user role"
            )
        return current_user
    return role_checker

def get_tenant_company_id(
    requested_company_id: str = None,
    current_user: User = Depends(get_current_user)
) -> str:
    """
    CRITICAL MULTI-TENANCY ENFORCEMENT:
    Platform Super Admins can access or switch to any specified company.
    Company HR Admins and Auditors can ONLY access their own company_id.
    Never trust client input to override tenant scoping.
    """
    if current_user.role == "PLATFORM_ADMIN":
        if requested_company_id:
            return requested_company_id
        return current_user.company_id
    
    # Strictly enforce tenant ownership
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="User is not assigned to any tenant organization")
    
    if requested_company_id and requested_company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: cross-tenant access attempt detected"
        )
    return current_user.company_id
