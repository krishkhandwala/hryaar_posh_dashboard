import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.core.config import settings
from app.core.deps import get_current_user, require_partner_admin, require_permission
from app.core.security import get_password_hash
from app.models.models import (
    Company, CompanySettings, User, Employee, SubscriptionPlan, Subscription, AuditLog
)

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB


async def _persist_uploaded_logo(comp: Company, file: UploadFile) -> str:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type '{file.content_type}'. Allowed types: PNG, JPEG, SVG, WebP."
        )
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds maximum size of 5MB")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "png"
    clean_ext = ext.lower() if ext.lower() in ["png", "jpg", "jpeg", "svg", "webp"] else "png"
    filename = f"brand_{comp.slug}_{uuid.uuid4().hex[:8]}.{clean_ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    logo_url = f"/static/uploads/{filename}"
    comp.logo_url = logo_url
    return logo_url


def _resolve_partner(current_user: User, db: Session) -> Company:
    """
    Strictly resolves the authenticated Partner organisation.
    Prevents partner_id=None leaks against direct clients (partner_id IS NULL).
    """
    partner_id = current_user.company_id
    if not partner_id and current_user.role in ["SUPER_ADMIN", "PLATFORM_ADMIN"]:
        first_p = db.query(Company).filter(Company.company_type == "PARTNER", Company.is_active == True).first()
        partner_id = first_p.id if first_p else None

    if not partner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with a verified Partner organisation"
        )

    partner = db.query(Company).filter(
        Company.id == partner_id,
        Company.company_type == "PARTNER"
    ).first()

    if not partner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active Partner organisation record not found"
        )
    return partner


@router.get("/overview")
def get_partner_portfolio_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("partner.clients.read"))
):
    """
    Returns Partner organisation portfolio metrics focused purely on client organisations,
    allocated seat licences, and HR users assigned — never exposing client employee analytics or grievances.
    """
    partner = _resolve_partner(current_user, db)

    clients = db.query(Company).filter(
        Company.partner_id == partner.id,
        Company.company_type == "CLIENT",
        Company.is_active == True
    ).all()

    total_users_assigned = 0
    total_allocated_seats = 0
    client_summaries = []

    for c in clients:
        assigned_users_rows = db.query(User).filter(
            User.company_id == c.id,
            User.role != "EMPLOYEE"
        ).order_by(User.created_at.desc()).all()
        quota = c.assigned_seat_quota or 1000

        total_users_assigned += len(assigned_users_rows)
        total_allocated_seats += quota

        client_summaries.append({
            "id": c.id,
            "name": c.name,
            "slug": c.slug,
            "industry": c.industry,
            "total_users_assigned": len(assigned_users_rows),
            "assigned_users": [
                {
                    "id": u.id,
                    "full_name": u.full_name,
                    "email": u.email,
                    "role": u.role,
                    "designation": u.designation,
                    "status": u.status
                }
                for u in assigned_users_rows
            ],
            "assigned_quota": quota,
            "primary_color": c.primary_color or "#2A62FF",
            "secondary_color": c.secondary_color or "#1D4ED8",
            "accent_color": c.accent_color or "#F59E0B",
            "sidebar_color": c.sidebar_color or "#061122",
            "welcome_message": c.welcome_message,
            "co_branding_mode": c.co_branding_mode or "CO_BRANDED",
            "logo_url": c.logo_url,
            "status": c.status
        })

    partner_capacity = partner.assigned_seat_quota or 5000

    return {
        "partner_id": partner.id,
        "partner_name": partner.name,
        "partner_slug": partner.slug,
        "partner_logo_url": partner.logo_url,
        "co_branding_mode": partner.co_branding_mode or "CO_BRANDED",
        "primary_color": partner.primary_color or "#0F766E",
        "secondary_color": partner.secondary_color or "#115E59",
        "accent_color": partner.accent_color or "#F59E0B",
        "sidebar_color": partner.sidebar_color or "#061122",
        "welcome_message": partner.welcome_message,
        "partner_capacity": partner_capacity,
        "total_seats_allocated": total_allocated_seats,
        "remaining_seats": max(0, partner_capacity - total_allocated_seats),
        "total_clients": len(clients),
        "total_users_assigned": total_users_assigned,
        "clients": client_summaries
    }


