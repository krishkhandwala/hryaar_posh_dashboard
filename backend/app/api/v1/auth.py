import uuid
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, Company, AuditLog, Employee, UserSession
from app.schemas.schemas import (
    Token, UserLogin, UserCreate, UserOut, PasswordChangeRequest, UserSessionOut
)
from app.core.security import (
    verify_password, get_password_hash, create_access_token, needs_password_rehash, validate_password_strength
)
from app.core.config import settings
from app.core.deps import get_current_user, oauth2_scheme
from app.core.distributed_cache import distributed_cache
from app.core.middleware import _resolve_client_ip
from app.core.permissions import resolve_workspace, resolve_navigation, get_user_permissions

router = APIRouter()

AUTH_LOCKOUT_MAX_ATTEMPTS = 5
AUTH_LOCKOUT_WINDOW_SECONDS = 900  # 15 minutes


@router.post("/login", response_model=Token)
def login(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    normalized_email = login_data.email.strip().lower()
    lock_key = f"auth_lock:{normalized_email}"
    fail_key = f"auth_fail:{normalized_email}"

    if distributed_cache.get(lock_key) is True:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Account temporarily locked due to repeated failed login attempts. Retry in 15 minutes or ask your administrator to unlock.",
            headers={"Retry-After": str(AUTH_LOCKOUT_WINDOW_SECONDS)},
        )

    # 1. Look up authenticated user by email
    user = db.query(User).filter(User.email == login_data.email).first()

    # 2. First-time employee onboarding via Employee email or employee_code
    emp = None
    if not user:
        emp = db.query(Employee).filter(
            (Employee.email == login_data.email) | (Employee.employee_code == login_data.email)
        ).first()

        if emp:
            # Allow initial learner self-onboarding with company onboarding passcodes
            onboarding_passwords = ["Employee@1234", "Posh@1234"]
            if login_data.password in onboarding_passwords:
                user = db.query(User).filter(User.email == emp.email).first()
                if not user:
                    user = User(
                        email=emp.email,
                        full_name=f"{emp.first_name} {emp.last_name}",
                        hashed_password=get_password_hash(login_data.password),
                        role="EMPLOYEE",
                        company_id=emp.company_id,
                        designation=emp.designation or "Employee / Learner",
                        is_active=True,
                        status="ACTIVE"
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)

    if not user or not verify_password(login_data.password, user.hashed_password):
        attempts = distributed_cache.incr_window(fail_key, AUTH_LOCKOUT_WINDOW_SECONDS)
        if attempts >= AUTH_LOCKOUT_MAX_ATTEMPTS:
            distributed_cache.set(lock_key, True, ttl_seconds=AUTH_LOCKOUT_WINDOW_SECONDS)
            db.add(AuditLog(
                company_id=user.company_id if user else None,
                actor_user_id=user.id if user else None,
                user_email=login_data.email,
                action="AUTH_ACCOUNT_LOCKED",
                ip_address=_resolve_client_ip(request),
                details=f"Account temporarily locked across cluster after {attempts} failed login attempts.",
            ))
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect corporate email, employee code, or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Valid credentials: clear any distributed failed-attempt counter
    distributed_cache.delete(fail_key)
    distributed_cache.delete(lock_key)

    if not user.is_active or user.status == "SUSPENDED":
        raise HTTPException(status_code=403, detail="Account is deactivated or suspended")

    # Transparent cryptographic upgrade from legacy SHA-256 to salted bcrypt
    if needs_password_rehash(user.hashed_password):
        user.hashed_password = get_password_hash(login_data.password)

    # Check tenant organisation standing
    company = None
    if user.company_id:
        company = db.query(Company).filter(Company.id == user.company_id).first()
        if not company or not company.is_active or company.status == "SUSPENDED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization subscription or access has been suspended"
            )

    user.last_login_at = datetime.utcnow()
    client_ip = _resolve_client_ip(request)
    user_agent = (request.headers.get("User-Agent") or "Unknown Client")[:250]

    # Create trackable, revocable UserSession
    jti = str(uuid.uuid4())
    session_expires = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    db.add(UserSession(
        user_id=user.id,
        jti=jti,
        ip_address=client_ip,
        user_agent=user_agent,
        is_revoked=False,
        expires_at=session_expires
    ))

    # Log authentication audit event
    db.add(AuditLog(
        company_id=user.company_id,
        actor_user_id=user.id,
        user_email=user.email,
        ip_address=client_ip,
        action="USER_LOGIN_SUCCESS",
        details=f"Successful authentication for role {user.role} via {settings.CLUSTER_NODE_ID}"
    ))
    db.commit()

    company_name = company.name if company else "HRYAAR Platform"
    logo_url = company.logo_url if company else None
    primary_color = company.primary_color if company else "#2A62FF"
    secondary_color = company.secondary_color if company else "#1D4ED8"
    accent_color = company.accent_color if company else "#F59E0B"
    sidebar_color = company.sidebar_color if company else "#061122"
    welcome_message = company.welcome_message if company else "Welcome to HRYAAR Digi-PoSH"
    company_type = company.company_type if company else "PLATFORM"
    partner_id = company.partner_id if company else None
    partner_name = (company.partner.name if (company and company.partner) else (company.partner_name if company else None))
    partner_logo_url = (company.partner.logo_url if (company and company.partner) else (company.partner_logo_url if company else None))
    co_branding_mode = company.co_branding_mode if company else "CO_BRANDED"

    # Do not expose internal partner hierarchy metadata to ordinary client HR or employee responses
    if user.role in ["COMPANY_ADMIN", "HR_ADMIN", "HR_MANAGER", "IC_MEMBER", "COMPLIANCE_OFFICER", "EMPLOYEE"]:
        partner_id = None

    emp_code = None
    emp_dept = None
    emp_tr_pct = None
    emp_tr_status = None
    emp_cert_id = None

    if user.role == "EMPLOYEE":
        if not emp:
            emp = db.query(Employee).filter(
                (Employee.email == user.email) & (Employee.company_id == user.company_id)
            ).first()
        if emp:
            emp_code = emp.employee_code
            emp_dept = emp.department
            emp_tr_pct = emp.training_progress_pct
            emp_tr_status = emp.training_status
            emp_cert_id = emp.certificate_id

    workspace = resolve_workspace(user.role)
    permissions = get_user_permissions(user, db)
    navigation = resolve_navigation(user.role)

    access_token = create_access_token(
        subject=user.id,
        company_id=user.company_id,
        role=user.role,
        jti=jti
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        workspace=workspace,
        permissions=permissions,
        navigation=navigation,
        company_id=user.company_id,
        company_name=company_name,
        logo_url=logo_url,
        primary_color=primary_color,
        secondary_color=secondary_color,
        accent_color=accent_color,
        sidebar_color=sidebar_color,
        welcome_message=welcome_message,
        status=user.status,
        company_type=company_type,
        partner_id=partner_id,
        partner_name=partner_name,
        partner_logo_url=partner_logo_url,
        co_branding_mode=co_branding_mode,
        employee_code=emp_code,
        department=emp_dept,
        training_progress_pct=emp_tr_pct,
        training_status=emp_tr_status,
        certificate_id=emp_cert_id
    )


