from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user, get_tenant_company_id, require_role
from app.models.models import User, Company, CompanySettings, Employee, Webinar, ComplianceDocument, AuditLog, ImportJob
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
    if current_user.role == "PLATFORM_ADMIN":
        return db.query(Company).filter(Company.is_active == True).all()
    if not current_user.company_id:
        return []
    return db.query(Company).filter(Company.id == current_user.company_id).all()

@router.get("/companies/current", response_model=CompanyOut)
def get_current_company_details(
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(company_id, current_user)
    comp = db.query(Company).filter(Company.id == tenant_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")
    return comp

@router.put("/companies/current", response_model=CompanyOut)
def update_current_company_details(
    payload: CompanyUpdate,
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["PLATFORM_ADMIN", "HR_ADMIN"]))
):
    tenant_id = get_tenant_company_id(company_id, current_user)
    comp = db.query(Company).filter(Company.id == tenant_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")

    if payload.name: comp.name = payload.name
    if payload.posh_reporting_url: comp.posh_reporting_url = payload.posh_reporting_url
    if payload.posh_reporting_email: comp.posh_reporting_email = payload.posh_reporting_email
    if payload.ic_chairperson: comp.ic_chairperson = payload.ic_chairperson
    if payload.industry: comp.industry = payload.industry
    if payload.headquarters: comp.headquarters = payload.headquarters

    audit = AuditLog(
        company_id=tenant_id,
        user_email=current_user.email,
        action="COMPANY_PROFILE_UPDATED",
        details=f"Updated company profile details by {current_user.email}"
    )
    db.add(audit)
    db.commit()
    db.refresh(comp)
    return comp

@router.get("/companies/current/settings", response_model=CompanySettingsOut)
def get_company_settings(
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(company_id, current_user)
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
    current_user: User = Depends(require_role(["PLATFORM_ADMIN", "HR_ADMIN"]))
):
    tenant_id = get_tenant_company_id(company_id, current_user)
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
    tenant_id = get_tenant_company_id(company_id, current_user)
    total = db.query(Employee).filter(Employee.company_id == tenant_id).count()
    if total == 0:
        return DashboardKPIs(
            total_employees=0, training_completed=0, training_completed_pct=0.0,
            assessment_completed=0, assessment_completed_pct=0.0, certificates_issued=0,
            certificates_issued_pct=0.0, compliance_docs=0
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
        compliance_docs=docs
    )

@router.get("/dashboard/departments", response_model=List[DepartmentStat])
def get_department_stats(
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(company_id, current_user)
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
    tenant_id = get_tenant_company_id(company_id, current_user)
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

@router.get("/dashboard/program-stages", response_model=List[ProgramStage])
def get_program_stages(
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(company_id, current_user)
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
    tenant_id = get_tenant_company_id(company_id, current_user)
    return db.query(Webinar).filter(Webinar.company_id == tenant_id).order_by(Webinar.session_time.desc()).all()

@router.get("/documents", response_model=List[ComplianceDocOut])
def get_compliance_documents(
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(company_id, current_user)
    return db.query(ComplianceDocument).filter(ComplianceDocument.company_id == tenant_id).all()

@router.get("/audit-logs", response_model=List[RecentActivityOut])
def get_audit_trail(
    company_id: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = get_tenant_company_id(company_id, current_user)
    return db.query(AuditLog).filter(
        (AuditLog.company_id == tenant_id) | (AuditLog.company_id.is_(None))
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
    tenant_id = get_tenant_company_id(company_id, current_user)
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
    current_user: User = Depends(require_role(["PLATFORM_ADMIN", "HR_ADMIN"]))
):
    tenant_id = get_tenant_company_id(company_id, current_user)
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
    tenant_id = get_tenant_company_id(company_id, current_user)
    content = await file.read()
    res = CSVImportService.process_csv(
        file_bytes=content,
        filename=file.filename,
        company_id=tenant_id,
        db=db,
        user_email=current_user.email
    )
    return res
