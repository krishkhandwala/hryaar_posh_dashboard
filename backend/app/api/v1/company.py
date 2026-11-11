import os
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user, get_tenant_company_id, require_role, require_company_admin, require_permission
from app.core.permissions import user_has_permission
from app.core.security import get_password_hash
from app.core.config import settings
from app.models.models import (
    Company, CompanySettings, User, Employee, Complaint, 
    InternalCommitteeMember, Subscription, SubscriptionPlan, AuditLog,
    CompanyAPIKey, Webinar
)
from app.schemas.schemas import (
    CompanyOut, CompanyUpdate, CompanyBrandingOut, CompanyBrandingUpdate,
    UserOut, UserCreate, UserUpdate,
    ComplaintOut, ComplaintCreate, ComplaintUpdate,
    ICMemberOut, ICMemberCreate, ICMemberUpdate
)
from app.services.pdf_service import PoSHReportPDFService

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024 # 5 MB

# ==========================================
# 1. COMPANY PROFILE
# ==========================================

@router.get("/profile", response_model=CompanyOut)
def get_company_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(None, current_user, db)
    comp = db.query(Company).filter(Company.id == tenant_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")

    emp_count = db.query(Employee).filter(Employee.company_id == tenant_id).count()
    usr_count = db.query(User).filter(User.company_id == tenant_id).count()
    plan_name = comp.plan.display_name if comp.plan else "Enterprise Tier"

    return CompanyOut(
        id=comp.id,
        name=comp.name,
        slug=comp.slug,
        logo_url=comp.logo_url,
        favicon_url=comp.favicon_url,
        description=comp.description,
        contact_email=comp.contact_email,
        contact_number=comp.contact_number,
        is_active=comp.is_active,
        status=comp.status or "ACTIVE",
        primary_color=comp.primary_color or "#2A62FF",
        secondary_color=comp.secondary_color or "#1D4ED8",
        accent_color=comp.accent_color or "#F59E0B",
        sidebar_color=comp.sidebar_color or "#061122",
        welcome_message=comp.welcome_message,
        posh_reporting_url=comp.posh_reporting_url,
        posh_reporting_email=comp.posh_reporting_email,
        ic_chairperson=comp.ic_chairperson,
        industry=comp.industry,
        headquarters=comp.headquarters,
        subscription_plan_id=comp.subscription_plan_id,
        subscription_plan_name=plan_name,
        subscription_status=comp.subscription_status or "ACTIVE",
        total_employees=emp_count,
        total_users=usr_count,
        created_at=comp.created_at,
        updated_at=comp.updated_at
    )

@router.put("/profile", response_model=CompanyOut)
def update_company_profile(
    payload: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company_admin)
):
    tenant_id = get_tenant_company_id(None, current_user, db)
    comp = db.query(Company).filter(Company.id == tenant_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")

    if payload.name: comp.name = payload.name
    if payload.description is not None: comp.description = payload.description
    if payload.contact_email is not None: comp.contact_email = payload.contact_email
    if payload.contact_number is not None: comp.contact_number = payload.contact_number
    if payload.industry: comp.industry = payload.industry
    if payload.headquarters: comp.headquarters = payload.headquarters
    if payload.posh_reporting_url: comp.posh_reporting_url = payload.posh_reporting_url
    if payload.posh_reporting_email: comp.posh_reporting_email = payload.posh_reporting_email
    if payload.ic_chairperson: comp.ic_chairperson = payload.ic_chairperson

    audit = AuditLog(
        company_id=tenant_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="COMPANY_PROFILE_UPDATED",
        details=f"Updated company profile by {current_user.email}"
    )
    db.add(audit)
    db.commit()
    db.refresh(comp)
    return get_company_profile(db, current_user)

# ==========================================
# 2. DYNAMIC BRANDING & LOGO UPLOAD
# ==========================================

@router.get("/branding", response_model=CompanyBrandingOut)
def get_company_branding(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(None, current_user, db)
    comp = db.query(Company).filter(Company.id == tenant_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")

    return CompanyBrandingOut(
        company_id=comp.id,
        company_name=comp.name,
        logo_url=comp.logo_url,
        favicon_url=comp.favicon_url,
        primary_color=comp.primary_color or "#2A62FF",
        secondary_color=comp.secondary_color or "#1D4ED8",
        accent_color=comp.accent_color or "#F59E0B",
        sidebar_color=comp.sidebar_color or "#061122",
        welcome_message=comp.welcome_message or f"Welcome to {comp.name} PoSH Portal"
    )

@router.put("/branding", response_model=CompanyBrandingOut)
def update_company_branding(
    payload: CompanyBrandingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company_admin)
):
    tenant_id = get_tenant_company_id(None, current_user, db)
    comp = db.query(Company).filter(Company.id == tenant_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")

    if payload.primary_color: comp.primary_color = payload.primary_color
    if payload.secondary_color: comp.secondary_color = payload.secondary_color
    if payload.accent_color: comp.accent_color = payload.accent_color
    if payload.sidebar_color: comp.sidebar_color = payload.sidebar_color
    if payload.welcome_message is not None: comp.welcome_message = payload.welcome_message
    if payload.logo_url: comp.logo_url = payload.logo_url
    if payload.favicon_url: comp.favicon_url = payload.favicon_url

    audit = AuditLog(
        company_id=tenant_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="BRANDING_THEME_UPDATED",
        details=f"Updated colors (P: {comp.primary_color}, S: {comp.secondary_color}, SB: {comp.sidebar_color})"
    )
    db.add(audit)
    db.commit()
    db.refresh(comp)

    return get_company_branding(db, current_user)

@router.post("/branding/logo")
async def upload_branding_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company_admin)
):
    tenant_id = get_tenant_company_id(None, current_user, db)
    comp = db.query(Company).filter(Company.id == tenant_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type '{file.content_type}'. Allowed: PNG, JPEG, SVG, WebP."
        )

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds maximum size of 5MB")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    clean_ext = ext.lower() if ext.lower() in ["png", "jpg", "jpeg", "svg", "webp"] else "png"
    filename = f"brand_{comp.slug}_{uuid.uuid4().hex[:8]}.{clean_ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    logo_url = f"/static/uploads/{filename}"
    comp.logo_url = logo_url

    audit = AuditLog(
        company_id=tenant_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="BRAND_LOGO_UPLOADED",
        details=f"Uploaded new corporate brand logo: {filename}"
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "logo_url": logo_url, "company_id": tenant_id}

# ==========================================
# 3. COMPANY USER MANAGEMENT
# ==========================================

@router.get("/users", response_model=List[UserOut])
def list_company_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company_admin)
):
    tenant_id = get_tenant_company_id(None, current_user, db)
    users = db.query(User).filter(User.company_id == tenant_id).order_by(User.created_at.desc()).all()
    comp = db.query(Company).filter(Company.id == tenant_id).first()
    comp_name = comp.name if comp else ""

    return [
        UserOut(
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
        ) for u in users
    ]

