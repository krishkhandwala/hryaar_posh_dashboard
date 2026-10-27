import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class Company(Base):
    __tablename__ = "companies"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    logo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
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
    users = relationship("User", back_populates="company", cascade="all, delete-orphan")
    employees = relationship("Employee", back_populates="company", cascade="all, delete-orphan")
    compliance_docs = relationship("ComplianceDocument", back_populates="company", cascade="all, delete-orphan")
    webinars = relationship("Webinar", back_populates="company", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="company", cascade="all, delete-orphan")
    import_jobs = relationship("ImportJob", back_populates="company", cascade="all, delete-orphan")
    settings = relationship("CompanySettings", back_populates="company", uselist=False, cascade="all, delete-orphan")


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


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="HR_ADMIN") # PLATFORM_ADMIN, HR_ADMIN, AUDITOR, IC_CHAIR
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True)
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="users")


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
    user_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), default="127.0.0.1")
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="audit_logs")
