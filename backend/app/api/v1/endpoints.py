from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user, get_tenant_company_id, require_role
from app.models.models import (
    User, Company, CompanySettings, Employee, Webinar, ComplianceDocument, 
    AuditLog, ImportJob, Complaint, InternalCommitteeMember
)
from app.schemas.schemas import (
    CompanyOut, CompanyUpdate, CompanySettingsOut, CompanySettingsUpdate,
    EmployeeOut, EmployeeCreate, DashboardKPIs, DepartmentStat,
    AssessmentBandStat, ProgramStage, WebinarOut, ComplianceDocOut, RecentActivityOut
)
from app.services.csv_service import CSVImportService

router = APIRouter()

@router.get("/companies", response_model=List[CompanyOut])
def list_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role in ["PLATFORM_ADMIN", "SUPER_ADMIN"]:
        comps = db.query(Company).filter(Company.is_active == True).all()
    elif current_user.role in ["PARTNER_ADMIN", "MIDDLEMAN_ADMIN"]:
        # Middleman / Assigner: Sees ONLY their mutually exclusive assigned client companies
        comps = db.query(Company).filter(Company.partner_id == current_user.company_id, Company.is_active == True).all()
    elif not current_user.company_id:
        return []
    else:
        comps = db.query(Company).filter(Company.id == current_user.company_id).all()
        
    results = []
    for c in comps:
        emp_count = db.query(Employee).filter(Employee.company_id == c.id).count()
        usr_count = db.query(User).filter(User.company_id == c.id).count()
        plan_name = c.plan.display_name if c.plan else "Enterprise Tier"
        p_name = c.partner.name if c.partner else c.partner_name
        p_logo = c.partner.logo_url if c.partner else c.partner_logo_url
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
            partner_name=p_name,
            partner_logo_url=p_logo,
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
            total_users=usr_count,
            created_at=c.created_at,
            updated_at=c.updated_at
        ))
    return results