@router.post("/users", response_model=UserOut)
def create_company_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company_admin)
):
    tenant_id = get_tenant_company_id(None, current_user, db)
    
    # Restrict company admin from creating Super Admins
    if payload.role in ["SUPER_ADMIN", "PLATFORM_ADMIN"]:
        raise HTTPException(
            status_code=403,
            detail="Company administrators cannot create Super Admin accounts"
        )

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=payload.role or "HR_MANAGER",
        company_id=tenant_id,
        designation=payload.designation or "Corporate Member",
        phone=payload.phone,
        is_active=True,
        status="ACTIVE"
    )
    db.add(new_user)

    audit = AuditLog(
        company_id=tenant_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="COMPANY_USER_CREATED",
        details=f"Created user {new_user.email} with role {new_user.role}"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_user)

    comp = db.query(Company).filter(Company.id == tenant_id).first()
    return UserOut(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        company_id=new_user.company_id,
        company_name=comp.name if comp else "",
        designation=new_user.designation,
        phone=new_user.phone,
        is_active=new_user.is_active,
        status=new_user.status,
        created_at=new_user.created_at,
        last_login_at=new_user.last_login_at
    )

@router.delete("/users/{user_id}")
def delete_company_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company_admin)
):
    tenant_id = get_tenant_company_id(None, current_user, db)
    user = db.query(User).filter(User.id == user_id, User.company_id == tenant_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in this company")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    email = user.email
    db.delete(user)
    
    audit = AuditLog(
        company_id=tenant_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="COMPANY_USER_DELETED",
        details=f"Removed user {email} from company roster"
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": f"User {email} removed."}

# ==========================================
# 4. POSH STATUTORY COMPLAINTS MANAGEMENT
# ==========================================

@router.get("/complaints", response_model=List[ComplaintOut])
def list_company_complaints(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("ic.grievances.read"))
):
    tenant_id = get_tenant_company_id(None, current_user, db)
    query = db.query(Complaint).filter(Complaint.company_id == tenant_id)

    if status_filter and status_filter != "ALL":
        query = query.filter(Complaint.status == status_filter)

    complaints = query.order_by(Complaint.filing_date.desc()).all()
    return complaints

@router.post("/complaints", response_model=ComplaintOut)
def file_posh_complaint(
    payload: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "PLATFORM_ADMIN", "COMPANY_ADMIN", "HR_ADMIN", "IC_MEMBER"]))
):
    tenant_id = get_tenant_company_id(None, current_user, db)
    comp = db.query(Company).filter(Company.id == tenant_id).first()
    
    # Generate unique complaint tracking number
    year = datetime.utcnow().year
    count = db.query(Complaint).filter(Complaint.company_id == tenant_id).count() + 1
    slug_prefix = (comp.slug.upper()[:4] if comp else "COMP")
    complaint_no = f"POSH-{slug_prefix}-{year}-{count:03d}"

    complaint = Complaint(
        company_id=tenant_id,
        complaint_number=complaint_no,
        incident_date=payload.incident_date or datetime.utcnow(),
        complainant_name=payload.complainant_name,
        complainant_department=payload.complainant_department or "General",
        complainant_email=payload.complainant_email,
        respondent_name=payload.respondent_name,
        respondent_department=payload.respondent_department or "General",
        summary=payload.summary,
        assigned_ic_chair=payload.assigned_ic_chair or comp.ic_chairperson,
        confidentiality_level=payload.confidentiality_level or "STRICT_IC_CONFIDENTIAL",
        status="FILED"
    )
    db.add(complaint)

    # Note: We deliberately DO NOT log the sensitive complaint summary or complainant name in general audit logs!
    audit = AuditLog(
        company_id=tenant_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="POSH_COMPLAINT_REGISTERED",
        details=f"Statutory grievance {complaint_no} recorded under confidential IC charter"
    )
    db.add(audit)
    db.commit()
    db.refresh(complaint)
    return complaint

