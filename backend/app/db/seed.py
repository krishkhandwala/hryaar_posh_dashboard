from datetime import datetime, timedelta
import random
from app.db.session import SessionLocal, Base, engine
from app.models.models import Company, CompanySettings, User, Employee, Webinar, ComplianceDocument, AuditLog
from app.core.security import get_password_hash

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if acme already exists to make init_db strictly idempotent
    existing = db.query(Company).filter(Company.slug == "acme").first()
    if existing:
        db.close()
        return

    # 1. Acme Corporation (1,250 employees enterprise package)
    acme = Company(
        id="c-acme-corp-1250",
        name="Acme Corporation",
        slug="acme",
        is_active=True,
        industry="Enterprise Technology & Cloud Services",
        headquarters="Bandra-Kurla Complex (BKC), Mumbai",
        posh_reporting_url="https://acme.hryaar.com/posh-report",
        posh_reporting_email="posh-ic@acmecorp.com",
        ic_chairperson="Adv. Sunita Rao (External Presiding Officer)"
    )
    db.add(acme)

    # 2. Beta Industries (600 employees enterprise package)
    beta = Company(
        id="c-beta-ind-600",
        name="Beta Industries",
        slug="beta",
        is_active=True,
        industry="Precision Automotive & Manufacturing",
        headquarters="MIDC Industrial Area, Pune",
        posh_reporting_url="https://beta.hryaar.com/posh-report",
        posh_reporting_email="posh-ic@betaind.com",
        ic_chairperson="Dr. Meera Iyer (External Presiding Officer)"
    )
    db.add(beta)
    db.commit()

    # 3. Company Settings
    acme_settings = CompanySettings(
        company_id=acme.id,
        passing_threshold_pct=75.0,
        mandate_year="CY 2025-2026",
        auto_issue_certificates=True,
        email_notifications=True,
        escalate_non_compliance=True,
        escalation_email="legal-compliance@acmecorp.com",
        certificate_prefix="CERT-ACME-POSH",
        allowed_domains="acmecorp.com, acmeglobal.com",
        sync_frequency="REALTIME_WEBHOOK"
    )
    beta_settings = CompanySettings(
        company_id=beta.id,
        passing_threshold_pct=70.0,
        mandate_year="CY 2025-2026",
        auto_issue_certificates=True,
        email_notifications=False,
        escalate_non_compliance=True,
        escalation_email="posh-audit@betaind.com",
        certificate_prefix="CERT-BETA-POSH",
        allowed_domains="betaind.com",
        sync_frequency="WEEKLY_CSV"
    )
    db.add_all([acme_settings, beta_settings])

    # 4. Users
    super_admin = User(
        email="superadmin@hryaar.com",
        full_name="HRYAAR Super Administrator",
        hashed_password=get_password_hash("Admin@1234"),
        role="PLATFORM_ADMIN",
        company_id=None
    )
    acme_admin = User(
        email="hr@acme.com",
        full_name="Pooja Sharma (Acme HR Lead)",
        hashed_password=get_password_hash("Acme@1234"),
        role="HR_ADMIN",
        company_id=acme.id
    )
    beta_admin = User(
        email="hr@beta.com",
        full_name="Rajesh Verma (Beta HR Manager)",
        hashed_password=get_password_hash("Beta@1234"),
        role="HR_ADMIN",
        company_id=beta.id
    )
    db.add_all([super_admin, acme_admin, beta_admin])

    # 5. Seed Employees for Acme (1,250 employees)
    departments = ["Engineering", "Human Resources", "Sales & Marketing", "Finance & Operations", "Product Design", "Legal & Compliance"]
    first_names = ["Aarav", "Ananya", "Rohan", "Priya", "Vikram", "Sneha", "Karan", "Tanvi", "Aditya", "Neha", "Rahul", "Ishita"]
    last_names = ["Mehta", "Sharma", "Nair", "Patel", "Reddy", "Gupta", "Deshmukh", "Kapoor", "Chopra", "Verma", "Kulkarni", "Bose"]

    random.seed(42)
    acme_employees = []
    for i in range(1, 1251):
        fn = first_names[i % len(first_names)]
        ln = last_names[(i // len(first_names)) % len(last_names)]
        dept = departments[i % len(departments)]
        code = f"ACM-{1000 + i}"
        email = f"{fn.lower()}.{ln.lower()}{i}@acmecorp.com"
        
        is_completed = (i % 100) < 84
        is_in_progress = not is_completed and (i % 100) < 94
        
        if is_completed:
            tr_status = "COMPLETED"
            tr_pct = 100.0
            score = round(random.uniform(75.0, 98.0), 1)
            as_status = "PASSED"
            cert_status = "ISSUED"
            cert_id = f"CERT-ACME-{code}"
        elif is_in_progress:
            tr_status = "IN_PROGRESS"
            tr_pct = round(random.uniform(35.0, 85.0), 1)
            score = round(random.uniform(50.0, 70.0), 1) if (i % 2 == 0) else None
            as_status = "FAILED" if score and score < 70 else "NOT_ATTEMPTED"
            cert_status = "PENDING"
            cert_id = None
        else:
            tr_status = "NOT_STARTED"
            tr_pct = 0.0
            score = None
            as_status = "NOT_ATTEMPTED"
            cert_status = "PENDING"
            cert_id = None

        emp = Employee(
            company_id=acme.id,
            employee_code=code,
            first_name=fn,
            last_name=ln,
            email=email,
            department=dept,
            designation="Senior Associate" if (i % 3 == 0) else "Team Member",
            training_status=tr_status,
            training_progress_pct=tr_pct,
            training_completion_date=datetime.utcnow() - timedelta(days=random.randint(1, 30)) if is_completed else None,
            assessment_status=as_status,
            assessment_score=score,
            assessment_date=datetime.utcnow() - timedelta(days=random.randint(1, 20)) if score else None,
            certificate_status=cert_status,
            certificate_id=cert_id,
            certificate_issued_at=datetime.utcnow() - timedelta(days=random.randint(1, 15)) if cert_status == "ISSUED" else None
        )
        acme_employees.append(emp)

    db.bulk_save_objects(acme_employees)

    # 6. Beta Employees (600 employees)
    beta_employees = []
    for i in range(1, 601):
        fn = first_names[(i + 3) % len(first_names)]
        ln = last_names[(i + 5) % len(last_names)]
        dept = departments[i % len(departments)]
        code = f"BET-{2000 + i}"
        email = f"{fn.lower()}.{ln.lower()}{i}@betaind.com"
        is_completed = (i % 100) < 70

        emp = Employee(
            company_id=beta.id,
            employee_code=code,
            first_name=fn,
            last_name=ln,
            email=email,
            department=dept,
            designation="Operations Specialist",
            training_status="COMPLETED" if is_completed else "IN_PROGRESS",
            training_progress_pct=100.0 if is_completed else 50.0,
            assessment_status="PASSED" if is_completed else "NOT_ATTEMPTED",
            assessment_score=82.0 if is_completed else None,
            certificate_status="ISSUED" if is_completed else "PENDING",
            certificate_id=f"CERT-BETA-{code}" if is_completed else None
        )
        beta_employees.append(emp)
    db.bulk_save_objects(beta_employees)

    # 7. Webinars
    w1 = Webinar(
        company_id=acme.id,
        title="Interactive PoSH IC Sensitization & Mock Inquiry Simulation",
        speaker="Adv. Sunita Rao (Senior PoSH Practitioner)",
        session_time=datetime.utcnow() + timedelta(days=3, hours=4),
        duration_minutes=90,
        meeting_url="https://meet.google.com/posh-acme-workshop",
        attendees_count=420
    )
    w2 = Webinar(
        company_id=acme.id,
        title="Bystander Intervention: Creating Inclusive & Safe Workspaces",
        speaker="Anil Kulkarni (HRYAAR Master Trainer)",
        session_time=datetime.utcnow() + timedelta(days=10, hours=2),
        duration_minutes=60,
        meeting_url="https://meet.google.com/bystander-intervention-acme",
        attendees_count=310
    )
    db.add_all([w1, w2])

    # 8. Compliance Documents
    d1 = ComplianceDocument(
        company_id=acme.id,
        title="Acme Corporation Prevention of Sexual Harassment Policy 2026",
        doc_type="STATUTORY_POLICY",
        file_size_kb=1840,
        version="3.0"
    )
    d2 = ComplianceDocument(
        company_id=acme.id,
        title="Internal Committee (IC) Gazette Constitution & Office Order",
        doc_type="IC_CONSTITUTION",
        file_size_kb=920,
        version="1.2"
    )
    d3 = ComplianceDocument(
        company_id=acme.id,
        title="Annual Statutory PoSH Compliance Filing Report Form-IV",
        doc_type="ANNUAL_FILING",
        file_size_kb=2450,
        version="2025-26"
    )
    db.add_all([d1, d2, d3])

    # 9. Audit Logs
    a1 = AuditLog(
        company_id=acme.id,
        user_email="hr@acme.com",
        action="TENANT_SETTINGS_CONFIGURED",
        details="Configured passing score to 75% and enabled automated certificate issuance."
    )
    a2 = AuditLog(
        company_id=acme.id,
        user_email="hr@acme.com",
        action="DATA_SYNC_COMPLETED",
        details="Leap10x batch synchronization successfully verified 1,250 records."
    )
    db.add_all([a1, a2])

    db.commit()
    db.close()
    print("Clean database initialization and advanced seeding completed successfully!")

if __name__ == "__main__":
    init_db()