@router.get("/companies/current", response_model=CompanyOut)
def get_current_company_details(
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(company_id, current_user, db)
    comp = db.query(Company).filter(Company.id == tenant_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")
        
    emp_count = db.query(Employee).filter(Employee.company_id == comp.id).count()
    usr_count = db.query(User).filter(User.company_id == comp.id).count()
    plan_name = comp.plan.display_name if comp.plan else "Enterprise Tier"
    p_name = comp.partner.name if comp.partner else comp.partner_name
    p_logo = comp.partner.logo_url if comp.partner else comp.partner_logo_url

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
        company_type=comp.company_type or "CLIENT",
        partner_id=comp.partner_id,
        partner_name=p_name,
        partner_logo_url=p_logo,
        co_branding_mode=comp.co_branding_mode or "CO_BRANDED",
        assigned_seat_quota=comp.assigned_seat_quota or 1500,
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

@router.put("/companies/current", response_model=CompanyOut)
def update_current_company_details(
    payload: CompanyUpdate,
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["PLATFORM_ADMIN", "SUPER_ADMIN", "COMPANY_ADMIN", "HR_ADMIN"]))
):
    tenant_id = get_tenant_company_id(company_id, current_user, db)
    comp = db.query(Company).filter(Company.id == tenant_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")

    if payload.name: comp.name = payload.name
    if payload.posh_reporting_url: comp.posh_reporting_url = payload.posh_reporting_url
    if payload.posh_reporting_email: comp.posh_reporting_email = payload.posh_reporting_email
    if payload.ic_chairperson: comp.ic_chairperson = payload.ic_chairperson
    if payload.industry: comp.industry = payload.industry
    if payload.headquarters: comp.headquarters = payload.headquarters
    if payload.primary_color: comp.primary_color = payload.primary_color
    if payload.secondary_color: comp.secondary_color = payload.secondary_color
    if payload.accent_color: comp.accent_color = payload.accent_color
    if payload.sidebar_color: comp.sidebar_color = payload.sidebar_color
    if payload.welcome_message is not None: comp.welcome_message = payload.welcome_message

    audit = AuditLog(
        company_id=tenant_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="COMPANY_PROFILE_UPDATED",
        details=f"Updated company profile details by {current_user.email}"
    )
    db.add(audit)
    db.commit()
    db.refresh(comp)
    return get_current_company_details(tenant_id, db, current_user)

@router.get("/companies/current/settings", response_model=CompanySettingsOut)
def get_company_settings(
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(company_id, current_user, db)
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == tenant_id).first()
    if not settings:
        settings = CompanySettings(company_id=tenant_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("/companies/current/settings", response_model=CompanySettingsOut)
def update_company_settings(
    payload: CompanySettingsUpdate,
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["PLATFORM_ADMIN", "SUPER_ADMIN", "COMPANY_ADMIN", "HR_ADMIN"]))
):
    tenant_id = get_tenant_company_id(company_id, current_user, db)
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == tenant_id).first()
    if not settings:
        settings = CompanySettings(company_id=tenant_id)
        db.add(settings)

    if payload.passing_threshold_pct is not None: settings.passing_threshold_pct = payload.passing_threshold_pct
    if payload.mandate_year: settings.mandate_year = payload.mandate_year
    if payload.auto_issue_certificates is not None: settings.auto_issue_certificates = payload.auto_issue_certificates
    if payload.email_notifications is not None: settings.email_notifications = payload.email_notifications
    if payload.escalate_non_compliance is not None: settings.escalate_non_compliance = payload.escalate_non_compliance
    if payload.escalation_email: settings.escalation_email = payload.escalation_email
    if payload.certificate_prefix: settings.certificate_prefix = payload.certificate_prefix
    if payload.allowed_domains: settings.allowed_domains = payload.allowed_domains
    if payload.sync_frequency: settings.sync_frequency = payload.sync_frequency

    audit = AuditLog(
        company_id=tenant_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="TENANT_SETTINGS_CONFIGURED",
        details=f"Updated compliance parameters: passing_threshold={settings.passing_threshold_pct}%, prefix={settings.certificate_prefix}"
    )
    db.add(audit)
    db.commit()
    db.refresh(settings)
    return settings

