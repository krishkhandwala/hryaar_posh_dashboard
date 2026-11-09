from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    email: str
    full_name: str
    role: str
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    sidebar_color: Optional[str] = None
    welcome_message: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    company_type: Optional[str] = "CLIENT"
    partner_id: Optional[str] = None
    partner_name: Optional[str] = None
    partner_logo_url: Optional[str] = None
    co_branding_mode: Optional[str] = "CO_BRANDED"
    employee_code: Optional[str] = None
    department: Optional[str] = None
    training_progress_pct: Optional[float] = None
    training_status: Optional[str] = None
    certificate_id: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role: str = "COMPANY_ADMIN"
    company_id: Optional[str] = None
    designation: Optional[str] = "Corporate Administrator"
    phone: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None

class UserResetPassword(BaseModel):
    new_password: str

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    full_name: str
    role: str
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    status: str
    created_at: datetime
    last_login_at: Optional[datetime] = None

class CompanyBrandingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    company_id: str
    company_name: str
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: str = "#2A62FF"
    secondary_color: str = "#1D4ED8"
    accent_color: str = "#F59E0B"
    sidebar_color: str = "#061122"
    welcome_message: str = "Welcome to the Corporate PoSH Compliance & Sensitization Portal"

class CompanyBrandingUpdate(BaseModel):
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    sidebar_color: Optional[str] = None
    welcome_message: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None

class CompanySettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
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

class CompanyCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[str] = None
    contact_number: Optional[str] = None
    industry: Optional[str] = "Information Technology"
    headquarters: Optional[str] = "Mumbai, India"
    posh_reporting_email: Optional[str] = None
    ic_chairperson: Optional[str] = None
    primary_color: Optional[str] = "#2A62FF"
    secondary_color: Optional[str] = "#1D4ED8"
    accent_color: Optional[str] = "#F59E0B"
    sidebar_color: Optional[str] = "#061122"
    welcome_message: Optional[str] = None
    subscription_plan_id: Optional[str] = None
    company_type: Optional[str] = "CLIENT" # PARTNER or CLIENT
    partner_id: Optional[str] = None
    co_branding_mode: Optional[str] = "CO_BRANDED"
    assigned_seat_quota: Optional[int] = 1500
    admin_name: Optional[str] = None
    admin_email: Optional[str] = None
    admin_password: Optional[str] = None

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[str] = None
    contact_number: Optional[str] = None
    posh_reporting_url: Optional[str] = None
    posh_reporting_email: Optional[str] = None
    ic_chairperson: Optional[str] = None
    industry: Optional[str] = None
    headquarters: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    sidebar_color: Optional[str] = None
    welcome_message: Optional[str] = None
    subscription_plan_id: Optional[str] = None
    partner_id: Optional[str] = None
    partner_name: Optional[str] = None
    partner_logo_url: Optional[str] = None
    co_branding_mode: Optional[str] = None
    assigned_seat_quota: Optional[int] = None

class CompanyStatusUpdate(BaseModel):
    status: str # ACTIVE, SUSPENDED, DEACTIVATED

class CompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    slug: str
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[str] = None
    contact_number: Optional[str] = None
    is_active: bool
    status: str = "ACTIVE"
    company_type: str = "CLIENT"
    partner_id: Optional[str] = None
    partner_name: Optional[str] = None
    partner_logo_url: Optional[str] = None
    co_branding_mode: str = "CO_BRANDED"
    assigned_seat_quota: int = 1500
    primary_color: str = "#2A62FF"
    secondary_color: str = "#1D4ED8"
    accent_color: str = "#F59E0B"
    sidebar_color: str = "#061122"
    welcome_message: Optional[str] = None
    posh_reporting_url: Optional[str] = None
    posh_reporting_email: Optional[str] = None
    ic_chairperson: Optional[str] = None
    industry: Optional[str] = None
    headquarters: Optional[str] = None
    subscription_plan_id: Optional[str] = None
    subscription_plan_name: Optional[str] = "Enterprise"
    subscription_status: str = "ACTIVE"
    total_employees: Optional[int] = 0
    total_users: Optional[int] = 0
    created_at: datetime
    updated_at: datetime

class SubscriptionPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    display_name: str
    price_monthly: float
    max_employees: int
    storage_limit_mb: int
    features: str
    is_active: bool
    created_at: datetime

