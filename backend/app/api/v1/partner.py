import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user, require_partner_admin, get_tenant_company_id
from app.core.security import get_password_hash
from app.models.models import (
    Company, CompanySettings, User, Employee, SubscriptionPlan, Subscription, AuditLog
)
from app.schemas.schemas import CompanyOut, CompanyCreate

router = APIRouter()

@router.get("/overview")
def get_partner_portfolio_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_partner_admin)
):
    """
    Returns high-level portfolio metrics for the Middleman / Partner Assigner:
    - Number of client companies
    - Total learners/employees managed
    - Aggregated portfolio completion rate
    - License seat quota allocation
    """
    partner_id = current_user.company_id
    if not partner_id and current_user.role in ["SUPER_ADMIN", "PLATFORM_ADMIN"]:
        # If super admin accesses partner overview without partner context, use first partner
        first_p = db.query(Company).filter(Company.company_type == "PARTNER").first()
        partner_id = first_p.id if first_p else None

    if not partner_id:
        raise HTTPException(status_code=400, detail="User is not associated with any Partner organization")

    partner = db.query(Company).filter(Company.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner organization not found")

    # Fetch mutually exclusive client companies belonging strictly to this partner
    clients = db.query(Company).filter(
        Company.partner_id == partner.id,
        Company.is_active == True
    ).all()

    total_learners = 0
    total_completed = 0
    total_allocated_seats = 0
    client_summaries = []

    for c in clients:
        emp_count = db.query(Employee).filter(Employee.company_id == c.id).count()
        completed_count = db.query(Employee).filter(
            Employee.company_id == c.id,
            Employee.training_status == "COMPLETED"
        ).count()
        passed_count = db.query(Employee).filter(
            Employee.company_id == c.id,
            Employee.assessment_status == "PASSED"
        ).count()

        comp_pct = round((completed_count / emp_count * 100), 1) if emp_count > 0 else 0.0
        pass_pct = round((passed_count / emp_count * 100), 1) if emp_count > 0 else 0.0
        quota = c.assigned_seat_quota or 1000

        total_learners += emp_count
        total_completed += completed_count
        total_allocated_seats += quota

        client_summaries.append({
            "id": c.id,
            "name": c.name,
            "slug": c.slug,
            "industry": c.industry,
            "total_employees": emp_count,
            "completion_rate_pct": comp_pct,
            "assessment_success_pct": pass_pct,
            "assigned_quota": quota,
            "quota_usage_pct": round((emp_count / quota * 100), 1) if quota > 0 else 0.0,
            "primary_color": c.primary_color,
            "logo_url": c.logo_url,
            "status": c.status
        })

    avg_completion = round((total_completed / total_learners * 100), 1) if total_learners > 0 else 0.0
    partner_capacity = partner.assigned_seat_quota or 5000

    return {
        "partner_id": partner.id,
        "partner_name": partner.name,
        "partner_slug": partner.slug,
        "partner_logo_url": partner.logo_url,
        "co_branding_mode": partner.co_branding_mode or "CO_BRANDED",
        "primary_color": partner.primary_color or "#0F766E",
        "partner_capacity": partner_capacity,
        "total_seats_allocated": total_allocated_seats,
        "remaining_seats": max(0, partner_capacity - total_allocated_seats),
        "total_clients": len(clients),
        "total_learners_managed": total_learners,
        "portfolio_avg_completion_pct": avg_completion,
        "clients": client_summaries
    }

@router.get("/clients")
def list_partner_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_partner_admin)
):
    """
    Returns only the client companies assigned to this middleman partner.
    Ensures strict mutual exclusivity between middlemen.
    """
    partner_id = current_user.company_id
    if not partner_id and current_user.role in ["SUPER_ADMIN", "PLATFORM_ADMIN"]:
        first_p = db.query(Company).filter(Company.company_type == "PARTNER").first()
        partner_id = first_p.id if first_p else None

    clients = db.query(Company).filter(
        Company.partner_id == partner_id,
        Company.is_active == True
    ).all()

    results = []
    for c in clients:
        emp_count = db.query(Employee).filter(Employee.company_id == c.id).count()
        usr_count = db.query(User).filter(User.company_id == c.id).count()
        completed = db.query(Employee).filter(Employee.company_id == c.id, Employee.training_status == "COMPLETED").count()
        comp_pct = round((completed / emp_count * 100), 1) if emp_count > 0 else 0.0

        results.append({
            "id": c.id,
            "name": c.name,
            "slug": c.slug,
            "industry": c.industry,
            "contact_email": c.contact_email,
            "total_employees": emp_count,
            "total_users": usr_count,
            "completion_rate_pct": comp_pct,
            "assigned_seat_quota": c.assigned_seat_quota or 1000,
            "primary_color": c.primary_color,
            "co_branding_mode": c.co_branding_mode,
            "status": c.status
        })
    return results

