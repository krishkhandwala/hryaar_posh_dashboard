from datetime import datetime, timedelta
from app.db.session import SessionLocal, Base, engine
from app.models.models import Company, User, Employee, Webinar, ComplianceDocument, AuditLog
from app.core.security import get_password_hash

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if companies already exist
    existing_acme = db.query(Company).filter(Company.slug == "acme").first()
    if existing_acme:
        db.close()
        return

    print("Seeding database with HRYAAR multi-tenant sample data...")

    # 1. Acme Corporation (1,250 employees enterprise package)
    acme = Company(
        id="c-acme-corp-1250",
        name="Acme Corporation",
        slug="acme",
        is_active=True,
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
        posh_reporting_url="https://beta.hryaar.com/posh-report",
        posh_reporting_email="posh-ic@betaind.com",
        ic_chairperson="Dr. Meera Iyer (External Presiding Officer)"
    )
    db.add(beta)
    db.commit()

    # 3. Users
    # Platform Super Admin
    super_admin = User(
        email="superadmin@hryaar.com",
        full_name="HRYAAR Super Administrator",
        hashed_password=get_password_hash("Admin@1234"),
        role="PLATFORM_ADMIN",
        company_id=None
    )
    db.add(super_admin)

    # Acme HR Admin
    acme_admin = User(
        email="hr@acme.com",
        full_name="Pooja Sharma (Acme HR Lead)",
        hashed_password=get_password_hash("Acme@1234"),
        role="HR_ADMIN",
        company_id=acme.id
    )
    db.add(acme_admin)

    # Beta HR Admin
    beta_admin = User(
        email="hr@beta.com",
        full_name="Rajesh Verma (Beta HR Manager)",
        hashed_password=get_password_hash("Beta@1234"),
        role="HR_ADMIN",
        company_id=beta.id
    )
    db.add(beta_admin)
    db.commit()

    # 4. Seed Employees for Acme (Simulating the 1,250 training cohort with departments)
    departments = ["Engineering", "Human Resources", "Sales & Marketing", "Finance & Operations", "Product Design", "Legal & Compliance"]
    first_names = ["Aarav", "Ananya", "Rohan", "Priya", "Vikram", "Sneha", "Karan", "Tanvi", "Aditya", "Neha", "Rahul", "Ishita"]
    last_names = ["Mehta", "Sharma", "Nair", "Patel", "Reddy", "Gupta", "Deshmukh", "Kapoor", "Chopra", "Verma", "Kulkarni", "Bose"]

    import random
    random.seed(42)

    acme_employees = []
    for i in range(1, 1251):
        fn = first_names[i % len(first_names)]
        ln = last_names[(i // len(first_names)) % len(last_names)]
        dept = departments[i % len(departments)]
        code = f"ACM-{1000 + i}"
        email = f"{fn.lower()}.{ln.lower()}{i}@acmecorp.com"
        
        # 84% training completion rate
        is_completed = (i % 100) < 84
        is_in_progress = not is_completed and (i % 100) < 94
        
        if is_completed:
            tr_status = "COMPLETED"
            tr_pct = 100.0
            score = round(random.uniform(72.0, 98.0), 1)
            as_status = "PASSED"
            cert_status = "ISSUED"
            cert_id = f"CERT-ACME-{code}"
        elif is_in_progress:
            tr_status = "IN_PROGRESS"
            tr_pct = round(random.uniform(25.0, 85.0), 1)
            score = round(random.uniform(50.0, 68.0), 1) if (i % 2 == 0) else None
            as_status = "FAILED" if score else "NOT_ATTEMPTED"
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
            designation="Team Member",
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
    db.commit()

    # 5. Beta Employees (600 employees)
    beta_employees = []
    for i in range(1, 601):
        fn = first_names[(i + 3) % len(first_names)]
        ln = last_names[(i + 5) % len(last_names)]
        dept = departments[i % len(departments)]
        code = f"BET-{2000 + i}"
        email = f"{fn.lower()}.{ln.lower()}{i}@betaind.com"
        
        is_completed = (i % 100) < 68
        emp = Employee(
            company_id=beta.id,
            employee_code=code,
            first_name=fn,
            last_name=ln,
            email=email,
            department=dept,
            training_status="COMPLETED" if is_completed else "IN_PROGRESS",
            training_progress_pct=100.0 if is_completed else 45.0,
            assessment_status="PASSED" if is_completed else "NOT_ATTEMPTED",
            assessment_score=85.0 if is_completed else None,
            certificate_status="ISSUED" if is_completed else "PENDING",
            certificate_id=f"CERT-BETA-{code}" if is_completed else None
        )
        beta_employees.append(emp)
    db.bulk_save_objects(beta_employees)
    db.commit()

    # 6. Webinars & Compliance Docs
    w1 = Webinar(
        company_id=acme.id,
        title="Interactive PoSH IC Sensitization & Case Study Workshop",
        speaker="Adv. Sunita Rao (Senior PoSH Practitioner)",
        session_time=datetime.utcnow() + timedelta(days=4, hours=3),
        duration_minutes=90,
        meeting_url="https://meet.google.com/posh-acme-workshop",
        attendees_count=420
    )
    w2 = Webinar(
        company_id=acme.id,
        title="Bystander Intervention: Creating Inclusive Workspaces",
        speaker="Anil Kulkarni (HRYAAR Master Trainer)",
        session_time=datetime.utcnow() + timedelta(days=12, hours=5),
        duration_minutes=60,
        meeting_url="https://meet.google.com/bystander-intervention-acme",
        attendees_count=310
    )
    db.add_all([w1, w2])

    doc1 = ComplianceDocument(
        company_id=acme.id,
        title="Acme Corporation PoSH Policy 2026",
        doc_type="POLICY",
        file_path="/docs/acme_posh_policy_2026.pdf",
        version="2.1"
    )
    doc2 = ComplianceDocument(
        company_id=acme.id,
        title="Internal Committee (IC) Constitution & Order",
        doc_type="IC_CONSTITUTION",
        file_path="/docs/ic_constitution_order.pdf",
        version="1.0"
    )
    doc3 = ComplianceDocument(
        company_id=acme.id,
        title="Annual PoSH Compliance Filing Report 2025-26",
        doc_type="ANNUAL_REPORT",
        file_path="/docs/annual_compliance_filing.pdf",
        version="1.0"
    )
    db.add_all([doc1, doc2, doc3])

    # Recent Audit Activity
    a1 = AuditLog(
        company_id=acme.id,
        user_email="hr@acme.com",
        action="DATA_SYNC_COMPLETED",
        details="Leap10x batch synchronization successfully reconciled 1,250 records."
    )
    a2 = AuditLog(
        company_id=acme.id,
        user_email="hr@acme.com",
        action="CERTIFICATES_BATCH_ISSUED",
        details="Batch generation of 1,050 PoSH completion certificates completed."
    )
    a3 = AuditLog(
        company_id=acme.id,
        user_email="hr@acme.com",
        action="REMINDER_DISPATCHED",
        details="Automated email reminders sent to 200 employees with pending modules."
    )
    db.add_all([a1, a2, a3])
    db.commit()
    db.close()
    print("Database initialization and seed complete!")

if __name__ == "__main__":
    init_db()