@router.get("/clients")
def list_partner_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("partner.clients.read"))
):
    """
    Returns ONLY client organisations linked to this Partner, showing assigned HR users
    and seat licences assigned (no employee training analytics).
    """
    partner = _resolve_partner(current_user, db)

    clients = db.query(Company).filter(
        Company.partner_id == partner.id,
        Company.company_type == "CLIENT",
        Company.is_active == True
    ).all()

    results = []
    for c in clients:
        assigned_users_rows = db.query(User).filter(
            User.company_id == c.id,
            User.role != "EMPLOYEE"
        ).order_by(User.created_at.desc()).all()

        results.append({
            "id": c.id,
            "name": c.name,
            "slug": c.slug,
            "industry": c.industry,
            "contact_email": c.contact_email,
            "total_users": len(assigned_users_rows),
            "total_users_assigned": len(assigned_users_rows),
            "assigned_users": [
                {
                    "id": u.id,
                    "full_name": u.full_name,
                    "email": u.email,
                    "role": u.role,
                    "designation": u.designation,
                    "status": u.status
                }
                for u in assigned_users_rows
            ],
            "assigned_seat_quota": c.assigned_seat_quota or 1000,
            "primary_color": c.primary_color or "#2A62FF",
            "secondary_color": c.secondary_color or "#1D4ED8",
            "accent_color": c.accent_color or "#F59E0B",
            "sidebar_color": c.sidebar_color or "#061122",
            "welcome_message": c.welcome_message,
            "logo_url": c.logo_url,
            "co_branding_mode": c.co_branding_mode or "CO_BRANDED",
            "status": c.status
        })
    return results


@router.post("/clients/{client_id}/users")
def assign_user_to_client_by_partner(
    client_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("partner.clients.create"))
):
    """
    Allows a Partner to assign an HR Professional / Client Admin user to one of their client organisations.
    """
    partner = _resolve_partner(current_user, db)
    client = db.query(Company).filter(
        Company.id == client_id,
        Company.company_type == "CLIENT"
    ).first()
    if not client or client.partner_id != partner.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Client does not belong to your partner organisation"
        )

    email = (payload.get("email") or "").strip()
    full_name = (payload.get("full_name") or "").strip()
    password = payload.get("password") or "Client@1234"
    role = payload.get("role") or "COMPANY_ADMIN"

    if not email or not full_name:
        raise HTTPException(status_code=400, detail="User full_name and email are required")
    if role not in ["COMPANY_ADMIN", "HR_MANAGER"]:
        raise HTTPException(status_code=400, detail="Partners can only assign COMPANY_ADMIN or HR_MANAGER roles")

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail=f"User with email '{email}' already exists")

    new_user = User(
        email=email,
        full_name=full_name,
        hashed_password=get_password_hash(password),
        role=role,
        company_id=client.id,
        designation=payload.get("designation") or "HR Analytics Administrator",
        is_active=True,
        status="ACTIVE"
    )
    db.add(new_user)
    db.add(AuditLog(
        company_id=partner.id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="CLIENT_USER_ASSIGNED_BY_PARTNER",
        entity_type="User",
        details=f"Partner '{partner.name}' assigned HR user '{email}' to '{client.name}'."
    ))
    db.commit()
    db.refresh(new_user)

    return {
        "status": "success",
        "id": new_user.id,
        "full_name": new_user.full_name,
        "email": new_user.email,
        "role": new_user.role,
        "company_id": client.id
    }


@router.post("/clients")
def onboard_client_by_partner(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("partner.clients.create"))
):
    """
    Allows an authorised Partner user to onboard a new client organisation.
    Enforces atomic capacity checking against the Partner's total purchased seat pool.
    """
    partner = _resolve_partner(current_user, db)

    client_name = (payload.get("name") or "").strip()
    if not client_name:
        raise HTTPException(status_code=400, detail="Client company name is required")

    try:
        quota = int(payload.get("assigned_seat_quota", 1000))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid assigned_seat_quota value")

    if quota <= 0:
        raise HTTPException(status_code=400, detail="Seat quota must be greater than zero")

    # Enforce Partner wholesale seat pool limit
    existing_allocated = db.query(func.coalesce(func.sum(Company.assigned_seat_quota), 0)).filter(
        Company.partner_id == partner.id,
        Company.company_type == "CLIENT",
        Company.is_active == True
    ).scalar() or 0
    partner_capacity = partner.assigned_seat_quota or 5000

    if existing_allocated + quota > partner_capacity:
        available = max(0, partner_capacity - existing_allocated)
        raise HTTPException(
            status_code=400,
            detail=f"Seat pool exceeded: requested {quota} seats, only {available} of {partner_capacity} seats available."
        )

    admin_email = payload.get("admin_email")
    if admin_email:
        existing_usr = db.query(User).filter(User.email == admin_email).first()
        if existing_usr:
            raise HTTPException(status_code=400, detail=f"User with email '{admin_email}' already exists")

    slug = payload.get("slug") or client_name.lower().replace(" ", "-").replace("&", "and")
    existing = db.query(Company).filter(Company.slug == slug).first()
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"

    admin_password = payload.get("admin_password", "Client@1234")

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

    db.add(CompanySettings(
        company_id=client.id,
        passing_threshold_pct=70.0,
        mandate_year="CY 2025-2026",
        certificate_prefix=f"CERT-{slug.upper()[:6]}-POSH",
        allowed_domains=f"{slug}.com"
    ))

    if admin_email:
        hr_user = User(
            email=admin_email,
            full_name=payload.get("admin_name", f"{client_name} HR Administrator"),
            hashed_password=get_password_hash(admin_password),
            role="COMPANY_ADMIN",
            company_id=client.id,
            designation="HR Compliance Administrator",
            is_active=True,
            status="ACTIVE"
        )
        db.add(hr_user)

    db.add(AuditLog(
        company_id=partner.id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="CLIENT_ONBOARDED_BY_PARTNER",
        entity_type="Company",
        entity_id=client.id,
        details=f"Partner '{partner.name}' onboarded client '{client_name}' with {quota} seats."
    ))
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
        "message": f"Successfully onboarded '{client_name}'."
    }


