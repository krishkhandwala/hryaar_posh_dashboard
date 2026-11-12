import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship, backref
from app.db.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class GlobalPlatformSettings(Base):
    __tablename__ = "global_platform_settings"

    id = Column(String, primary_key=True, default="default-settings")
    announcement_banner_text = Column(String(500), default="Mandatory Statutory PoSH Audit Cycle for CY 2025-2026 is active across all organizations.")
    announcement_banner_active = Column(Boolean, default=True)
    announcement_banner_type = Column(String(50), default="INFO") # INFO, WARNING, SUCCESS, ALERT
    maintenance_mode = Column(Boolean, default=False)
    default_mandate_year = Column(String(50), default="CY 2025-2026")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(50), unique=True, index=True, nullable=False) # FREE_TRIAL, BASIC, PROFESSIONAL, ENTERPRISE
    display_name = Column(String(100), nullable=False)
    price_monthly = Column(Float, default=0.0)
    max_employees = Column(Integer, default=500) # -1 for unlimited
    storage_limit_mb = Column(Integer, default=1000)
    features = Column(Text, default="[]") # JSON-serialized list of feature keys
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    companies = relationship("Company", back_populates="plan")
    subscriptions = relationship("Subscription", back_populates="plan")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    plan_id = Column(String, ForeignKey("subscription_plans.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="ACTIVE") # ACTIVE, TRIAL, EXPIRED, SUSPENDED
    start_date = Column(DateTime, default=datetime.utcnow)
    expiry_date = Column(DateTime, nullable=True)
    auto_renew = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="subscription")
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")


class Company(Base):
    __tablename__ = "companies"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    logo_url = Column(String(500), nullable=True)
    favicon_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_number = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    status = Column(String(50), default="ACTIVE") # ACTIVE, SUSPENDED, DEACTIVATED

    # Tiered Partner / Reseller Architecture
    company_type = Column(String(50), default="CLIENT") # PARTNER (Middleman/Assigner) or CLIENT (End-User Org)
    partner_id = Column(String, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    partner_name = Column(String(255), nullable=True) # Cached partner name
    partner_logo_url = Column(String(500), nullable=True)
    co_branding_mode = Column(String(50), default="CO_BRANDED") # CO_BRANDED, WHITE_LABEL, CLIENT_ONLY
    assigned_seat_quota = Column(Integer, default=1500) # Max employees partner can assign to client

    # Branding & White-Label Customization
    primary_color = Column(String(20), default="#2A62FF")
    secondary_color = Column(String(20), default="#1D4ED8")
    accent_color = Column(String(20), default="#F59E0B")
    sidebar_color = Column(String(20), default="#061122")
    welcome_message = Column(String(500), default="Welcome to the Corporate PoSH Compliance & Sensitization Portal")

    # Subscription linkage
    subscription_plan_id = Column(String, ForeignKey("subscription_plans.id", ondelete="SET NULL"), nullable=True)
    subscription_status = Column(String(50), default="ACTIVE")

    # PoSH Specifics
    posh_reporting_url = Column(String(500), default="https://forms.gle/posh-report-sample")
    posh_reporting_email = Column(String(255), default="ic-posh@company.com")
    ic_chairperson = Column(String(255), default="Internal Committee Chair")
    industry = Column(String(100), default="Information Technology")
    headquarters = Column(String(255), default="Mumbai, India")
    contract_start = Column(DateTime, default=datetime.utcnow)
    contract_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    plan = relationship("SubscriptionPlan", back_populates="companies")
    subscription = relationship("Subscription", back_populates="company", uselist=False, cascade="all, delete-orphan")
    users = relationship("User", back_populates="company", cascade="all, delete-orphan")
    employees = relationship("Employee", back_populates="company", cascade="all, delete-orphan")
    compliance_docs = relationship("ComplianceDocument", back_populates="company", cascade="all, delete-orphan")
    webinars = relationship("Webinar", back_populates="company", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="company", cascade="all, delete-orphan")
    import_jobs = relationship("ImportJob", back_populates="company", cascade="all, delete-orphan")
    settings = relationship("CompanySettings", back_populates="company", uselist=False, cascade="all, delete-orphan")
    complaints = relationship("Complaint", back_populates="company", cascade="all, delete-orphan")
    ic_members = relationship("InternalCommitteeMember", back_populates="company", cascade="all, delete-orphan")
    api_keys = relationship("CompanyAPIKey", back_populates="company", cascade="all, delete-orphan")

    # Partner-Client Self-Referential Hierarchy
    clients = relationship("Company", backref=backref("partner", remote_side="Company.id"))


class CompanyAPIKey(Base):
    __tablename__ = "company_api_keys"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(150), default="Leap10x LMS Live Sync Adapter")
    key_prefix = Column(String(30), default="posh_live_")
    masked_key = Column(String(50), default="posh_live_••••••••••••99x")
    hashed_key = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="api_keys")