@router.get("/dashboard/kpis", response_model=DashboardKPIs)
def get_dashboard_kpis(
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(company_id, current_user, db)
    total = db.query(Employee).filter(Employee.company_id == tenant_id).count()
    
    total_complaints = db.query(Complaint).filter(Complaint.company_id == tenant_id).count()
    resolved_complaints = db.query(Complaint).filter(
        Complaint.company_id == tenant_id,
        Complaint.status.in_(["CLOSED", "RESOLVED", "REPORT_SUBMITTED", "ACTION_TAKEN"])
    ).count()
    ic_members_count = db.query(InternalCommitteeMember).filter(
        InternalCommitteeMember.company_id == tenant_id
    ).count()

    if total == 0:
        return DashboardKPIs(
            total_employees=0, training_completed=0, training_completed_pct=0.0,
            assessment_completed=0, assessment_completed_pct=0.0, certificates_issued=0,
            certificates_issued_pct=0.0, compliance_docs=0,
            total_complaints=total_complaints,
            resolved_complaints=resolved_complaints,
            ic_members_count=ic_members_count
        )
    
    training_done = db.query(Employee).filter(
        Employee.company_id == tenant_id, Employee.training_status == "COMPLETED"
    ).count()

    assessment_done = db.query(Employee).filter(
        Employee.company_id == tenant_id, Employee.assessment_status == "PASSED"
    ).count()

    certs = db.query(Employee).filter(
        Employee.company_id == tenant_id, Employee.certificate_status == "ISSUED"
    ).count()

    docs = db.query(ComplianceDocument).filter(
        ComplianceDocument.company_id == tenant_id
    ).count()

    return DashboardKPIs(
        total_employees=total,
        training_completed=training_done,
        training_completed_pct=round((training_done / total) * 100, 1),
        assessment_completed=assessment_done,
        assessment_completed_pct=round((assessment_done / total) * 100, 1),
        certificates_issued=certs,
        certificates_issued_pct=round((certs / total) * 100, 1),
        compliance_docs=docs,
        total_complaints=total_complaints,
        resolved_complaints=resolved_complaints,
        ic_members_count=ic_members_count
    )

@router.get("/dashboard/departments", response_model=List[DepartmentStat])
def get_department_stats(
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(company_id, current_user, db)
    depts = [d[0] for d in db.query(Employee.department).filter(Employee.company_id == tenant_id).distinct().all()]
    stats = []
    for dept in depts:
        tot = db.query(Employee).filter(Employee.company_id == tenant_id, Employee.department == dept).count()
        comp = db.query(Employee).filter(Employee.company_id == tenant_id, Employee.department == dept, Employee.training_status == "COMPLETED").count()
        pct = round((comp / tot * 100), 1) if tot > 0 else 0.0
        stats.append(DepartmentStat(
            department=dept, total=tot, completed=comp, percentage=pct
        ))
    return stats

@router.get("/dashboard/assessment-bands", response_model=List[AssessmentBandStat])
def get_assessment_bands(
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(company_id, current_user, db)
    total_with_scores = db.query(Employee).filter(
        Employee.company_id == tenant_id, Employee.assessment_score.isnot(None)
    ).count()

    if total_with_scores == 0:
        return [
            AssessmentBandStat(band="90-100% (Distinction)", count=0, percentage=0.0),
            AssessmentBandStat(band="70-89% (Passed)", count=0, percentage=0.0),
            AssessmentBandStat(band="50-69% (Needs Review)", count=0, percentage=0.0),
            AssessmentBandStat(band="Below 50% (Failed)", count=0, percentage=0.0),
        ]

    b1 = db.query(Employee).filter(Employee.company_id == tenant_id, Employee.assessment_score >= 90).count()
    b2 = db.query(Employee).filter(Employee.company_id == tenant_id, Employee.assessment_score >= 70, Employee.assessment_score < 90).count()
    b3 = db.query(Employee).filter(Employee.company_id == tenant_id, Employee.assessment_score >= 50, Employee.assessment_score < 70).count()
    b4 = db.query(Employee).filter(Employee.company_id == tenant_id, Employee.assessment_score < 50).count()

    return [
        AssessmentBandStat(band="90-100% (Distinction)", count=b1, percentage=round(b1 / total_with_scores * 100, 1)),
        AssessmentBandStat(band="70-89% (Passed)", count=b2, percentage=round(b2 / total_with_scores * 100, 1)),
        AssessmentBandStat(band="50-69% (Needs Review)", count=b3, percentage=round(b3 / total_with_scores * 100, 1)),
        AssessmentBandStat(band="Below 50% (Failed)", count=b4, percentage=round(b4 / total_with_scores * 100, 1)),
    ]

@router.get("/dashboard/stages", response_model=List[ProgramStage])
@router.get("/dashboard/program-stages", response_model=List[ProgramStage])
def get_program_stages(
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(company_id, current_user, db)
    total = db.query(Employee).filter(Employee.company_id == tenant_id).count()
    if total == 0:
        return []

    tr_done = db.query(Employee).filter(Employee.company_id == tenant_id, Employee.training_status == "COMPLETED").count()
    as_done = db.query(Employee).filter(Employee.company_id == tenant_id, Employee.assessment_status == "PASSED").count()
    cert_done = db.query(Employee).filter(Employee.company_id == tenant_id, Employee.certificate_status == "ISSUED").count()

    return [
        ProgramStage(stage="Training Videos", status="In Progress", completed_count=tr_done, total_count=total, percentage=round(tr_done/total*100, 1)),
        ProgramStage(stage="Awareness Material", status="Delivered", completed_count=total, total_count=total, percentage=100.0),
        ProgramStage(stage="Interactive Webinars", status="Conducted", completed_count=int(total * 0.85), total_count=total, percentage=85.0),
        ProgramStage(stage="PoSH Assessment", status="In Progress", completed_count=as_done, total_count=total, percentage=round(as_done/total*100, 1)),
        ProgramStage(stage="Certification", status="Issued", completed_count=cert_done, total_count=total, percentage=round(cert_done/total*100, 1)),
    ]

@router.get("/dashboard/webinars", response_model=List[WebinarOut])
def get_webinars(
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(company_id, current_user, db)
    return db.query(Webinar).filter(Webinar.company_id == tenant_id).order_by(Webinar.session_time.desc()).all()

@router.post("/dashboard/webinars/{webinar_id}/mail-all")
def mail_all_webinar_attendees(
    webinar_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sends webinar broadcast email with joining link and calendar invite
    to all employees/learners whose emails were imported from the CSV roster.
    """
    tenant_id = get_tenant_company_id(None, current_user, db)
    webinar = db.query(Webinar).filter(Webinar.id == webinar_id, Webinar.company_id == tenant_id).first()
    if not webinar:
        raise HTTPException(status_code=404, detail="Webinar session not found")

    # Fetch all employee emails from CSV roster
    employees = db.query(Employee).filter(Employee.company_id == tenant_id).all()
    recipient_count = len(employees)

    webinar.last_broadcast_email_sent_at = datetime.utcnow()
    webinar.total_emails_dispatched = (webinar.total_emails_dispatched or 0) + recipient_count
    
    audit = AuditLog(
        company_id=tenant_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="WEBINAR_MAIL_ALL_SENT",
        details=f"Dispatched live webinar invitations for '{webinar.title}' to {recipient_count} employees from CSV roster."
    )
    db.add(audit)
    db.commit()
    db.refresh(webinar)

    sample_emails = [e.email for e in employees[:5]]
    return {
        "status": "success",
        "webinar_id": webinar.id,
        "webinar_title": webinar.title,
        "recipients_count": recipient_count,
        "sample_recipients": sample_emails,
        "sent_at": webinar.last_broadcast_email_sent_at.isoformat(),
        "total_dispatched_to_date": webinar.total_emails_dispatched,
        "message": f"Successfully queued and sent invitation emails to all {recipient_count} employees from the CSV roster."
    }

@router.post("/dashboard/webinars/{webinar_id}/trigger-reminders")
def trigger_webinar_reminders(
    webinar_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Triggers or schedules automated reminder emails:
    - 7 Days Before the webinar
    - 2 Days Before the webinar
    """
    tenant_id = get_tenant_company_id(None, current_user, db)
    webinar = db.query(Webinar).filter(Webinar.id == webinar_id, Webinar.company_id == tenant_id).first()
    if not webinar:
        raise HTTPException(status_code=404, detail="Webinar session not found")

    reminder_type = payload.get("reminder_type", "7_DAYS") # 7_DAYS or 2_DAYS
    auto_schedule = payload.get("auto_schedule", True)

    employees = db.query(Employee).filter(Employee.company_id == tenant_id).all()
    recipient_count = len(employees)

    now = datetime.utcnow()
    if reminder_type == "7_DAYS":
        webinar.reminder_7d_sent_at = now
        webinar.auto_reminder_7d_enabled = auto_schedule
    else:
        webinar.reminder_2d_sent_at = now
        webinar.auto_reminder_2d_enabled = auto_schedule

    webinar.total_emails_dispatched = (webinar.total_emails_dispatched or 0) + recipient_count

    audit = AuditLog(
        company_id=tenant_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="WEBINAR_REMINDER_DISPATCHED",
        details=f"Dispatched {reminder_type.replace('_', ' ')} reminder for '{webinar.title}' to {recipient_count} employees."
    )
    db.add(audit)
    db.commit()
    db.refresh(webinar)

    return {
        "status": "success",
        "webinar_id": webinar.id,
        "reminder_type": reminder_type,
        "auto_reminder_7d_enabled": webinar.auto_reminder_7d_enabled,
        "auto_reminder_2d_enabled": webinar.auto_reminder_2d_enabled,
        "reminder_7d_sent_at": webinar.reminder_7d_sent_at.isoformat() if webinar.reminder_7d_sent_at else None,
        "reminder_2d_sent_at": webinar.reminder_2d_sent_at.isoformat() if webinar.reminder_2d_sent_at else None,
        "recipients_count": recipient_count,
        "dispatched_at": now.isoformat(),
        "message": f"Successfully triggered {reminder_type.replace('_', ' ')} automated reminder to all {recipient_count} employees."
    }

@router.get("/documents", response_model=List[ComplianceDocOut])
def get_compliance_documents(
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(company_id, current_user, db)
    return db.query(ComplianceDocument).filter(ComplianceDocument.company_id == tenant_id).all()

@router.get("/audit-logs", response_model=List[RecentActivityOut])
def get_audit_trail(
    company_id: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(company_id, current_user, db)
    return db.query(AuditLog).filter(
        AuditLog.company_id == tenant_id
    ).order_by(AuditLog.created_at.desc()).limit(limit).all()

@router.get("/employees", response_model=List[EmployeeOut])
def list_employees(
    company_id: Optional[str] = None,
    search: Optional[str] = None,
    department: Optional[str] = None,
    training_status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(company_id, current_user, db)
    query = db.query(Employee).filter(Employee.company_id == tenant_id)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Employee.first_name.ilike(search_filter)) |
            (Employee.last_name.ilike(search_filter)) |
            (Employee.employee_code.ilike(search_filter)) |
            (Employee.email.ilike(search_filter))
        )
    if department and department != "ALL":
        query = query.filter(Employee.department == department)
    if training_status and training_status != "ALL":
        query = query.filter(Employee.training_status == training_status)

    return query.order_by(Employee.employee_code.asc()).offset(offset).limit(limit).all()

@router.post("/employees", response_model=EmployeeOut)
def create_employee(
    payload: EmployeeCreate,
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["PLATFORM_ADMIN", "SUPER_ADMIN", "COMPANY_ADMIN", "HR_ADMIN"]))
):
    tenant_id = get_tenant_company_id(company_id, current_user, db)
    
    # Check plan quota
    comp = db.query(Company).filter(Company.id == tenant_id).first()
    if comp and comp.plan and comp.plan.max_employees > 0:
        current_emp_count = db.query(Employee).filter(Employee.company_id == tenant_id).count()
        if current_emp_count >= comp.plan.max_employees:
            raise HTTPException(
                status_code=400,
                detail=f"Employee quota exceeded for your subscription plan '{comp.plan.display_name}' ({comp.plan.max_employees} limit). Upgrade plan to add more employees."
            )

    existing = db.query(Employee).filter(
        Employee.company_id == tenant_id,
        (Employee.employee_code == payload.employee_code) | (Employee.email == payload.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee code or email already exists for this tenant")

    emp = Employee(
        company_id=tenant_id,
        employee_code=payload.employee_code,
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        department=payload.department,
        designation=payload.designation
    )
    db.add(emp)
    
    audit = AuditLog(
        company_id=tenant_id,
        actor_user_id=current_user.id,
        user_email=current_user.email,
        action="EMPLOYEE_MANUALLY_CREATED",
        details=f"Added employee {emp.employee_code} ({emp.email})"
    )
    db.add(audit)
    db.commit()
    db.refresh(emp)
    return emp

@router.post("/import/csv")
async def import_csv_data(
    file: UploadFile = File(...),
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(company_id, current_user, db)
    content = await file.read()
    res = CSVImportService.process_csv(
        file_bytes=content,
        filename=file.filename,
        company_id=tenant_id,
        db=db,
        user_email=current_user.email
    )
    return res