@router.post("/clients/{client_id}/allocate-seats")
def allocate_client_seats(
    client_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("partner.licences.allocate"))
):
    """
    Updates seat allocation for a partner's client while strictly preventing over-allocation
    beyond the partner's available seat capacity or dropping below current active employees.
    """
    partner = _resolve_partner(current_user, db)

    client = db.query(Company).filter(
        Company.id == client_id,
        Company.company_type == "CLIENT"
    ).first()
    if not client or client.partner_id != partner.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Client does not belong to your partner organisation"
        )

    try:
        new_quota = int(payload.get("seat_quota", 0))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid seat_quota value")

    if new_quota <= 0:
        raise HTTPException(status_code=400, detail="Allocated seat quota must be positive")

    active_emp_count = db.query(Employee).filter(Employee.company_id == client.id).count()
    if new_quota < active_emp_count:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reduce seat quota below existing employee count ({active_emp_count})."
        )

    other_allocated = db.query(func.coalesce(func.sum(Company.assigned_seat_quota), 0)).filter(
        Company.partner_id == partner.id,
        Company.company_type == "CLIENT",
        Company.is_active == True,
        Company.id != client.id
    ).scalar() or 0

    partner_capacity = partner.assigned_seat_quota or 5000
    if other_allocated + new_quota > partner_capacity:
        max_allowable = max(0, partner_capacity - other_allocated)
        raise HTTPException(
            status_code=400,
            detail=f"Allocation rejected: partner capacity exceeded. Maximum assignable seats for this client is {max_allowable}."
        )

    old_quota = client.assigned_seat_quota or 0
    client.assigned_seat_quota = new_quota

    db.add(AuditLog(
        company_id=partner.id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="PARTNER_SEAT_QUOTA_UPDATED",
        entity_type="Company",
        entity_id=client.id,
        details=f"Updated seat allocation for '{client.name}' from {old_quota} to {new_quota}."
    ))
    db.commit()

    return {
        "status": "success",
        "client_id": client.id,
        "client_name": client.name,
        "previous_quota": old_quota,
        "assigned_seat_quota": new_quota,
        "remaining_partner_seats": max(0, partner_capacity - (other_allocated + new_quota))
    }


@router.patch("/branding")
def update_partner_branding(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("partner.branding.manage"))
):
    """
    Updates the Partner's own branding and optionally propagates co-branding strategy across managed clients:
    - CO_BRANDED: Client Logo + 'Managed by [Partner Name]'
    - WHITE_LABEL: Partner branding experience
    - CLIENT_ONLY: Pure client branding
    """
    partner = _resolve_partner(current_user, db)

    if "primary_color" in payload and payload["primary_color"]:
        partner.primary_color = payload["primary_color"]
    if "secondary_color" in payload and payload["secondary_color"]:
        partner.secondary_color = payload["secondary_color"]
    if "accent_color" in payload and payload["accent_color"]:
        partner.accent_color = payload["accent_color"]
    if "sidebar_color" in payload and payload["sidebar_color"]:
        partner.sidebar_color = payload["sidebar_color"]
    if "welcome_message" in payload and payload["welcome_message"] is not None:
        partner.welcome_message = payload["welcome_message"]
    if "logo_url" in payload and payload["logo_url"] is not None:
        partner.logo_url = payload["logo_url"] or None
        db.query(Company).filter(Company.partner_id == partner.id).update({"partner_logo_url": partner.logo_url})
    if "co_branding_mode" in payload:
        mode = payload["co_branding_mode"]
        if mode in ["CO_BRANDED", "WHITE_LABEL", "CLIENT_ONLY"]:
            partner.co_branding_mode = mode
            db.query(Company).filter(Company.partner_id == partner.id).update({"co_branding_mode": mode})

    db.add(AuditLog(
        company_id=partner.id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="PARTNER_BRANDING_UPDATED",
        entity_type="Company",
        entity_id=partner.id,
        details=f"Partner '{partner.name}' updated white-label branding ({partner.co_branding_mode})."
    ))
    db.commit()
    return {
        "status": "success",
        "partner_id": partner.id,
        "co_branding_mode": partner.co_branding_mode,
        "primary_color": partner.primary_color,
        "secondary_color": partner.secondary_color,
        "accent_color": partner.accent_color,
        "sidebar_color": partner.sidebar_color,
        "welcome_message": partner.welcome_message,
        "logo_url": partner.logo_url,
        "message": "Partner branding configuration updated successfully."
    }


