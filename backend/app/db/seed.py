from datetime import datetime, timedelta
import random
from app.db.session import SessionLocal, Base, engine
from app.db.migrate import run_migrations
from app.models.models import (
    Company, CompanySettings, User, Employee, Webinar, ComplianceDocument, 
    AuditLog, SubscriptionPlan, Subscription, Complaint, InternalCommitteeMember
)
from app.core.security import get_password_hash

def init_db():
    # 1. Run migrations to ensure all tables and columns exist
    run_migrations()
    
    db = SessionLocal()

    # 2. Seed Subscription Plans if not present
    plans_data = [
        {
            "name": "FREE_TRIAL",
            "display_name": "Free Pilot Evaluation",
            "price_monthly": 0.0,
            "max_employees": 100,
            "storage_limit_mb": 500,
            "features": '["kpi_dashboard", "basic_csv_import", "policy_viewer"]'
        },
        {
            "name": "BASIC",
            "display_name": "Growth / Basic Tier",
            "price_monthly": 199.0,
            "max_employees": 500,
            "storage_limit_mb": 2000,
            "features": '["kpi_dashboard", "csv_import", "statutory_filings", "ic_portal"]'
        },
        {
            "name": "PROFESSIONAL",
            "display_name": "Mid-Market Corporate Tier",
            "price_monthly": 499.0,
            "max_employees": 2000,
            "storage_limit_mb": 10000,
            "features": '["kpi_dashboard", "advanced_analytics", "automated_certs", "complaints_redressal", "ic_management", "branding_customizer"]'
        },
        {
            "name": "ENTERPRISE",
            "display_name": "Global Enterprise Tier",
            "price_monthly": 999.0,
            "max_employees": 25000,
            "storage_limit_mb": 50000,
            "features": '["all_features", "white_label_branding", "dedicated_ic_inquiry", "unlimited_webinars", "audit_retention_unlimited", "priority_sla"]'
        }
    ]

    for p in plans_data:
        existing_p = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == p["name"]).first()
        if not existing_p:
            new_plan = SubscriptionPlan(
                name=p["name"],
                display_name=p["display_name"],
                price_monthly=p["price_monthly"],
                max_employees=p["max_employees"],
                storage_limit_mb=p["storage_limit_mb"],
                features=p["features"]
            )
            db.add(new_plan)
    db.commit()

    ent_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == "ENTERPRISE").first()
    pro_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == "PROFESSIONAL").first()

    # 3. Seed Companies: 3 Standalone Diverse Enterprises
    # -------------------------------------------------------------
    # Company 1: Acme Corporation (Enterprise Tech - 1,250 staff - Deep Navy)
    # -------------------------------------------------------------
    acme = db.query(Company).filter(Company.slug == "acme").first()
    if not acme:
        acme = Company(
            id="c-acme-corp-1250",
            name="Acme Corporation",
            slug="acme",
            is_active=True,
            status="ACTIVE",
            industry="Enterprise Technology & Cloud Services",
            headquarters="Bandra-Kurla Complex (BKC), Mumbai",
            contact_email="compliance@acmecorp.com",
            contact_number="+91 22 6123 4567",
            posh_reporting_url="https://acme.hryaar.com/posh-report",
            posh_reporting_email="posh-ic@acmecorp.com",
            ic_chairperson="Adv. Sunita Rao (External Presiding Officer)",
            primary_color="#142D50",
            secondary_color="#2A62FF",
            accent_color="#F2B632",
            sidebar_color="#0B192E",
            welcome_message="Welcome to Acme Corporation's PoSH Sensitization & Statutory Compliance Workspace",
            subscription_plan_id=ent_plan.id if ent_plan else None,
            subscription_status="ACTIVE"
        )
        db.add(acme)
    else:
        if acme.primary_color in (None, "#2A62FF"): acme.primary_color = "#142D50"
        if acme.secondary_color in (None, "#1D4ED8"): acme.secondary_color = "#2A62FF"
        if not acme.accent_color or acme.accent_color == "#F59E0B": acme.accent_color = "#F2B632"
        if not acme.sidebar_color or acme.sidebar_color == "#061122": acme.sidebar_color = "#0B192E"
        if not acme.status: acme.status = "ACTIVE"
        if not acme.welcome_message or "HRYAAR" in acme.welcome_message: acme.welcome_message = "Welcome to Acme Corporation's PoSH Sensitization & Statutory Compliance Workspace"
        if ent_plan and not acme.subscription_plan_id: acme.subscription_plan_id = ent_plan.id

    # -------------------------------------------------------------
    # Company 2: Beta Industries (Precision Automotive - 600 staff - Forest Emerald)
    # -------------------------------------------------------------
    beta = db.query(Company).filter(Company.slug == "beta").first()
    if not beta:
        beta = Company(
            id="c-beta-ind-600",
            name="Beta Industries",
            slug="beta",
            is_active=True,
            status="ACTIVE",
            industry="Precision Automotive & Heavy Manufacturing",
            headquarters="MIDC Industrial Area, Pune",
            contact_email="support@betaind.com",
            contact_number="+91 20 4123 8899",
            posh_reporting_url="https://beta.hryaar.com/posh-report",
            posh_reporting_email="posh-ic@betaind.com",
            ic_chairperson="Dr. Meera Iyer (External Presiding Officer)",
            primary_color="#065F46",
            secondary_color="#10B981",
            accent_color="#F59E0B",
            sidebar_color="#064E3B",
            welcome_message="Beta Industries Corporate PoSH & Safer Workplaces Management Portal",
            subscription_plan_id=pro_plan.id if pro_plan else None,
            subscription_status="ACTIVE"
        )
        db.add(beta)
    else:
        if beta.primary_color in (None, "#2A62FF"): beta.primary_color = "#065F46"
        if beta.secondary_color in (None, "#1D4ED8"): beta.secondary_color = "#10B981"
        if not beta.accent_color or beta.accent_color == "#F59E0B": beta.accent_color = "#F59E0B"
        if not beta.sidebar_color or beta.sidebar_color == "#061122": beta.sidebar_color = "#064E3B"
        if not beta.status: beta.status = "ACTIVE"
        if not beta.welcome_message or "HRYAAR" in beta.welcome_message: beta.welcome_message = "Beta Industries Corporate PoSH & Safer Workplaces Management Portal"
        if pro_plan and not beta.subscription_plan_id: beta.subscription_plan_id = pro_plan.id

    # -------------------------------------------------------------
    # Company 3: Nexus Health & BioSciences (Biotech / Pharma - 450 staff - Royal Violet)
    # -------------------------------------------------------------
    nexus = db.query(Company).filter(Company.slug == "nexusbio").first()
    if not nexus:
        nexus = Company(
            id="c-nexus-bio-450",
            name="Nexus Health & BioSciences",
            slug="nexusbio",
            is_active=True,
            status="ACTIVE",
            industry="Clinical Therapeutics & Biotechnology",
            headquarters="HITEC City, Hyderabad, Telangana",
            contact_email="ethics-posh@nexusbio.com",
            contact_number="+91 40 4567 8900",
            posh_reporting_url="https://nexusbio.hryaar.com/posh-report",
            posh_reporting_email="posh-ic@nexusbio.com",
            ic_chairperson="Adv. Rohini Deshmukh (High Court Senior Counsel)",
            primary_color="#5B21B6",
            secondary_color="#8B5CF6",
            accent_color="#EC4899",
            sidebar_color="#2E1065",
            welcome_message="Nexus BioSciences Workplace Dignity & Mandatory PoSH Portal",
            subscription_plan_id=pro_plan.id if pro_plan else None,
            subscription_status="ACTIVE"
        )
        db.add(nexus)

    # -------------------------------------------------------------
    # MIDDLEMAN / PARTNER COMPANIES (Level 1: The Assigners / Resellers)
    # -------------------------------------------------------------
    # Partner 1: TalentPro HR Advisory (Assigner for Acme Cloud & Nexus Bio)
    talentpro = db.query(Company).filter(Company.slug == "talentpro").first()
    if not talentpro:
        talentpro = Company(
            id="p-talentpro-hr",
            name="TalentPro HR Advisory & Legal",
            slug="talentpro",
            company_type="PARTNER",
            is_active=True,
            status="ACTIVE",
            industry="Human Resources & Statutory Legal Advisory",
            headquarters="Cyber City, Gurugram, India",
            contact_email="partnerships@talentpro.com",
            contact_number="+91 124 456 7890",
            primary_color="#0F766E",
            secondary_color="#0D9488",
            accent_color="#F59E0B",
            sidebar_color="#042F2E",
            welcome_message="TalentPro Partner Management Hub — Corporate Compliance Portfolio",
            assigned_seat_quota=5000,
            subscription_plan_id=ent_plan.id if ent_plan else None,
            subscription_status="ACTIVE"
        )
        db.add(talentpro)

    # Partner 2: Apex Corporate Compliance Partners (Assigner for Beta Industries)
    apex = db.query(Company).filter(Company.slug == "apex").first()
    if not apex:
        apex = Company(
            id="p-apex-compliance",
            name="Apex Corporate Compliance Partners",
            slug="apex",
            company_type="PARTNER",
            is_active=True,
            status="ACTIVE",
            industry="Enterprise Risk & Governance Consulting",
            headquarters="Whitefield, Bengaluru, India",
            contact_email="advisory@apexcompliance.com",
            contact_number="+91 80 2345 6789",
            primary_color="#334155",
            secondary_color="#475569",
            accent_color="#F59E0B",
            sidebar_color="#0F172A",
            welcome_message="Apex Compliance Channel Operations Hub",
            assigned_seat_quota=3000,
            subscription_plan_id=ent_plan.id if ent_plan else None,
            subscription_status="ACTIVE"
        )
        db.add(apex)

    db.commit()

    # Link Clients to their Respective Mutually Exclusive Middleman Partners
    acme.partner_id = "p-talentpro-hr"
    acme.partner_name = "TalentPro HR Advisory & Legal"
    acme.co_branding_mode = "CO_BRANDED"
    acme.company_type = "CLIENT"

    nexus.partner_id = "p-talentpro-hr"
    nexus.partner_name = "TalentPro HR Advisory & Legal"
    nexus.co_branding_mode = "CO_BRANDED"
    nexus.company_type = "CLIENT"

    beta.partner_id = "p-apex-compliance"
    beta.partner_name = "Apex Corporate Compliance Partners"
    beta.co_branding_mode = "CO_BRANDED"
    beta.company_type = "CLIENT"
    db.commit()

    # Subscriptions Linking
    if ent_plan and not db.query(Subscription).filter(Subscription.company_id == acme.id).first():
        db.add(Subscription(company_id=acme.id, plan_id=ent_plan.id, status="ACTIVE"))
    if pro_plan and not db.query(Subscription).filter(Subscription.company_id == beta.id).first():
        db.add(Subscription(company_id=beta.id, plan_id=pro_plan.id, status="ACTIVE"))
    if pro_plan and not db.query(Subscription).filter(Subscription.company_id == nexus.id).first():
        db.add(Subscription(company_id=nexus.id, plan_id=pro_plan.id, status="ACTIVE"))
    db.commit()

    # Compliance Settings
    if not db.query(CompanySettings).filter(CompanySettings.company_id == acme.id).first():
        db.add(CompanySettings(
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
        ))
    if not db.query(CompanySettings).filter(CompanySettings.company_id == beta.id).first():
        db.add(CompanySettings(
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
        ))
    if not db.query(CompanySettings).filter(CompanySettings.company_id == nexus.id).first():
        db.add(CompanySettings(
            company_id=nexus.id,
            passing_threshold_pct=80.0,
            mandate_year="CY 2025-2026",
            auto_issue_certificates=True,
            email_notifications=True,
            escalate_non_compliance=True,
            escalation_email="statutory-compliance@nexusbio.com",
            certificate_prefix="CERT-NEXUS-POSH",
            allowed_domains="nexusbio.com",
            sync_frequency="DAILY"
        ))
    db.commit()

    # Users
    super_admin = db.query(User).filter(User.email == "superadmin@hryaar.com").first()
    if not super_admin:
        super_admin = User(
            email="superadmin@hryaar.com",
            full_name="HRYAAR Lead Tech Architect (Master)",
            hashed_password=get_password_hash("Admin@1234"),
            role="SUPER_ADMIN",
            company_id=None,
            designation="Lead Systems Architect & Tech Creator",
            is_active=True,
            status="ACTIVE"
        )
        db.add(super_admin)
    else:
        super_admin.full_name = "HRYAAR Lead Tech Architect (Master)"
        super_admin.designation = "Lead Systems Architect & Tech Creator"
        super_admin.role = "SUPER_ADMIN"
        super_admin.status = "ACTIVE"
        super_admin.is_active = True

    # Seed tech@hryaar.com as the designated Tech Person at HRYAAR
    tech_admin = db.query(User).filter(User.email == "tech@hryaar.com").first()
    if not tech_admin:
        tech_admin = User(
            email="tech@hryaar.com",
            full_name="HRYAAR Lead Tech Architect (Master)",
            hashed_password=get_password_hash("Admin@1234"),
            role="SUPER_ADMIN",
            company_id=None,
            designation="Lead Systems Architect & Tech Creator",
            is_active=True,
            status="ACTIVE"
        )
        db.add(tech_admin)
    else:
        tech_admin.full_name = "HRYAAR Lead Tech Architect (Master)"
        tech_admin.designation = "Lead Systems Architect & Tech Creator"
        tech_admin.role = "SUPER_ADMIN"
        tech_admin.status = "ACTIVE"
        tech_admin.is_active = True

    acme_admin = db.query(User).filter(User.email == "hr@acme.com").first()
    if not acme_admin:
        acme_admin = User(
            email="hr@acme.com",
            full_name="Pooja Sharma (Acme HR Lead)",
            hashed_password=get_password_hash("Acme@1234"),
            role="COMPANY_ADMIN",
            company_id=acme.id,
            designation="Chief Human Resources Officer",
            is_active=True,
            status="ACTIVE"
        )
        db.add(acme_admin)

    beta_admin = db.query(User).filter(User.email == "hr@beta.com").first()
    if not beta_admin:
        beta_admin = User(
            email="hr@beta.com",
            full_name="Rajesh Verma (Beta HR Manager)",
            hashed_password=get_password_hash("Beta@1234"),
            role="COMPANY_ADMIN",
            company_id=beta.id,
            designation="Head of Employee Relations",
            is_active=True,
            status="ACTIVE"
        )
        db.add(beta_admin)

    nexus_admin = db.query(User).filter(User.email == "hr@nexusbio.com").first()
    if not nexus_admin:
        nexus_admin = User(
            email="hr@nexusbio.com",
            full_name="Dr. Aruna Chatterjee (Nexus Ethics Lead)",
            hashed_password=get_password_hash("Nexus@1234"),
            role="COMPANY_ADMIN",
            company_id=nexus.id,
            designation="VP, People & Research Ethics",
            is_active=True,
            status="ACTIVE"
        )
        db.add(nexus_admin)

    # Middleman / Partner Admins (Level 1: Assigners)
    talentpro_admin = db.query(User).filter(User.email == "partner@talentpro.com").first()
    if not talentpro_admin:
        talentpro_admin = User(
            email="partner@talentpro.com",
            full_name="Karan Oberoi (TalentPro Partner Lead)",
            hashed_password=get_password_hash("Partner@1234"),
            role="PARTNER_ADMIN",
            company_id=talentpro.id,
            designation="Managing Partner - Corporate HR Advisory",
            is_active=True,
            status="ACTIVE"
        )
        db.add(talentpro_admin)

    apex_admin = db.query(User).filter(User.email == "partner@apex.com").first()
    if not apex_admin:
        apex_admin = User(
            email="partner@apex.com",
            full_name="Vikram Malhotra (Apex Compliance Principal)",
            hashed_password=get_password_hash("Partner@1234"),
            role="PARTNER_ADMIN",
            company_id=apex.id,
            designation="Director of Channel Partnerships",
            is_active=True,
            status="ACTIVE"
        )
        db.add(apex_admin)

    db.commit()

    # Internal Committee (IC) Members for Nexus
    if db.query(InternalCommitteeMember).filter(InternalCommitteeMember.company_id == nexus.id).count() == 0:
        db.add_all([
            InternalCommitteeMember(
                company_id=nexus.id,
                name="Adv. Rohini Deshmukh",
                email="rohini.deshmukh@legalcounsel.in",
                role_in_committee="PRESIDING_OFFICER",
                designation="High Court Senior Advocate (External IC Chair)",
                is_external=True
            ),
            InternalCommitteeMember(
                company_id=nexus.id,
                name="Dr. Aruna Chatterjee",
                email="aruna.chatterjee@nexusbio.com",
                role_in_committee="INTERNAL_MEMBER",
                designation="VP, People & Ethics",
                is_external=False
            ),
            InternalCommitteeMember(
                company_id=nexus.id,
                name="Dr. Suresh Verma",
                email="suresh.verma@nexusbio.com",
                role_in_committee="INTERNAL_MEMBER",
                designation="Director of Clinical Pharmacology",
                is_external=False
            ),
            InternalCommitteeMember(
                company_id=nexus.id,
                name="Meenakshi Sundaram",
                email="meenakshi@streesuraksha-ngo.org",
                role_in_committee="EXTERNAL_MEMBER",
                designation="Executive Director, Women Rights & Safety NGO",
                is_external=True
            )
        ])
    db.commit()

    # POSH Statutory Complaints for Nexus
    if db.query(Complaint).filter(Complaint.company_id == nexus.id).count() == 0:
        db.add_all([
            Complaint(
                company_id=nexus.id,
                complaint_number="POSH-NEXUS-2026-001",
                incident_date=datetime.utcnow() - timedelta(days=25),
                complainant_name="Confidential Researcher N-101",
                complainant_department="Pharmacovigilance",
                respondent_name="Senior Lab Scientist",
                respondent_department="Clinical Research",
                status="CLOSED",
                summary="Hostile remarks regarding career advancement during peer review discussion.",
                action_taken="Matter redressed via Section 10 conciliation with formal apology and non-retaliation pledge.",
                assigned_ic_chair="Adv. Rohini Deshmukh",
                confidentiality_level="STRICT_IC_CONFIDENTIAL",
                filing_date=datetime.utcnow() - timedelta(days=22),
                resolution_date=datetime.utcnow() - timedelta(days=5)
            )
        ])
    db.commit()

    # Nexus Webinars
    if db.query(Webinar).filter(Webinar.company_id == nexus.id).count() == 0:
        db.add_all([
            Webinar(
                company_id=nexus.id,
                title="Clinical R&D Labs: Workplace Dignity & Power Dynamics Prevention",
                speaker="Adv. Rohini Deshmukh (High Court Counsel)",
                session_time=datetime.utcnow() + timedelta(days=6, hours=3),
                duration_minutes=60,
                meeting_url="https://meet.google.com/nexus-posh-rnd",
                attendees_count=290,
                auto_reminder_7d_enabled=True,
                auto_reminder_2d_enabled=True
            ),
            Webinar(
                company_id=nexus.id,
                title="IC Inquiry Guidelines for Medical & Scientific Organizations",
                speaker="Dr. Anita Bhargava (PoSH Specialist)",
                session_time=datetime.utcnow() + timedelta(days=14, hours=2),
                duration_minutes=90,
                meeting_url="https://meet.google.com/nexus-ic-masterclass",
                attendees_count=145,
                auto_reminder_7d_enabled=True,
                auto_reminder_2d_enabled=True
            )
        ])
    db.commit()

    # Beta Webinars
    if db.query(Webinar).filter(Webinar.company_id == beta.id).count() == 0:
        db.add_all([
            Webinar(
                company_id=beta.id,
                title="Shopfloor Safety & Harassment Prevention for Plant Supervisors",
                speaker="Dr. Meera Iyer (External Presiding Officer)",
                session_time=datetime.utcnow() + timedelta(days=5, hours=4),
                duration_minutes=60,
                meeting_url="https://meet.google.com/beta-shopfloor-posh",
                attendees_count=380,
                auto_reminder_7d_enabled=True,
                auto_reminder_2d_enabled=True
            ),
            Webinar(
                company_id=beta.id,
                title="Addressing Subtle Hostile Work Environments in Manufacturing",
                speaker="Sanjay Deshpande (Senior Corporate Advocate)",
                session_time=datetime.utcnow() + timedelta(days=12, hours=1),
                duration_minutes=75,
                meeting_url="https://meet.google.com/beta-manufacturing-dignity",
                attendees_count=210,
                auto_reminder_7d_enabled=True,
                auto_reminder_2d_enabled=True
            )
        ])
    db.commit()

    # Nexus Compliance Documents
    if db.query(ComplianceDocument).filter(ComplianceDocument.company_id == nexus.id).count() == 0:
        db.add_all([
            ComplianceDocument(
                company_id=nexus.id,
                title="Nexus BioSciences Statutory PoSH Policy 2026",
                doc_type="STATUTORY_POLICY",
                file_size_kb=1650,
                version="2.0"
            ),
            ComplianceDocument(
                company_id=nexus.id,
                title="Internal Committee Gazette Notification & Mandate",
                doc_type="IC_CONSTITUTION",
                file_size_kb=880,
                version="1.1"
            )
        ])
    db.commit()

    # 4. Employees for Nexus (450 employees)
    nexus_emp_count = db.query(Employee).filter(Employee.company_id == nexus.id).count()
    if nexus_emp_count == 0:
        departments = ["Clinical Research", "Pharmacovigilance", "Bio-Informatics", "Regulatory Affairs", "Quality Assurance & Ethics"]
        first_names = ["Ananya", "Rhea", "Vikram", "Sanjay", "Deepika", "Kavita", "Sameer", "Geeta", "Manish", "Aditi"]
        last_names = ["Chatterjee", "Bhattacharya", "Menon", "Mukherjee", "Swaminathan", "Nambiar", "Sengupta", "Pillai"]

        random.seed(99)
        nexus_employees = []
        for i in range(1, 451):
            fn = first_names[i % len(first_names)]
            ln = last_names[(i // len(first_names)) % len(last_names)]
            dept = departments[i % len(departments)]
            code = f"NEX-{3000 + i}"
            email = f"{fn.lower()}.{ln.lower()}{i}@nexusbio.com"
            
            # High 93.3% completion rate
            is_completed = (i % 100) < 93
            is_in_progress = not is_completed and (i % 100) < 98

            if is_completed:
                tr_status = "COMPLETED"
                tr_pct = 100.0
                score = round(random.uniform(80.0, 99.0), 1)
                as_status = "PASSED"
                cert_status = "ISSUED"
                cert_id = f"CERT-NEXUS-{code}"
            elif is_in_progress:
                tr_status = "IN_PROGRESS"
                tr_pct = round(random.uniform(40.0, 85.0), 1)
                score = 65.0 if (i % 2 == 0) else None
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
                company_id=nexus.id,
                employee_code=code,
                first_name=fn,
                last_name=ln,
                email=email,
                department=dept,
                designation="Senior Research Fellow" if (i % 4 == 0) else "Clinical Associate",
                training_status=tr_status,
                training_progress_pct=tr_pct,
                training_completion_date=datetime.utcnow() - timedelta(days=random.randint(1, 25)) if is_completed else None,
                assessment_status=as_status,
                assessment_score=score,
                assessment_date=datetime.utcnow() - timedelta(days=random.randint(1, 15)) if score else None,
                certificate_status=cert_status,
                certificate_id=cert_id,
                certificate_issued_at=datetime.utcnow() - timedelta(days=random.randint(1, 10)) if cert_status == "ISSUED" else None
            )
            nexus_employees.append(emp)

        db.bulk_save_objects(nexus_employees)
        db.commit()

    db.close()
    print("Multi-tenant database initialized and populated with Acme, Beta, and Nexus BioSciences successfully!")

if __name__ == "__main__":
    init_db()
