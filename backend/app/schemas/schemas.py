from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    email: str
    full_name: str
    role: str
    company_id: Optional[str]
    company_name: Optional[str]

class UserLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role: str = "HR_ADMIN"
    company_id: Optional[str] = None

class CompanySettingsOut(BaseModel):
    id: str
    company_id: str
    passing_threshold_pct: float
    mandate_year: str
    auto_issue_certificates: bool
    email_notifications: bool
    escalate_non_compliance: bool
    escalation_email: str
    certificate_prefix: str
    allowed_domains: str
    sync_frequency: str

    class Config:
        from_attributes = True

class CompanySettingsUpdate(BaseModel):
    passing_threshold_pct: Optional[float] = None
    mandate_year: Optional[str] = None
    auto_issue_certificates: Optional[bool] = None
    email_notifications: Optional[bool] = None
    escalate_non_compliance: Optional[bool] = None
    escalation_email: Optional[str] = None
    certificate_prefix: Optional[str] = None
    allowed_domains: Optional[str] = None
    sync_frequency: Optional[str] = None

class CompanyOut(BaseModel):
    id: str
    name: str
    slug: str
    logo_url: Optional[str]
    is_active: bool
    posh_reporting_url: Optional[str]
    posh_reporting_email: Optional[str]
    ic_chairperson: Optional[str]
    industry: Optional[str]
    headquarters: Optional[str]

    class Config:
        from_attributes = True

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    posh_reporting_url: Optional[str] = None
    posh_reporting_email: Optional[str] = None
    ic_chairperson: Optional[str] = None
    industry: Optional[str] = None
    headquarters: Optional[str] = None

class EmployeeOut(BaseModel):
    id: str
    company_id: str
    employee_code: str
    first_name: str
    last_name: str
    email: str
    department: str
    designation: Optional[str]
    training_status: str
    training_progress_pct: float
    training_completion_date: Optional[datetime]
    assessment_status: str
    assessment_score: Optional[float]
    certificate_status: str
    certificate_id: Optional[str]
    updated_at: datetime

    class Config:
        from_attributes = True

class EmployeeCreate(BaseModel):
    employee_code: str
    first_name: str
    last_name: str
    email: str
    department: str
    designation: Optional[str] = "Team Member"

class DashboardKPIs(BaseModel):
    total_employees: int
    training_completed: int
    training_completed_pct: float
    assessment_completed: int
    assessment_completed_pct: float
    certificates_issued: int
    certificates_issued_pct: float
    compliance_docs: int

class DepartmentStat(BaseModel):
    department: str
    total: int
    completed: int
    percentage: float

class AssessmentBandStat(BaseModel):
    band: str
    count: int
    percentage: float

class ProgramStage(BaseModel):
    stage: str
    status: str
    completed_count: int
    total_count: int
    percentage: float

class WebinarOut(BaseModel):
    id: str
    title: str
    speaker: str
    session_time: datetime
    duration_minutes: int
    meeting_url: Optional[str]
    status: str
    attendees_count: int

    class Config:
        from_attributes = True

class ComplianceDocOut(BaseModel):
    id: str
    title: str
    doc_type: str
    file_path: Optional[str]
    file_size_kb: int
    version: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

class RecentActivityOut(BaseModel):
    id: str
    action: str
    details: Optional[str]
    user_email: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