@router.get("/complaints/{complaint_id}", response_model=ComplaintOut)
def get_complaint_details(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("ic.grievances.read"))
):
    tenant_id = get_tenant_company_id(None, current_user, db)
    complaint = db.query(Complaint).filter(
        Complaint.id == complaint_id,
        Complaint.company_id == tenant_id
    ).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint record not found")
    return complaint

@router.put("/complaints/{complaint_id}", response_model=ComplaintOut)
def update_complaint_status(
    complaint_id: str,
    payload: ComplaintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("ic.grievances.update"))
):
    tenant_id = get_tenant_company_id(None, current_user, db)
    complaint = db.query(Complaint).filter(
        Complaint.id == complaint_id,
        Complaint.company_id == tenant_id
    ).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint record not found")

    if payload.status:
        complaint.status = payload.status
        if payload.status in ["REPORT_SUBMITTED", "ACTION_TAKEN", "CLOSED"] and not complaint.resolution_date:
            complaint.resolution_date = datetime.utcnow()
    if payload.action_taken is not None:
        complaint.action_taken = payload.action_taken
    if payload.assigned_ic_chair:
        complaint.assigned_ic_chair = payload.assigned_ic_chair
    if payload.target_resolution_date:
        complaint.target_resolution_date = payload.target_resolution_date
    if payload.summary:
        complaint.summary = payload.summary

    audit = AuditLog(
        company_id=tenant_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="POSH_COMPLAINT_STAGE_UPDATED",
        details=f"Updated status for grievance {complaint.complaint_number} to '{complaint.status}'"
    )
    db.add(audit)
    db.commit()
    db.refresh(complaint)
    return complaint

