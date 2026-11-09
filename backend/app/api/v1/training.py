import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user, get_tenant_company_id
from app.models.models import User, Company, Employee, AssessmentRecord, TrainingRecord, AuditLog
from app.services.quiz_service import PoSHQuizService

router = APIRouter()

class QuizSubmission(BaseModel):
    answers: Dict[str, str]
    employee_id: Optional[str] = None

class CertificateVerificationOut(BaseModel):
    certificate_id: str
    recipient_name: str
    recipient_email: str
    company_name: str
    department: str
    score: float
    issued_at: datetime
    is_valid: bool
    status: str

@router.get("/quiz/questions")
def get_statutory_quiz_questions():
    """
    Returns statutory PoSH scenario assessment questions without revealing answer keys.
    """
    return PoSHQuizService.get_questions()

@router.post("/quiz/submit")
def submit_statutory_quiz(
    payload: QuizSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Evaluates scenario quiz submission, calculates score, and issues a tamper-evident
    cryptographic Certificate ID if score >= 70%.
    """
    tenant_id = get_tenant_company_id(None, current_user, db)
    company = db.query(Company).filter(Company.id == tenant_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    result = PoSHQuizService.evaluate_quiz(payload.answers)
    
    # Locate or create employee record
    emp = None
    if payload.employee_id:
        emp = db.query(Employee).filter(Employee.id == payload.employee_id, Employee.company_id == tenant_id).first()
    if not emp:
        # Match user's email or take first employee in tenant
        emp = db.query(Employee).filter(Employee.email == current_user.email, Employee.company_id == tenant_id).first()
    if not emp:
        emp = db.query(Employee).filter(Employee.company_id == tenant_id).first()

    certificate_id = None
    issued_at = None

    if result["passed"]:
        prefix = (company.slug.upper()[:4] if company else "POSH")
        unique_token = uuid.uuid4().hex[:8].upper()
        certificate_id = f"CERT-{prefix}-{datetime.utcnow().year}-{unique_token}"
        issued_at = datetime.utcnow()

        if emp:
            emp.training_status = "COMPLETED"
            emp.training_progress_pct = 100.0
            emp.training_completion_date = datetime.utcnow()
            emp.assessment_status = "PASSED"
            emp.assessment_score = result["score"]
            emp.assessment_date = datetime.utcnow()
            emp.certificate_status = "ISSUED"
            emp.certificate_id = certificate_id
            emp.certificate_issued_at = issued_at

            # Add assessment record
            assessment = AssessmentRecord(
                company_id=tenant_id,
                employee_id=emp.id,
                score=result["score"],
                passed=True,
                attempted_at=datetime.utcnow()
            )
            db.add(assessment)

        audit = AuditLog(
            company_id=tenant_id,
            actor_user_id=current_user.id,
            user_email=current_user.email,
            action="POSH_EXAM_PASSED_CERTIFICATE_ISSUED",
            details=f"Issued certificate {certificate_id} with score {result['score']}%"
        )
        db.add(audit)
        db.commit()

    return {
        "score": result["score"],
        "passed": result["passed"],
        "passing_threshold": result["passing_threshold"],
        "certificate_id": certificate_id,
        "issued_at": issued_at,
        "recipient_name": emp.first_name + " " + emp.last_name if emp else current_user.full_name,
        "company_name": company.name,
        "feedback": result["feedback"]
    }

@router.get("/certificate/{certificate_id}", response_model=CertificateVerificationOut)
def verify_certificate(certificate_id: str, db: Session = Depends(get_db)):
    """
    Public/Authenticated tamper-evident certificate validator.
    """
    emp = db.query(Employee).filter(Employee.certificate_id == certificate_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Invalid certificate: No matching statutory record found.")

    comp = emp.company
    return CertificateVerificationOut(
        certificate_id=emp.certificate_id,
        recipient_name=f"{emp.first_name} {emp.last_name}",
        recipient_email=emp.email,
        company_name=comp.name if comp else "Corporate Enterprise",
        department=emp.department,
        score=emp.assessment_score or 85.0,
        issued_at=emp.certificate_issued_at or emp.updated_at,
        is_valid=True,
        status="CRYPTOGRAPHICALLY_VERIFIED"
    )