@router.post("/logout")
def logout(
    request: Request,
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revokes the current JWT session (via jti) across PostgreSQL and cluster cache so the token can no longer be used.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        jti = payload.get("jti")
        if jti:
            distributed_cache.set(
                f"revoked_jti:{jti}",
                True,
                ttl_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            )
            session = db.query(UserSession).filter(UserSession.jti == jti).first()
            if session:
                session.is_revoked = True
            else:
                db.add(UserSession(
                    user_id=current_user.id,
                    jti=jti,
                    ip_address=_resolve_client_ip(request),
                    is_revoked=True,
                    expires_at=datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
                ))
    except JWTError:
        pass

    db.add(AuditLog(
        company_id=current_user.company_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        ip_address=_resolve_client_ip(request),
        action="USER_LOGOUT",
        details="User session revoked on logout"
    ))
    db.commit()
    return {"status": "success", "message": "Session revoked successfully"}


@router.get("/sessions", response_model=List[UserSessionOut])
def list_active_sessions(
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists active, non-expired login sessions for the authenticated user."""
    current_jti = None
    try:
        current_jti = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]).get("jti")
    except JWTError:
        pass

    now = datetime.utcnow()
    sessions = (
        db.query(UserSession)
        .filter(
            UserSession.user_id == current_user.id,
            UserSession.is_revoked == False,
            UserSession.expires_at > now,
        )
        .order_by(UserSession.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        UserSessionOut(
            id=s.id,
            jti=s.jti,
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            is_revoked=s.is_revoked,
            is_current=(s.jti == current_jti),
            created_at=s.created_at,
            expires_at=s.expires_at,
        )
        for s in sessions
    ]


@router.post("/sessions/revoke-others")
def revoke_other_sessions(
    request: Request,
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Immediately revokes every active session for this user except the current device."""
    current_jti = None
    try:
        current_jti = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]).get("jti")
    except JWTError:
        pass

    q = db.query(UserSession).filter(UserSession.user_id == current_user.id, UserSession.is_revoked == False)
    if current_jti:
        q = q.filter(UserSession.jti != current_jti)
    sessions = q.all()

    revoked_count = 0
    for s in sessions:
        s.is_revoked = True
        distributed_cache.set(f"revoked_jti:{s.jti}", True, ttl_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
        revoked_count += 1

    db.add(AuditLog(
        company_id=current_user.company_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        ip_address=_resolve_client_ip(request),
        action="USER_OTHER_SESSIONS_REVOKED",
        details=f"Signed out {revoked_count} other active session(s) across cluster."
    ))
    db.commit()
    return {"status": "success", "revoked_count": revoked_count}


@router.post("/sessions/{session_id}/revoke")
def revoke_single_session(
    session_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revokes a specific session belonging to the authenticated user."""
    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.is_revoked = True
    distributed_cache.set(f"revoked_jti:{session.jti}", True, ttl_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    db.add(AuditLog(
        company_id=current_user.company_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        ip_address=_resolve_client_ip(request),
        action="USER_SESSION_REVOKED",
        details=f"Revoked session {session.id}"
    ))
    db.commit()
    return {"status": "success", "message": "Session revoked"}


@router.post("/change-password")
def change_password(
    payload: PasswordChangeRequest,
    request: Request,
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Self-service password rotation with complexity enforcement and other-session revocation."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    err = validate_password_strength(payload.new_password)
    if err:
        raise HTTPException(status_code=400, detail=err)

    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must differ from current password.")

    current_user.hashed_password = get_password_hash(payload.new_password)

    # Revoke all other sessions when credentials rotate
    current_jti = None
    try:
        current_jti = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]).get("jti")
    except JWTError:
        pass

    q = db.query(UserSession).filter(UserSession.user_id == current_user.id, UserSession.is_revoked == False)
    if current_jti:
        q = q.filter(UserSession.jti != current_jti)
    for s in q.all():
        s.is_revoked = True
        distributed_cache.set(f"revoked_jti:{s.jti}", True, ttl_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

    db.add(AuditLog(
        company_id=current_user.company_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        ip_address=_resolve_client_ip(request),
        action="USER_PASSWORD_CHANGED",
        details="User rotated account password and invalidated other active sessions."
    ))
    db.commit()
    return {"status": "success", "message": "Password updated cleanly and other devices signed out."}


@router.get("/me")
def read_current_user(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = None
    if current_user.company_id:
        company = db.query(Company).filter(Company.id == current_user.company_id).first()

    emp_code = None
    emp_dept = None
    emp_tr_pct = None
    emp_tr_status = None
    emp_cert_id = None
    emp_as_status = None
    emp_as_score = None

    if current_user.role == "EMPLOYEE":
        emp = db.query(Employee).filter(
            (Employee.email == current_user.email) & (Employee.company_id == current_user.company_id)
        ).first()
        if emp:
            emp_code = emp.employee_code
            emp_dept = emp.department
            emp_tr_pct = emp.training_progress_pct
            emp_tr_status = emp.training_status
            emp_cert_id = emp.certificate_id
            emp_as_status = emp.assessment_status
            emp_as_score = emp.assessment_score

    partner_name = (company.partner.name if (company and company.partner) else (company.partner_name if company else None))
    partner_logo_url = (company.partner.logo_url if (company and company.partner) else (company.partner_logo_url if company else None))

    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "workspace": resolve_workspace(current_user.role),
        "permissions": get_user_permissions(current_user, db),
        "navigation": resolve_navigation(current_user.role),
        "company_id": current_user.company_id,
        "company_name": company.name if company else "HRYAAR Platform",
        "company_slug": company.slug if company else None,
        "company_type": company.company_type if company else "PLATFORM",
        "logo_url": company.logo_url if company else None,
        "primary_color": company.primary_color if company else "#2A62FF",
        "secondary_color": company.secondary_color if company else "#1D4ED8",
        "accent_color": company.accent_color if company else "#F59E0B",
        "sidebar_color": company.sidebar_color if company else "#061122",
        "welcome_message": company.welcome_message if company else "Welcome to HRYAAR Digi-PoSH",
        "designation": current_user.designation,
        "status": current_user.status,
        "partner_name": partner_name,
        "partner_logo_url": partner_logo_url,
        "co_branding_mode": company.co_branding_mode if company else "CO_BRANDED",
        "employee_code": emp_code,
        "department": emp_dept,
        "training_progress_pct": emp_tr_pct,
        "training_status": emp_tr_status,
        "certificate_id": emp_cert_id,
        "assessment_status": emp_as_status,
        "assessment_score": emp_as_score
    }