# ==========================================
# 5. INTERNAL COMMITTEE (IC) CONSTITUTION
# ==========================================

@router.get("/ic-members", response_model=List[ICMemberOut])
def list_ic_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(None, current_user, db)
    return db.query(InternalCommitteeMember).filter(
        InternalCommitteeMember.company_id == tenant_id
    ).order_by(InternalCommitteeMember.appointed_date.asc()).all()

@router.post("/ic-members", response_model=ICMemberOut)
def add_ic_member(
    payload: ICMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company_admin)
):
    tenant_id = get_tenant_company_id(None, current_user, db)

    member = InternalCommitteeMember(
        company_id=tenant_id,
        name=payload.name,
        email=payload.email,
        role_in_committee=payload.role_in_committee,
        designation=payload.designation or "Committee Member",
        phone=payload.phone,
        is_external=payload.is_external,
        appointed_date=payload.appointed_date or datetime.utcnow(),
        term_expiry_date=payload.term_expiry_date
    )
    db.add(member)

    audit = AuditLog(
        company_id=tenant_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="IC_CONSTITUTION_UPDATED",
        details=f"Added IC member '{member.name}' ({member.role_in_committee})"
    )
    db.add(audit)
    db.commit()
    db.refresh(member)
    return member

@router.delete("/ic-members/{member_id}")
def delete_ic_member(
    member_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company_admin)
):
    tenant_id = get_tenant_company_id(None, current_user, db)
    member = db.query(InternalCommitteeMember).filter(
        InternalCommitteeMember.id == member_id,
        InternalCommitteeMember.company_id == tenant_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="IC Member not found")

    name = member.name
    db.delete(member)

    audit = AuditLog(
        company_id=tenant_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="IC_MEMBER_REMOVED",
        details=f"Removed IC member '{name}'"
    )
    db.add(audit)
    db.commit()
    return {"status": "success", "message": f"IC Member '{name}' removed."}

# ==========================================
# 6. SUBSCRIPTION & USAGE LIMITS
# ==========================================