@router.post("/branding/logo")
async def upload_partner_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("partner.branding.manage"))
):
    """
    Uploads a brand logo file for the authenticated Partner organisation and syncs it to managed clients.
    """
    partner = _resolve_partner(current_user, db)
    logo_url = await _persist_uploaded_logo(partner, file)
    db.query(Company).filter(Company.partner_id == partner.id).update({"partner_logo_url": logo_url})
    db.add(AuditLog(
        company_id=partner.id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="PARTNER_LOGO_UPLOADED",
        entity_type="Company",
        entity_id=partner.id,
        details=f"Uploaded partner logo: {logo_url}"
    ))
    db.commit()
    return {"status": "success", "partner_id": partner.id, "logo_url": logo_url}


@router.put("/clients/{client_id}/branding")
def update_client_branding_by_partner(
    client_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("partner.branding.manage"))
):
    """
    Allows a Partner to configure bespoke branding (colors, logo URL, welcome message, co-branding mode)
    for any individual client organisation they manage.
    """
    partner = _resolve_partner(current_user, db)
    client = db.query(Company).filter(
        Company.id == client_id,
        Company.company_type == "CLIENT"
    ).first()
    if not client or client.partner_id != partner.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Client does not belong to your partner organisation"
        )

    if "primary_color" in payload and payload["primary_color"]:
        client.primary_color = payload["primary_color"]
    if "secondary_color" in payload and payload["secondary_color"]:
        client.secondary_color = payload["secondary_color"]
    if "accent_color" in payload and payload["accent_color"]:
        client.accent_color = payload["accent_color"]
    if "sidebar_color" in payload and payload["sidebar_color"]:
        client.sidebar_color = payload["sidebar_color"]
    if "welcome_message" in payload and payload["welcome_message"] is not None:
        client.welcome_message = payload["welcome_message"]
    if "logo_url" in payload and payload["logo_url"] is not None:
        client.logo_url = payload["logo_url"] or None
    if "co_branding_mode" in payload and payload["co_branding_mode"] in ["CO_BRANDED", "WHITE_LABEL", "CLIENT_ONLY"]:
        client.co_branding_mode = payload["co_branding_mode"]

    db.add(AuditLog(
        company_id=client.id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="CLIENT_BRANDING_UPDATED_BY_PARTNER",
        entity_type="Company",
        entity_id=client.id,
        details=f"Partner '{partner.name}' updated branding for client '{client.name}'."
    ))
    db.commit()
    return {
        "status": "success",
        "client_id": client.id,
        "logo_url": client.logo_url,
        "primary_color": client.primary_color,
        "secondary_color": client.secondary_color,
        "accent_color": client.accent_color,
        "sidebar_color": client.sidebar_color,
        "welcome_message": client.welcome_message,
        "co_branding_mode": client.co_branding_mode,
    }


@router.post("/clients/{client_id}/branding/logo")
async def upload_client_logo_by_partner(
    client_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("partner.branding.manage"))
):
    """
    Uploads a brand logo file for an owned client organisation under this Partner.
    """
    partner = _resolve_partner(current_user, db)
    client = db.query(Company).filter(
        Company.id == client_id,
        Company.company_type == "CLIENT"
    ).first()
    if not client or client.partner_id != partner.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Client does not belong to your partner organisation"
        )

    logo_url = await _persist_uploaded_logo(client, file)
    db.add(AuditLog(
        company_id=client.id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="CLIENT_LOGO_UPLOADED_BY_PARTNER",
        entity_type="Company",
        entity_id=client.id,
        details=f"Partner '{partner.name}' uploaded client logo: {logo_url}"
    ))
    db.commit()
    return {"status": "success", "client_id": client.id, "logo_url": logo_url}