class CompanySettings(Base):
    __tablename__ = "company_settings"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), unique=True, nullable=False)
    passing_threshold_pct = Column(Float, default=70.0)
    mandate_year = Column(String(50), default="CY 2025-2026")
    auto_issue_certificates = Column(Boolean, default=True)
    email_notifications = Column(Boolean, default=True)
    escalate_non_compliance = Column(Boolean, default=True)
    escalation_email = Column(String(255), default="compliance-officer@company.com")
    certificate_prefix = Column(String(50), default="CERT-POSH")
    allowed_domains = Column(String(500), default="acmecorp.com")
    sync_frequency = Column(String(50), default="DAILY")

    company = relationship("Company", back_populates="settings")


class Role(Base):
    __tablename__ = "roles"

    id = Column(String, primary_key=True, default=generate_uuid)
    organisation_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(50), unique=True, nullable=False) # SUPER_ADMIN, PARTNER_ADMIN, COMPANY_ADMIN, HR_MANAGER, IC_MEMBER, EMPLOYEE
    scope = Column(String(50), default="TENANT") # GLOBAL, TENANT
    description = Column(String(255), nullable=True)


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String, primary_key=True, default=generate_uuid)
    permission_key = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(String, primary_key=True, default=generate_uuid)
    role_id = Column(String, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
    permission_id = Column(String, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False, index=True)


class UserRole(Base):
    __tablename__ = "user_roles"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id = Column(String, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
    organisation_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    jti = Column(String(100), unique=True, index=True, nullable=False)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)
    is_revoked = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="COMPANY_ADMIN") # SUPER_ADMIN, PLATFORM_ADMIN, COMPANY_ADMIN, HR_ADMIN, HR_MANAGER, IC_MEMBER, EMPLOYEE, AUDITOR
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True) # None for Super Admin
    designation = Column(String(150), default="Administrator")
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    status = Column(String(50), default="ACTIVE") # ACTIVE, SUSPENDED, INACTIVE
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="users")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    complaint_number = Column(String(100), index=True, nullable=False)
    incident_date = Column(DateTime, nullable=True)
    complainant_name = Column(String(255), nullable=False)
    complainant_department = Column(String(100), default="General")
    complainant_email = Column(String(255), nullable=True)
    respondent_name = Column(String(255), nullable=False)
    respondent_department = Column(String(100), default="General")
    status = Column(String(50), default="FILED") # FILED, NOTICE_ISSUED, CONCILIATION, FORMAL_INQUIRY, REPORT_SUBMITTED, ACTION_TAKEN, CLOSED
    summary = Column(Text, nullable=False)
    action_taken = Column(Text, nullable=True)
    assigned_ic_chair = Column(String(255), nullable=True)
    confidentiality_level = Column(String(50), default="STRICT_IC_CONFIDENTIAL")
    filing_date = Column(DateTime, default=datetime.utcnow)
    target_resolution_date = Column(DateTime, nullable=True)
    resolution_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="complaints")


class InternalCommitteeMember(Base):
    __tablename__ = "internal_committee_members"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    role_in_committee = Column(String(100), default="INTERNAL_MEMBER") # PRESIDING_OFFICER, INTERNAL_MEMBER, EXTERNAL_MEMBER, SECRETARY
    designation = Column(String(150), default="Senior Committee Member")
    phone = Column(String(50), nullable=True)
    is_external = Column(Boolean, default=False)
    appointed_date = Column(DateTime, default=datetime.utcnow)
    term_expiry_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="ic_members")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    employee_code = Column(String(100), index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), index=True, nullable=False)
    department = Column(String(100), index=True, nullable=False, default="General")
    designation = Column(String(150), default="Team Member")
    gender = Column(String(50), default="Unspecified")
    status = Column(String(50), default="ACTIVE")

    # PoSH Progress status
    training_status = Column(String(50), default="NOT_STARTED") # NOT_STARTED, IN_PROGRESS, COMPLETED
    training_progress_pct = Column(Float, default=0.0)
    training_completion_date = Column(DateTime, nullable=True)
    
    assessment_status = Column(String(50), default="NOT_ATTEMPTED") # NOT_ATTEMPTED, PASSED, FAILED
    assessment_score = Column(Float, nullable=True)
    assessment_date = Column(DateTime, nullable=True)

    certificate_status = Column(String(50), default="PENDING") # PENDING, ISSUED, NOT_ELIGIBLE
    certificate_id = Column(String(100), nullable=True)
    certificate_issued_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="employees")
    training_records = relationship("TrainingRecord", back_populates="employee", cascade="all, delete-orphan")
    assessment_records = relationship("AssessmentRecord", back_populates="employee", cascade="all, delete-orphan")