@router.get("/subscription")
def get_company_subscription_details(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(None, current_user, db)
    comp = db.query(Company).filter(Company.id == tenant_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")

    plan = comp.plan
    emp_count = db.query(Employee).filter(Employee.company_id == tenant_id).count()
    max_employees = plan.max_employees if plan else 2000
    plan_name = plan.display_name if plan else "Enterprise Tier"

    usage_pct = round((emp_count / max_employees) * 100, 1) if max_employees > 0 else 0.0

    return {
        "company_id": comp.id,
        "company_name": comp.name,
        "plan_name": plan_name,
        "plan_status": comp.subscription_status or "ACTIVE",
        "current_employees": emp_count,
        "max_employees": max_employees,
        "usage_percentage": min(usage_pct, 100.0),
        "limit_reached": (emp_count >= max_employees) if max_employees > 0 else False,
        "features": plan.features if plan else "[]"
    }

# ==========================================
# 7. ANNUAL STATUTORY REPORT (PDF EXPORT)
# ==========================================

@router.get("/reports/annual-statutory-pdf")
def download_annual_statutory_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("company.reports.export"))
):
    """
    Generates and downloads the official POSH Section 21 Annual Statutory Compliance PDF.
    Contains IC constitution, complaints ledger, training KPIs, and certification summary.
    """
    tenant_id = get_tenant_company_id(None, current_user, db)
    comp = db.query(Company).filter(Company.id == tenant_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")

    # Fetch tenant metrics
    total_emp = db.query(Employee).filter(Employee.company_id == tenant_id).count()
    trained_emp = db.query(Employee).filter(Employee.company_id == tenant_id, Employee.training_status == "COMPLETED").count()
    training_pct = round((trained_emp / total_emp) * 100, 1) if total_emp > 0 else 0.0
    passed_assessments = db.query(Employee).filter(Employee.company_id == tenant_id, Employee.assessment_status == "PASSED").count()
    certificates_issued = db.query(Employee).filter(Employee.company_id == tenant_id, Employee.certificate_status == "ISSUED").count()

    ic_members_rows = db.query(InternalCommitteeMember).filter(
        InternalCommitteeMember.company_id == tenant_id
    ).all()

    ic_members = [
        {
            "name": m.name,
            "role_in_committee": m.role_in_committee or "IC Member",
            "designation": m.designation or "Corporate Member",
            "is_external": m.is_external
        }
        for m in ic_members_rows
    ]

    ic_chair_name = "Not Formally Appointed"
    for m in ic_members_rows:
        role_lower = (m.role_in_committee or "").lower()
        if "presiding" in role_lower or "chair" in role_lower:
            ic_chair_name = m.name
            break

    can_view_grievances = user_has_permission(current_user, "ic.grievances.read", db)
    complaints_rows = db.query(Complaint).filter(Complaint.company_id == tenant_id).all()
    complaints = [
        {
            "complaint_number": c.complaint_number,
            "status": c.status,
            "is_anonymous": True if not can_view_grievances else (c.confidentiality_level == "STRICTLY_ANONYMOUS" or "Confidential" in (c.complainant_name or "")),
            "summary": (c.summary or "Confidential inquiry") if can_view_grievances else "Redacted (Confidential IC Access Required)",
            "action_taken": (c.action_taken or "Pending formal inquiry closure") if can_view_grievances else "Confidential Under Section 16",
            "filing_date": c.filing_date.isoformat() if c.filing_date else datetime.utcnow().isoformat()
        }
        for c in complaints_rows
    ]

    webinars_rows = db.query(Webinar).filter(Webinar.company_id == tenant_id).all()
    webinars = [
        {
            "title": w.title,
            "speaker": w.speaker,
            "session_time": w.session_time.strftime("%d-%b-%Y") if w.session_time else "N/A",
            "status": w.status,
            "attendees_count": w.attendees_count or 0
        }
        for w in webinars_rows
    ]

    pdf_buffer = PoSHReportPDFService.generate_annual_statutory_report(
        company_name=comp.name,
        company_slug=comp.slug,
        headquarters="Corporate Headquarters",
        industry="Enterprise Organization",
        ic_chair=ic_chair_name,
        mandate_year=str(datetime.utcnow().year),
        total_employees=total_emp,
        trained_employees=trained_emp,
        training_pct=training_pct,
        passed_assessments=passed_assessments,
        certificates_issued=certificates_issued,
        ic_members=ic_members,
        complaints=complaints,
        webinars=webinars
    )

    filename = f"POSH_Annual_Statutory_Report_{comp.slug}_{datetime.utcnow().year}.pdf"
    
    # Audit log entry for statutory report export
    audit = AuditLog(
        company_id=tenant_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="STATUTORY_ANNUAL_REPORT_EXPORTED",
        details=f"Exported Section 21 Annual Report for calendar year {datetime.utcnow().year}"
    )
    db.add(audit)
    db.commit()

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

# ==========================================
# 8. LMS & WEBHOOK INTEGRATIONS
# ==========================================

@router.get("/integrations")
def get_company_integrations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company_admin)
):
    """
    Returns API keys, webhook endpoints, and sync status for external LMS connectors.
    """
    tenant_id = get_tenant_company_id(None, current_user, db)
    api_keys = db.query(CompanyAPIKey).filter(CompanyAPIKey.company_id == tenant_id).all()
    
    return {
        "company_id": tenant_id,
        "webhook_url": f"https://api.digiposh.cloud/api/v1/integrations/webhook/{tenant_id}",
        "lms_adapter": "Leap10x / Cornerstone / Workday REST Sync",
        "sync_frequency": "Real-time Webhook & Hourly Cron",
        "api_keys": [
            {
                "id": k.id,
                "name": k.name,
                "masked_key": k.masked_key,
                "created_at": k.created_at,
                "last_used_at": k.last_used_at,
                "is_active": k.is_active
            }
            for k in api_keys
        ]
    }

