import os
import uuid
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import require_super_admin
from app.core.security import get_password_hash, validate_password_strength
from app.core.config import settings
from app.core.distributed_cache import distributed_cache
from app.services.event_bus import publish_realtime_event
from app.services.csv_service import CSVImportService
from app.models.models import (
    Company, CompanySettings, User, Employee, Complaint, 
    SubscriptionPlan, Subscription, AuditLog, Webinar, ComplianceDocument,
    ClientServiceRequest
)
from app.schemas.schemas import (
    CompanyOut, CompanyCreate, CompanyUpdate, CompanyStatusUpdate,
    UserOut, UserCreate, UserUpdate, UserResetPassword,
    SubscriptionPlanOut, SubscriptionPlanCreate, SubscriptionPlanUpdate,
    SuperAdminAnalytics, SystemHealthOut, RecentActivityOut
)

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024 # 5 MB

# ==========================================
# 1. COMPANY MANAGEMENT
# ==========================================

@router.get("/companies", response_model=List[CompanyOut])
def get_all_companies(
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    query = db.query(Company)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter((Company.name.ilike(search_fmt)) | (Company.slug.ilike(search_fmt)))
    if status and status != "ALL":
        query = query.filter(Company.status == status)
    
    companies = query.order_by(Company.created_at.desc()).all()
    results = []
    for c in companies:
        emp_count = db.query(Employee).filter(Employee.company_id == c.id).count()
        user_count = db.query(User).filter(User.company_id == c.id).count()
        plan_name = c.plan.display_name if c.plan else "Enterprise Tier"
        
        results.append(CompanyOut(
            id=c.id,
            name=c.name,
            slug=c.slug,
            logo_url=c.logo_url,
            favicon_url=c.favicon_url,
            description=c.description,
            contact_email=c.contact_email,
            contact_number=c.contact_number,
            is_active=c.is_active,
            status=c.status or "ACTIVE",
            company_type=c.company_type or "CLIENT",
            partner_id=c.partner_id,
            partner_name=c.partner.name if c.partner else (c.partner_name or None),
            partner_logo_url=c.partner.logo_url if c.partner else (c.partner_logo_url or None),
            co_branding_mode=c.co_branding_mode or "CO_BRANDED",
            assigned_seat_quota=c.assigned_seat_quota or 1500,
            primary_color=c.primary_color or "#2A62FF",
            secondary_color=c.secondary_color or "#1D4ED8",
            accent_color=c.accent_color or "#F59E0B",
            sidebar_color=c.sidebar_color or "#061122",
            welcome_message=c.welcome_message,
            posh_reporting_url=c.posh_reporting_url,
            posh_reporting_email=c.posh_reporting_email,
            ic_chairperson=c.ic_chairperson,
            industry=c.industry,
            headquarters=c.headquarters,
            subscription_plan_id=c.subscription_plan_id,
            subscription_plan_name=plan_name,
            subscription_status=c.subscription_status or "ACTIVE",
            total_employees=emp_count,
            total_users=user_count,
            created_at=c.created_at,
            updated_at=c.updated_at
        ))
    return results

@router.post("/companies", response_model=CompanyOut)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    slug = payload.slug or payload.name.lower().replace(" ", "-").replace(".", "")
    existing = db.query(Company).filter((Company.slug == slug) | (Company.name == payload.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Company with name '{payload.name}' or slug '{slug}' already exists")

    comp_type = (payload.company_type or "CLIENT").upper()
    if comp_type not in ["PLATFORM", "PARTNER", "CLIENT"]:
        raise HTTPException(status_code=400, detail="Invalid company_type. Must be PLATFORM, PARTNER, or CLIENT")

    # Enforce strict hierarchy constraints on parent partner_id
    partner_name = None
    partner_logo_url = None
    if payload.partner_id:
        if comp_type != "CLIENT":
            raise HTTPException(status_code=400, detail="Only CLIENT organisations can be linked to a partner_id")
        parent_partner = db.query(Company).filter(Company.id == payload.partner_id).first()
        if not parent_partner or parent_partner.company_type != "PARTNER":
            raise HTTPException(status_code=400, detail="Referenced partner_id must belong to an active PARTNER organisation")
        partner_name = parent_partner.name
        partner_logo_url = parent_partner.logo_url

    # Find or default plan
    plan_id = payload.subscription_plan_id
    if not plan_id:
        default_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == "ENTERPRISE").first()
        if not default_plan:
            default_plan = db.query(SubscriptionPlan).first()
        plan_id = default_plan.id if default_plan else None

    company = Company(
        name=payload.name,
        slug=slug,
        description=payload.description,
        contact_email=payload.contact_email,
        contact_number=payload.contact_number,
        industry=payload.industry or "Information Technology",
        headquarters=payload.headquarters or "Mumbai, India",
        posh_reporting_email=payload.posh_reporting_email or (f"posh-ic@{slug}.com"),
        ic_chairperson=payload.ic_chairperson or "Internal Committee Presiding Officer",
        primary_color=payload.primary_color or "#2A62FF",
        secondary_color=payload.secondary_color or "#1D4ED8",
        accent_color=payload.accent_color or "#F59E0B",
        sidebar_color=payload.sidebar_color or "#061122",
        welcome_message=payload.welcome_message or f"Welcome to {payload.name} PoSH Compliance Portal",
        company_type=comp_type,
        partner_id=payload.partner_id,
        partner_name=partner_name,
        partner_logo_url=partner_logo_url,
        co_branding_mode=payload.co_branding_mode or "CO_BRANDED",
        assigned_seat_quota=payload.assigned_seat_quota or 1500,
        subscription_plan_id=plan_id,
        subscription_status="ACTIVE",
        status="ACTIVE",
        is_active=True
    )
    db.add(company)
    db.flush()

    # Create default settings
    settings_obj = CompanySettings(
        company_id=company.id,
        passing_threshold_pct=70.0,
        mandate_year="CY 2025-2026",
        certificate_prefix=f"CERT-{slug.upper()[:6]}-POSH",
        allowed_domains=f"{slug}.com"
    )
    db.add(settings_obj)

    # Create subscription record
    if plan_id:
        sub = Subscription(
            company_id=company.id,
            plan_id=plan_id,
            status="ACTIVE"
        )
        db.add(sub)

    # Create initial administrator with the correct organisation-matching role
    if payload.admin_email and payload.admin_password:
        existing_user = db.query(User).filter(User.email == payload.admin_email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail=f"User with email '{payload.admin_email}' already exists")

        initial_role = "PARTNER_ADMIN" if comp_type == "PARTNER" else ("SUPER_ADMIN" if comp_type == "PLATFORM" else "COMPANY_ADMIN")
        initial_desig = (
            "Partner Organisation Administrator" if comp_type == "PARTNER"
            else ("Platform Systems Administrator" if comp_type == "PLATFORM" else "Corporate PoSH Administrator")
        )
        admin_user = User(
            email=payload.admin_email,
            full_name=payload.admin_name or f"{payload.name} Administrator",
            hashed_password=get_password_hash(payload.admin_password),
            role=initial_role,
            company_id=None if comp_type == "PLATFORM" else company.id,
            designation=initial_desig
        )
        db.add(admin_user)

    audit = AuditLog(
        company_id=company.id,
        actor_user_id=admin.id,
        user_email=admin.email,
        action="COMPANY_CREATED",
        entity_type="Company",
        entity_id=company.id,
        details=f"Super Admin provisioned new tenant organization: {company.name} ({company.slug})"
    )
    db.add(audit)
    db.commit()
    db.refresh(company)

    plan_name = company.plan.display_name if company.plan else "Enterprise Tier"
    return CompanyOut(
        id=company.id,
        name=company.name,
        slug=company.slug,
        logo_url=company.logo_url,
        favicon_url=company.favicon_url,
        description=company.description,
        contact_email=company.contact_email,
        contact_number=company.contact_number,
        is_active=company.is_active,
        status=company.status,
        company_type=company.company_type or "CLIENT",
        partner_id=company.partner_id,
        partner_name=company.partner.name if company.partner else (company.partner_name or None),
        partner_logo_url=company.partner.logo_url if company.partner else (company.partner_logo_url or None),
        co_branding_mode=company.co_branding_mode or "CO_BRANDED",
        assigned_seat_quota=company.assigned_seat_quota or 1500,
        primary_color=company.primary_color,
        secondary_color=company.secondary_color,
        accent_color=company.accent_color,
        sidebar_color=company.sidebar_color,
        welcome_message=company.welcome_message,
        posh_reporting_url=company.posh_reporting_url,
        posh_reporting_email=company.posh_reporting_email,
        ic_chairperson=company.ic_chairperson,
        industry=company.industry,
        headquarters=company.headquarters,
        subscription_plan_id=company.subscription_plan_id,
        subscription_plan_name=plan_name,
        subscription_status=company.subscription_status,
        total_employees=0,
        total_users=1 if payload.admin_email else 0,
        created_at=company.created_at,
        updated_at=company.updated_at
    )

@router.get("/companies/{company_id}", response_model=CompanyOut)
def get_company_by_id(
    company_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    c = db.query(Company).filter(Company.id == company_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Company not found")
    
    emp_count = db.query(Employee).filter(Employee.company_id == c.id).count()
    user_count = db.query(User).filter(User.company_id == c.id).count()
    plan_name = c.plan.display_name if c.plan else "Enterprise Tier"

    return CompanyOut(
        id=c.id,
        name=c.name,
        slug=c.slug,
        logo_url=c.logo_url,
        favicon_url=c.favicon_url,
        description=c.description,
        contact_email=c.contact_email,
        contact_number=c.contact_number,
        is_active=c.is_active,
        status=c.status or "ACTIVE",
        company_type=c.company_type or "CLIENT",
        partner_id=c.partner_id,
        partner_name=c.partner.name if c.partner else (c.partner_name or None),
        partner_logo_url=c.partner.logo_url if c.partner else (c.partner_logo_url or None),
        co_branding_mode=c.co_branding_mode or "CO_BRANDED",
        assigned_seat_quota=c.assigned_seat_quota or 1500,
        primary_color=c.primary_color or "#2A62FF",
        secondary_color=c.secondary_color or "#1D4ED8",
        accent_color=c.accent_color or "#F59E0B",
        sidebar_color=c.sidebar_color or "#061122",
        welcome_message=c.welcome_message,
        posh_reporting_url=c.posh_reporting_url,
        posh_reporting_email=c.posh_reporting_email,
        ic_chairperson=c.ic_chairperson,
        industry=c.industry,
        headquarters=c.headquarters,
        subscription_plan_id=c.subscription_plan_id,
        subscription_plan_name=plan_name,
        subscription_status=c.subscription_status or "ACTIVE",
        total_employees=emp_count,
        total_users=user_count,
        created_at=c.created_at,
        updated_at=c.updated_at
    )

@router.put("/companies/{company_id}", response_model=CompanyOut)
def update_company(
    company_id: str,
    payload: CompanyUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    c = db.query(Company).filter(Company.id == company_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Company not found")

    if payload.name: c.name = payload.name
    if payload.description is not None: c.description = payload.description
    if payload.contact_email is not None: c.contact_email = payload.contact_email
    if payload.contact_number is not None: c.contact_number = payload.contact_number
    if payload.industry: c.industry = payload.industry
    if payload.headquarters: c.headquarters = payload.headquarters
    if payload.posh_reporting_url: c.posh_reporting_url = payload.posh_reporting_url
    if payload.posh_reporting_email: c.posh_reporting_email = payload.posh_reporting_email
    if payload.ic_chairperson: c.ic_chairperson = payload.ic_chairperson
    if payload.primary_color: c.primary_color = payload.primary_color
    if payload.secondary_color: c.secondary_color = payload.secondary_color
    if payload.accent_color: c.accent_color = payload.accent_color
    if payload.sidebar_color: c.sidebar_color = payload.sidebar_color
    if payload.welcome_message is not None: c.welcome_message = payload.welcome_message
    if payload.subscription_plan_id: c.subscription_plan_id = payload.subscription_plan_id
    if payload.partner_id is not None:
        if payload.partner_id == "":
            c.partner_id = None
            c.partner_name = None
            c.partner_logo_url = None
        else:
            if c.company_type != "CLIENT":
                raise HTTPException(status_code=400, detail="Only CLIENT organisations can reference a partner_id")
            if payload.partner_id == c.id:
                raise HTTPException(status_code=400, detail="Circular hierarchy rejected: company cannot be its own partner")
            parent_partner = db.query(Company).filter(Company.id == payload.partner_id).first()
            if not parent_partner or parent_partner.company_type != "PARTNER":
                raise HTTPException(status_code=400, detail="Target partner_id must be a valid PARTNER organisation")
            c.partner_id = parent_partner.id
            c.partner_name = parent_partner.name
            c.partner_logo_url = parent_partner.logo_url
    if payload.partner_name is not None: c.partner_name = payload.partner_name
    if payload.partner_logo_url is not None: c.partner_logo_url = payload.partner_logo_url
    if payload.co_branding_mode is not None: c.co_branding_mode = payload.co_branding_mode
    if payload.assigned_seat_quota is not None: c.assigned_seat_quota = payload.assigned_seat_quota

    audit = AuditLog(
        company_id=c.id,
        actor_user_id=admin.id,
        user_email=admin.email,
        action="COMPANY_UPDATED",
        entity_type="Company",
        entity_id=c.id,
        details=f"Super Admin updated details for company: {c.name}"
    )
    db.add(audit)
    db.commit()
    db.refresh(c)
    return get_company_by_id(c.id, db, admin)

@router.patch("/companies/{company_id}/status", response_model=CompanyOut)
def update_company_status(
    company_id: str,
    payload: CompanyStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    c = db.query(Company).filter(Company.id == company_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Company not found")

    valid_statuses = ["ACTIVE", "SUSPENDED", "DEACTIVATED"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {valid_statuses}")

    c.status = payload.status
    c.is_active = (payload.status == "ACTIVE")
    distributed_cache.delete(f"comp_status:{company_id}")

    audit = AuditLog(
        company_id=c.id,
        actor_user_id=admin.id,
        user_email=admin.email,
        action="COMPANY_STATUS_CHANGED",
        entity_type="Company",
        entity_id=c.id,
        details=f"Super Admin set tenant status to '{payload.status}' for: {c.name}"
    )
    db.add(audit)
    db.commit()
    db.refresh(c)
    return get_company_by_id(c.id, db, admin)

@router.post("/companies/{company_id}/logo")
async def upload_company_logo(
    company_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    c = db.query(Company).filter(Company.id == company_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Company not found")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type '{file.content_type}'. Allowed types: PNG, JPEG, SVG, WebP."
        )

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds maximum 5MB limit")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    clean_ext = ext.lower() if ext.lower() in ["png", "jpg", "jpeg", "svg", "webp"] else "png"
    filename = f"logo_{c.slug}_{uuid.uuid4().hex[:8]}.{clean_ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    logo_url = f"/static/uploads/{filename}"
    c.logo_url = logo_url
    if c.company_type == "PARTNER":
        db.query(Company).filter(Company.partner_id == c.id).update({"partner_logo_url": logo_url})

    audit = AuditLog(
        company_id=c.id,
        actor_user_id=admin.id,
        user_email=admin.email,
        action="COMPANY_LOGO_UPLOADED",
        entity_type="Company",
        entity_id=c.id,
        details=f"Uploaded new corporate brand logo: {filename}"
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "logo_url": logo_url, "company_id": c.id}

@router.delete("/companies/{company_id}")
def delete_company(
    company_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    c = db.query(Company).filter(Company.id == company_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Company not found")

    company_name = c.name
    # Log audit event before deletion
    audit = AuditLog(
        company_id=None,
        actor_user_id=admin.id,
        user_email=admin.email,
        action="COMPANY_DELETED_AUDIT",
        details=f"Super Admin completely removed tenant organization: {company_name} (ID: {company_id})"
    )
    db.add(audit)
    db.delete(c)
    db.commit()

    return {"status": "success", "message": f"Company '{company_name}' successfully removed."}

# ==========================================
# 2. PLATFORM USER MANAGEMENT
# ==========================================

@router.get("/users", response_model=List[UserOut])
def get_all_users(
    search: Optional[str] = None,
    company_id: Optional[str] = None,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    query = db.query(User)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter((User.full_name.ilike(search_fmt)) | (User.email.ilike(search_fmt)))
    if company_id and company_id != "ALL":
        query = query.filter(User.company_id == company_id)
    if role and role != "ALL":
        query = query.filter(User.role == role)

    users = query.order_by(User.created_at.desc()).all()
    results = []
    for u in users:
        comp_name = u.company.name if u.company else "HRYAAR Platform"
        results.append(UserOut(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            company_id=u.company_id,
            company_name=comp_name,
            designation=u.designation or "Member",
            phone=u.phone,
            is_active=u.is_active,
            status=u.status or "ACTIVE",
            created_at=u.created_at,
            last_login_at=u.last_login_at
        ))
    return results

@router.post("/users", response_model=UserOut)
def create_platform_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"User with email '{payload.email}' already exists")

    if payload.company_id:
        comp = db.query(Company).filter(Company.id == payload.company_id).first()
        if not comp:
            raise HTTPException(status_code=404, detail="Specified company does not exist")

    pw_err = validate_password_strength(payload.password)
    if pw_err:
        raise HTTPException(status_code=400, detail=pw_err)

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        company_id=payload.company_id,
        designation=payload.designation or "Corporate Administrator",
        phone=payload.phone,
        is_active=True,
        status="ACTIVE"
    )
    db.add(user)

    audit = AuditLog(
        company_id=payload.company_id,
        actor_user_id=admin.id,
        user_email=admin.email,
        action="USER_CREATED_BY_SUPERADMIN",
        details=f"Super Admin provisioned user '{user.email}' with role '{user.role}'"
    )
    db.add(audit)
    db.commit()
    db.refresh(user)

    comp_name = user.company.name if user.company else "HRYAAR Platform"
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        company_id=user.company_id,
        company_name=comp_name,
        designation=user.designation,
        phone=user.phone,
        is_active=user.is_active,
        status=user.status,
        created_at=user.created_at,
        last_login_at=user.last_login_at
    )

@router.patch("/users/{user_id}/status", response_model=UserOut)
def update_user_status(
    user_id: str,
    status_val: str = Query(..., pattern="^(ACTIVE|SUSPENDED|INACTIVE)$"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.status = status_val
    user.is_active = (status_val == "ACTIVE")

    audit = AuditLog(
        company_id=user.company_id,
        actor_user_id=admin.id,
        user_email=admin.email,
        action="USER_STATUS_UPDATED",
        details=f"User '{user.email}' status changed to '{status_val}' by Super Admin"
    )
    db.add(audit)
    db.commit()
    db.refresh(user)

    comp_name = user.company.name if user.company else "HRYAAR Platform"
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        company_id=user.company_id,
        company_name=comp_name,
        designation=user.designation,
        phone=user.phone,
        is_active=user.is_active,
        status=user.status,
        created_at=user.created_at,
        last_login_at=user.last_login_at
    )

@router.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: str,
    payload: UserResetPassword,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    pw_err = validate_password_strength(payload.new_password)
    if pw_err:
        raise HTTPException(status_code=400, detail=pw_err)

    user.hashed_password = get_password_hash(payload.new_password)
    # Also clear any active brute-force lockout for the account upon admin reset
    normalized_email = user.email.strip().lower()
    distributed_cache.delete(f"auth_fail:{normalized_email}")
    distributed_cache.delete(f"auth_lock:{normalized_email}")

    audit = AuditLog(
        company_id=user.company_id,
        actor_user_id=admin.id,
        user_email=admin.email,
        action="USER_PASSWORD_RESET",
        details=f"Password for user '{user.email}' reset by Super Admin"
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": f"Password for {user.email} successfully updated."}


@router.post("/users/{user_id}/unlock")
def unlock_user_account(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    """Clears distributed brute-force login lockout for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    normalized_email = user.email.strip().lower()
    distributed_cache.delete(f"auth_fail:{normalized_email}")
    distributed_cache.delete(f"auth_lock:{normalized_email}")

    db.add(AuditLog(
        company_id=user.company_id,
        actor_user_id=admin.id,
        user_email=admin.email,
        action="USER_ACCOUNT_UNLOCKED",
        details=f"Super Admin cleared login lockout for '{user.email}'"
    ))
    db.commit()
    return {"status": "success", "message": f"Lockout cleared for {user.email}."}

# ==========================================
# 3. SUBSCRIPTIONS & COMMERCIALIZATION
# ==========================================

@router.get("/subscriptions", response_model=List[SubscriptionPlanOut])
def get_subscription_plans(
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    return db.query(SubscriptionPlan).all()

@router.post("/subscriptions/plans", response_model=SubscriptionPlanOut)
def create_subscription_plan(
    payload: SubscriptionPlanCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    existing = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Plan with this code name already exists")

    plan = SubscriptionPlan(
        name=payload.name,
        display_name=payload.display_name,
        price_monthly=payload.price_monthly,
        max_employees=payload.max_employees,
        storage_limit_mb=payload.storage_limit_mb,
        features=payload.features or "[]"
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan

@router.put("/companies/{company_id}/subscription", response_model=CompanyOut)
def assign_company_subscription(
    company_id: str,
    plan_id: str = Query(...),
    status_val: str = Query("ACTIVE"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found")

    company.subscription_plan_id = plan.id
    company.subscription_status = status_val

    # Update or create subscription row
    sub = db.query(Subscription).filter(Subscription.company_id == company.id).first()
    if sub:
        sub.plan_id = plan.id
        sub.status = status_val
    else:
        sub = Subscription(company_id=company.id, plan_id=plan.id, status=status_val)
        db.add(sub)

    audit = AuditLog(
        company_id=company.id,
        actor_user_id=admin.id,
        user_email=admin.email,
        action="SUBSCRIPTION_PLAN_ASSIGNED",
        details=f"Upgraded/Assigned company '{company.name}' to plan '{plan.display_name}' ({status_val})"
    )
    db.add(audit)
    db.commit()
    return get_company_by_id(company.id, db, admin)

# ==========================================
# 4. PLATFORM-WIDE ANALYTICS & METRICS
# ==========================================

@router.get("/analytics", response_model=SuperAdminAnalytics)
def get_super_admin_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    total_comps = db.query(Company).count()
    active_comps = db.query(Company).filter(Company.status == "ACTIVE").count()
    susp_comps = db.query(Company).filter(Company.status == "SUSPENDED").count()

    total_usrs = db.query(User).count()
    active_usrs = db.query(User).filter(User.status == "ACTIVE", User.is_active == True).count()

    total_emps = db.query(Employee).count()
    
    total_complaints = db.query(Complaint).count()
    active_complaints = db.query(Complaint).filter(Complaint.status.notin_(["CLOSED", "RESOLVED"])).count()
    resolved_complaints = db.query(Complaint).filter(Complaint.status.in_(["CLOSED", "RESOLVED"])).count()

    # Calculate average training completion across all employees
    if total_emps > 0:
        completed_training = db.query(Employee).filter(Employee.training_status == "COMPLETED").count()
        avg_completion = round((completed_training / total_emps) * 100, 1)
    else:
        avg_completion = 0.0

    # Companies by plan
    plans = db.query(SubscriptionPlan).all()
    plan_distribution = {}
    for p in plans:
        count = db.query(Company).filter(Company.subscription_plan_id == p.id).count()
        plan_distribution[p.display_name] = count
    
    # Catch companies with null plan
    unassigned = db.query(Company).filter(Company.subscription_plan_id.is_(None)).count()
    if unassigned > 0:
        plan_distribution["Custom / Enterprise"] = unassigned

    # Recent activity logs
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(15).all()

    return SuperAdminAnalytics(
        total_companies=total_comps,
        active_companies=active_comps,
        suspended_companies=susp_comps,
        total_users=total_usrs,
        active_users=active_usrs,
        total_employees=total_emps,
        total_complaints=total_complaints,
        active_complaints=active_complaints,
        resolved_complaints=resolved_complaints,
        avg_training_completion_pct=avg_completion,
        companies_by_plan=plan_distribution,
        recent_activity=logs
    )

# ==========================================
# 5. SYSTEM HEALTH & AUDIT TRAIL
# ==========================================

@router.get("/system-health", response_model=SystemHealthOut)
def get_system_health(
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    total_comps = db.query(Company).count()
    total_usrs = db.query(User).count()
    
    return SystemHealthOut(
        status="OPERATIONAL",
        version=settings.VERSION,
        database_status="CONNECTED",
        database_type="SQLite (Development) / PostgreSQL-Ready" if "sqlite" in settings.DATABASE_URL else "PostgreSQL Production",
        total_tenants=total_comps,
        total_users=total_usrs,
        server_time=datetime.utcnow()
    )

@router.get("/audit-logs", response_model=List[RecentActivityOut])
def get_platform_audit_logs(
    limit: int = 50,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    query = db.query(AuditLog)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (AuditLog.action.ilike(search_fmt)) |
            (AuditLog.details.ilike(search_fmt)) |
            (AuditLog.user_email.ilike(search_fmt))
        )
    return query.order_by(AuditLog.created_at.desc()).limit(limit).all()


# ==========================================
# 6. CLIENT SERVICE REQUESTS & CSV WORKBENCH
# ==========================================

class ServiceRequestUpdatePayload(BaseModel):
    status: str # APPROVED, COMPLETED, REJECTED, IN_REVIEW
    admin_notes: Optional[str] = None
    auto_ingest: bool = False


@router.get("/service-requests")
def get_all_service_requests(
    status: Optional[str] = None,
    request_type: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    """Super Admin view of all client CSV roster uploads, employee add requests, and corporate concerns."""
    query = db.query(ClientServiceRequest)
    if status and status != "ALL":
        query = query.filter(ClientServiceRequest.status == status)
    if request_type and request_type != "ALL":
        query = query.filter(ClientServiceRequest.request_type == request_type)

    requests = query.order_by(ClientServiceRequest.created_at.desc()).limit(limit).all()
    results = []
    for r in requests:
        comp = db.query(Company).filter(Company.id == r.company_id).first()
        user = db.query(User).filter(User.id == r.submitted_by_user_id).first() if r.submitted_by_user_id else None
        results.append({
            "id": r.id,
            "company_id": r.company_id,
            "company_name": comp.name if comp else r.company_id,
            "company_slug": comp.slug if comp else "",
            "submitted_by_name": user.full_name if user else "Client Admin",
            "submitted_by_email": user.email if user else "",
            "request_type": r.request_type,
            "title": r.title,
            "description": r.description,
            "category": r.category,
            "priority": r.priority,
            "file_url": r.file_url,
            "filename": r.filename,
            "row_count": r.row_count,
            "status": r.status,
            "admin_notes": r.admin_notes,
            "payload": json.loads(r.payload_json) if r.payload_json else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        })
    return results


@router.patch("/service-requests/{request_id}")
def update_service_request_status(
    request_id: str,
    payload: ServiceRequestUpdatePayload,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    """Super Admin review action on client service request with optional automated CSV ingestion."""
    req = db.query(ClientServiceRequest).filter(ClientServiceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Service request not found")

    old_status = req.status
    req.status = payload.status
    if payload.admin_notes:
        req.admin_notes = payload.admin_notes
    req.updated_at = datetime.utcnow()

    comp = db.query(Company).filter(Company.id == req.company_id).first()
    comp_name = comp.name if comp else req.company_id

    ingested_count = 0
    # Auto-ingest CSV employees if approved
    if payload.auto_ingest and payload.status in ["APPROVED", "COMPLETED"] and req.request_type == "CSV_ROSTER_UPLOAD" and req.file_url:
        try:
            # Resolve physical filepath from file_url (/static/uploads/filename)
            rel_path = req.file_url.replace("/static/uploads/", "")
            full_path = os.path.join(settings.UPLOAD_DIR, rel_path)
            if os.path.exists(full_path):
                with open(full_path, "rb") as f:
                    file_bytes = f.read()
                res = CSVImportService.process_csv(
                    file_bytes=file_bytes,
                    filename=req.filename or "roster.csv",
                    company_id=req.company_id,
                    db=db,
                    user_email=admin.email
                )
                ingested_count = res.get("imported_rows", 0)
        except Exception as e:
            req.admin_notes = f"{req.admin_notes or ''} [Ingest error: {e}]"

    # Dispatch Realtime push update to Client
    publish_realtime_event(
        db=db,
        event_type="SERVICE_REQUEST_UPDATED",
        title=f"Request {payload.status}: {req.title}",
        message=f"Super Admin updated request status from {old_status} to {payload.status}. {f'{ingested_count} employees enrolled.' if ingested_count > 0 else ''}",
        company_id=req.company_id,
        user_id=admin.id,
        payload={
            "request_id": req.id,
            "status": req.status,
            "ingested_count": ingested_count,
            "admin_notes": req.admin_notes
        }
    )

    db.commit()
    db.refresh(req)

    return {
        "status": "success",
        "request_id": req.id,
        "new_status": req.status,
        "ingested_count": ingested_count,
        "message": f"Successfully updated request to {payload.status}."
    }