class TrainingRecord(Base):
    __tablename__ = "training_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    employee_id = Column(String, ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False)
    module_name = Column(String(255), default="PoSH Legal Sensitization 2026")
    source_platform = Column(String(100), default="Leap10x")
    progress_percentage = Column(Float, default=0.0)
    duration_minutes_spent = Column(Integer, default=0)
    status = Column(String(50), default="NOT_STARTED")
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="training_records")


class AssessmentRecord(Base):
    __tablename__ = "assessment_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    employee_id = Column(String, ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False)
    assessment_name = Column(String(255), default="PoSH Mandatory Statutory Exam")
    score = Column(Float, nullable=False)
    max_score = Column(Float, default=100.0)
    passing_score = Column(Float, default=70.0)
    passed = Column(Boolean, default=False)
    attempt_number = Column(Integer, default=1)
    attempted_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="assessment_records")


class Webinar(Base):
    __tablename__ = "webinars"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    speaker = Column(String(255), default="Advocate & Senior PoSH Master Trainer")
    session_time = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=60)
    meeting_url = Column(String(500), nullable=True)
    status = Column(String(50), default="SCHEDULED")
    attendees_count = Column(Integer, default=0)
    
    # Automated Email & Reminders
    auto_reminder_7d_enabled = Column(Boolean, default=True)
    auto_reminder_2d_enabled = Column(Boolean, default=True)
    reminder_7d_sent_at = Column(DateTime, nullable=True)
    reminder_2d_sent_at = Column(DateTime, nullable=True)
    last_broadcast_email_sent_at = Column(DateTime, nullable=True)
    total_emails_dispatched = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="webinars")


class ComplianceDocument(Base):
    __tablename__ = "compliance_documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    doc_type = Column(String(100), default="POLICY") # POLICY, ANNUAL_REPORT, IC_CONSTITUTION, NOTICE
    file_path = Column(String(500), nullable=True)
    file_size_kb = Column(Integer, default=1420)
    version = Column(String(20), default="2.1")
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="compliance_docs")


class ImportJob(Base):
    __tablename__ = "import_jobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    source = Column(String(50), default="CSV")
    filename = Column(String(255), nullable=True)
    status = Column(String(50), default="PENDING")
    total_rows = Column(Integer, default=0)
    successful_rows = Column(Integer, default=0)
    failed_rows = Column(Integer, default=0)
    error_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="import_jobs")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=True)
    user_id = Column(String, nullable=True)
    actor_user_id = Column(String, nullable=True)
    user_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), default="127.0.0.1")
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="audit_logs")


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(String, primary_key=True, default=generate_uuid)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    plan_id = Column(String, ForeignKey("subscription_plans.id", ondelete="SET NULL"), nullable=True)
    provider = Column(String(30), default="SANDBOX") # RAZORPAY, STRIPE, SANDBOX
    order_id = Column(String(120), unique=True, index=True, nullable=False)
    payment_id = Column(String(120), index=True, nullable=True)
    signature_verified = Column(Boolean, default=False)
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String(10), default="INR")
    billing_cycle = Column(String(20), default="MONTHLY") # MONTHLY, ANNUAL, TOPUP
    seats_purchased = Column(Integer, default=0)
    status = Column(String(30), default="CREATED", index=True) # CREATED, PAID, FAILED, REFUNDED
    invoice_number = Column(String(80), unique=True, nullable=True)
    description = Column(String(255), nullable=True)
    created_by_user_id = Column(String, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company")
    plan = relationship("SubscriptionPlan")


class ClusterKVStore(Base):
    """Shared L2 key/counter store in PostgreSQL for stateless load-balanced API nodes when Redis is unavailable."""
    __tablename__ = "cluster_kv_store"

    key = Column(String(200), primary_key=True)
    value_text = Column(Text, nullable=False)
    counter_val = Column(Integer, default=0)
    expires_at = Column(DateTime, nullable=True, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ClusterJob(Base):
    """Cluster-wide persistent background job queue so jobs submitted on Node A can be polled from Node B."""
    __tablename__ = "cluster_jobs"

    id = Column(String(64), primary_key=True)
    job_type = Column(String(100), nullable=False)
    company_id = Column(String, nullable=True, index=True)
    user_id = Column(String, nullable=True)
    status = Column(String(30), default="QUEUED", index=True)
    progress_pct = Column(Float, default=0.0)
    result_json = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    node_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