@router.post("/integrations/api-keys")
def generate_api_key(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company_admin)
):
    """
    Generates a secure hashed API key for LMS webhook ingestion.
    """
    tenant_id = get_tenant_company_id(None, current_user, db)
    name = payload.get("name", "Leap10x LMS Live Sync Key")
    
    raw_token = f"posh_live_{uuid.uuid4().hex}"
    masked = f"posh_live_...{raw_token[-6:]}"
    hashed = get_password_hash(raw_token)

    new_key = CompanyAPIKey(
        company_id=tenant_id,
        name=name,
        key_prefix="posh_live_",
        masked_key=masked,
        hashed_key=hashed,
        is_active=True
    )
    db.add(new_key)
    
    audit = AuditLog(
        company_id=tenant_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="INTEGRATION_KEY_GENERATED",
        details=f"Generated new API Key '{name}'"
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "name": name,
        "api_key": raw_token,
        "masked_key": masked,
        "warning": "Copy this key now. For enterprise security, it will never be displayed in plaintext again."
    }

@router.post("/integrations/simulate-lms-sync")
def simulate_lms_sync(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company_admin)
):
    """
    Simulates inbound webhook ingestion from Leap10x or Workday LMS,
    progressing employee modules and recalculating completion metrics.
    """
    tenant_id = get_tenant_company_id(None, current_user, db)
    
    # Touch or create an API key if not exists
    key = db.query(CompanyAPIKey).filter(CompanyAPIKey.company_id == tenant_id).first()
    if not key:
        raw_token = f"posh_live_{uuid.uuid4().hex}"
        key = CompanyAPIKey(
            company_id=tenant_id,
            name="Default Leap10x Ingestion Adapter",
            key_prefix="posh_live_",
            masked_key=f"posh_live_...{raw_token[-6:]}",
            hashed_key=get_password_hash(raw_token),
            is_active=True,
            last_used_at=datetime.utcnow()
        )
        db.add(key)
    else:
        key.last_used_at = datetime.utcnow()

    # Progress up to 15 pending employees
    employees = db.query(Employee).filter(Employee.company_id == tenant_id).all()
    synced_count = 0
    for emp in employees:
        if emp.training_status != "COMPLETED":
            emp.training_progress_pct = min(100.0, (emp.training_progress_pct or 0.0) + 25.0)
            if emp.training_progress_pct >= 100.0:
                emp.training_status = "COMPLETED"
                emp.training_completion_date = datetime.utcnow()
            synced_count += 1
            if synced_count >= 15:
                break

    audit = AuditLog(
        company_id=tenant_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="LMS_WEBHOOK_SYNC_TRIGGERED",
        details=f"Processed external LMS batch payload. Updated {synced_count} employee records."
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "synced_records": synced_count,
        "synced_at": datetime.utcnow().isoformat(),
        "source": "Leap10x LMS Enterprise Webhook Relay",
        "message": f"Successfully synchronized {synced_count} employee learning records from LMS pipeline."
    }