class SubscriptionPlanCreate(BaseModel):
    name: str
    display_name: str
    price_monthly: float = 0.0
    max_employees: int = 500
    storage_limit_mb: int = 1000
    features: Optional[str] = "[]"

class SubscriptionPlanUpdate(BaseModel):
    display_name: Optional[str] = None
    price_monthly: Optional[float] = None
    max_employees: Optional[int] = None
    storage_limit_mb: Optional[int] = None
    features: Optional[str] = None
    is_active: Optional[bool] = None

class ComplaintCreate(BaseModel):
    incident_date: Optional[datetime] = None
    complainant_name: str
    complainant_department: Optional[str] = "General"
    complainant_email: Optional[str] = None
    respondent_name: str
    respondent_department: Optional[str] = "General"
    summary: str
    assigned_ic_chair: Optional[str] = None
    confidentiality_level: Optional[str] = "STRICT_IC_CONFIDENTIAL"

class ComplaintUpdate(BaseModel):
    status: Optional[str] = None # FILED, NOTICE_ISSUED, CONCILIATION, FORMAL_INQUIRY, REPORT_SUBMITTED, ACTION_TAKEN, CLOSED
    action_taken: Optional[str] = None
    assigned_ic_chair: Optional[str] = None
    target_resolution_date: Optional[datetime] = None
    resolution_date: Optional[datetime] = None
    summary: Optional[str] = None

class ComplaintOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    company_id: str
    complaint_number: str
    incident_date: Optional[datetime] = None
    complainant_name: str
    complainant_department: str
    complainant_email: Optional[str] = None
    respondent_name: str
    respondent_department: str
    status: str
    summary: str
    action_taken: Optional[str] = None
    assigned_ic_chair: Optional[str] = None
    confidentiality_level: str
    filing_date: datetime
    target_resolution_date: Optional[datetime] = None
    resolution_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class ICMemberCreate(BaseModel):
    name: str
    email: str
    role_in_committee: str = "INTERNAL_MEMBER" # PRESIDING_OFFICER, INTERNAL_MEMBER, EXTERNAL_MEMBER, SECRETARY
    designation: Optional[str] = "Senior Committee Member"
    phone: Optional[str] = None
    is_external: bool = False
    appointed_date: Optional[datetime] = None
    term_expiry_date: Optional[datetime] = None

class ICMemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role_in_committee: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    is_external: Optional[bool] = None
    term_expiry_date: Optional[datetime] = None

class ICMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    company_id: str
    name: str
    email: str
    role_in_committee: str
    designation: str
    phone: Optional[str] = None
    is_external: bool
    appointed_date: datetime
    term_expiry_date: Optional[datetime] = None
    created_at: datetime

class EmployeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    company_id: str
    employee_code: str
    first_name: str
    last_name: str
    email: str
    department: str
    designation: Optional[str] = "Team Member"
    training_status: str
    training_progress_pct: float
    training_completion_date: Optional[datetime] = None
    assessment_status: str
    assessment_score: Optional[float] = None
    certificate_status: str
    certificate_id: Optional[str] = None
    updated_at: datetime

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
    total_complaints: int = 0
    resolved_complaints: int = 0
    ic_members_count: int = 0

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
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    speaker: str
    session_time: datetime
    duration_minutes: int
    meeting_url: Optional[str] = None
    status: str
    attendees_count: int
    auto_reminder_7d_enabled: bool = True
    auto_reminder_2d_enabled: bool = True
    reminder_7d_sent_at: Optional[datetime] = None
    reminder_2d_sent_at: Optional[datetime] = None
    last_broadcast_email_sent_at: Optional[datetime] = None
    total_emails_dispatched: int = 0

class ComplianceDocOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    doc_type: str
    file_path: Optional[str] = None
    file_size_kb: int
    version: str
    uploaded_at: datetime

class RecentActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    action: str
    details: Optional[str] = None
    user_email: Optional[str] = None
    created_at: datetime

class SuperAdminAnalytics(BaseModel):
    total_companies: int
    active_companies: int
    suspended_companies: int
    total_users: int
    active_users: int
    total_employees: int
    total_complaints: int
    active_complaints: int
    resolved_complaints: int
    avg_training_completion_pct: float
    companies_by_plan: Dict[str, int]
    recent_activity: List[RecentActivityOut]

class SystemHealthOut(BaseModel):
    status: str
    version: str
    database_status: str
    database_type: str
    total_tenants: int
    total_users: int
    server_time: datetime
