from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.db.session import get_db
from app.core.deps import get_current_user, get_tenant_company_id, require_role
from app.models.models import User, Company, Employee, Webinar, ComplianceDocument, AuditLog, ImportJob
from app.schemas.schemas import (
    CompanyOut, EmployeeOut, DashboardKPIs, DepartmentStat,
    AssessmentBandStat, ProgramStage, AwarenessGap, WebinarOut, RecentActivityOut
)
from app.services.csv_service import CSVImportService

router = APIRouter()

@router.get("/companies", response_model=List[CompanyOut])
def list_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List accessible companies. Platform Admins see all; others see their own."""
    if current_user.role == "PLATFORM_ADMIN":
        return db.query(Company).filter(Company.is_active == True).all()
    if not current_user.company_id:
        return []
    return db.query(Company).filter(Company.id == current_user.company_id).all()

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
            total_employees=0,
            training_completed=0,
            training_completed_pct=0.0,
            assessment_completed=0,
            assessment_completed_pct=0.0,
            certificates_issued=0,
            certificates_issued_pct=0.0,
            compliance_docs=0
        )
    
    training_done = db.query(Employee).filter(
        Employee.company_id == tenant_id,
        Employee.training_status == "COMPLETED"
    ).count()

    assessment_done = db.query(Employee).filter(
        Employee.company_id == tenant_id,
        Employee.assessment_status == "PASSED"
    ).count()

    certs = db.query(Employee).filter(
        Employee.company_id == tenant_id,
        Employee.certificate_status == "ISSUED"
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
    
    # Query distinct departments for this tenant
    depts = [d[0] for d in db.query(Employee.department).filter(Employee.company_id == tenant_id).distinct().all()]
    
    stats = []
    for dept in depts:
        tot = db.query(Employee).filter(Employee.company_id == tenant_id, Employee.department == dept).count()
        comp = db.query(Employee).filter(Employee.company_id == tenant_id, Employee.department == dept, Employee.training_status == "COMPLETED").count()
        pct = round((comp / tot * 100), 1) if tot > 0 else 0.0
        stats.append(DepartmentStat(
            department=dept,
            total=tot,
            completed=comp,
            percentage=pct
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
        Employee.company_id == tenant_id,
        Employee.assessment_score.isnot(None)
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