@router.post("/clients")
def onboard_client_by_partner(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_partner_admin)
):
    """
    Allows a Middleman Partner to assign/onboard a new client organization.
    The new client is strictly locked to this partner.
    """
    partner_id = current_user.company_id
    partner = db.query(Company).filter(Company.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner organization not found")

    client_name = payload.get("name")
    if not client_name:
        raise HTTPException(status_code=400, detail="Client company name is required")

    slug = payload.get("slug") or client_name.lower().replace(" ", "-").replace("&", "and")
    existing = db.query(Company).filter(Company.slug == slug).first()
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"

    quota = int(payload.get("assigned_seat_quota", 1000))
    admin_email = payload.get("admin_email")
    admin_password = payload.get("admin_password", "Client@1234")

    # Create Client Company
    client = Company(
        name=client_name,
        slug=slug,
        company_type="CLIENT",
        partner_id=partner.id,
        partner_name=partner.name,
        partner_logo_url=partner.logo_url,
        co_branding_mode=payload.get("co_branding_mode", partner.co_branding_mode or "CO_BRANDED"),
        assigned_seat_quota=quota,
        industry=payload.get("industry", "Corporate Enterprise"),
        contact_email=payload.get("contact_email") or admin_email,
        primary_color=payload.get("primary_color", "#2A62FF"),
        secondary_color=payload.get("secondary_color", "#1D4ED8"),
        accent_color=payload.get("accent_color", "#F59E0B"),
        sidebar_color=payload.get("sidebar_color", "#061122"),
        welcome_message=f"Welcome to {client_name}'s PoSH Compliance & Sensitization Workspace",
        is_active=True,
        status="ACTIVE"
    )
    db.add(client)
    db.flush()

    # Create Settings
    db.add(CompanySettings(
        company_id=client.id,
        passing_threshold_pct=70.0,
        mandate_year="CY 2025-2026",
        certificate_prefix=f"CERT-{slug.upper()[:6]}-POSH",
        allowed_domains=f"{slug}.com"
    ))

    # Create Initial Client HR Professional User
    if admin_email:
        hr_user = User(
            email=admin_email,
            full_name=payload.get("admin_name", f"{client_name} HR Professional"),
            hashed_password=get_password_hash(admin_password),
            role="COMPANY_ADMIN",
            company_id=client.id,
            designation="HR Professional (Compliance & Analytics)",
            is_active=True,
            status="ACTIVE"
        )
        db.add(hr_user)

    audit = AuditLog(
        company_id=partner.id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="CLIENT_ONBOARDED_BY_PARTNER",
        details=f"Middleman Partner '{partner.name}' assigned new client '{client_name}' with {quota} seats."
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "client_id": client.id,
        "client_name": client.name,
        "slug": client.slug,
        "partner_id": partner.id,
        "partner_name": partner.name,
        "assigned_seat_quota": quota,
        "admin_email": admin_email,
        "message": f"Successfully onboarded '{client_name}' under your partner organization."
    }

@router.patch("/branding")
def update_partner_branding(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_partner_admin)
):
    """
    Updates the Middleman Partner's branding and co-branding strategy:
    - CO_BRANDED: Shows Client Logo + 'Managed by [Partner Logo]'
    - WHITE_LABEL: Shows only Partner branding
    - CLIENT_ONLY: Pure client branding
    """
    partner_id = current_user.company_id
    partner = db.query(Company).filter(Company.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner organization not found")

    if "primary_color" in payload: partner.primary_color = payload["primary_color"]
    if "logo_url" in payload: partner.logo_url = payload["logo_url"]
    if "co_branding_mode" in payload:
        mode = payload["co_branding_mode"]
        if mode in ["CO_BRANDED", "WHITE_LABEL", "CLIENT_ONLY"]:
            partner.co_branding_mode = mode
            # Propagate to all clients under this partner
            db.query(Company).filter(Company.partner_id == partner.id).update({"co_branding_mode": mode})

    db.commit()
    return {
        "status": "success",
        "partner_id": partner.id,
        "co_branding_mode": partner.co_branding_mode,
        "primary_color": partner.primary_color,
        "logo_url": partner.logo_url,
        "message": "Partner co-branding configuration updated successfully."
    }

