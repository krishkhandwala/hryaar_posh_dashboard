from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, Company, AuditLog, Employee
from app.schemas.schemas import Token, UserLogin, UserCreate, UserOut
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.deps import get_current_user

router = APIRouter()

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    # 1. First check User table
    user = db.query(User).filter(User.email == login_data.email).first()

    # 2. If user not found, check Employee table by email or employee_code
    emp = None
    if not user:
        emp = db.query(Employee).filter(
            (Employee.email == login_data.email) | (Employee.employee_code == login_data.email)
        ).first()

        if emp:
            # Check standard password for corporate employees
            valid_passwords = ["Employee@1234", "Posh@1234", "Acme@1234", "Nexus@1234", "Beta@1234"]
            if login_data.password in valid_passwords:
                user = db.query(User).filter(User.email == emp.email).first()
                if not user:
                    user = User(
                        email=emp.email,
                        full_name=f"{emp.first_name} {emp.last_name}",
                        hashed_password=get_password_hash(login_data.password),
                        role="EMPLOYEE",
                        company_id=emp.company_id,
                        designation=emp.designation or "Employee / Learner",
                        is_active=True,
                        status="ACTIVE"
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect corporate email, employee code, or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # If user exists, verify password (or allow standard employee password for employee role)
    if user.role == "EMPLOYEE" and login_data.password in ["Employee@1234", "Posh@1234", "Acme@1234", "Nexus@1234", "Beta@1234"]:
        pass # Allow standard employee password
    elif not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect corporate email, employee code, or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active or user.status == "SUSPENDED":
        raise HTTPException(status_code=403, detail="Account is deactivated or suspended")
    
    # Check tenant company standing
    company = None
    if user.company_id:
        company = db.query(Company).filter(Company.id == user.company_id).first()
        if not company or not company.is_active or company.status == "SUSPENDED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization subscription or access has been suspended"
            )

    user.last_login_at = datetime.utcnow()
    
    # Log audit event
    audit = AuditLog(
        company_id=user.company_id,
        actor_user_id=user.id,
        user_email=user.email,
        action="USER_LOGIN_SUCCESS",
        details=f"Successful authentication for role {user.role}"
    )
    db.add(audit)
    db.commit()

    company_name = company.name if company else "HRYAAR Platform"
    logo_url = company.logo_url if company else None
    primary_color = company.primary_color if company else "#2A62FF"
    secondary_color = company.secondary_color if company else "#1D4ED8"
    accent_color = company.accent_color if company else "#F59E0B"
    sidebar_color = company.sidebar_color if company else "#061122"
    welcome_message = company.welcome_message if company else "Welcome to HRYAAR Digi-PoSH"
    company_type = company.company_type if company else "CLIENT"
    partner_id = company.partner_id if company else None
    partner_name = (company.partner.name if (company and company.partner) else (company.partner_name if company else None))
    partner_logo_url = (company.partner.logo_url if (company and company.partner) else (company.partner_logo_url if company else None))
    co_branding_mode = company.co_branding_mode if company else "CO_BRANDED"

    # Employee record metadata if role is EMPLOYEE
    emp_code = None
    emp_dept = None
    emp_tr_pct = None
    emp_tr_status = None
    emp_cert_id = None

    if user.role == "EMPLOYEE" or emp:
        if not emp:
            emp = db.query(Employee).filter(
                (Employee.email == user.email) & (Employee.company_id == user.company_id)
            ).first()
        if emp:
            emp_code = emp.employee_code
            emp_dept = emp.department
            emp_tr_pct = emp.training_progress_pct
            emp_tr_status = emp.training_status
            emp_cert_id = emp.certificate_id
    
    access_token = create_access_token(
        subject=user.id,
        company_id=user.company_id,
        role=user.role
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        company_id=user.company_id,
        company_name=company_name,
        logo_url=logo_url,
        primary_color=primary_color,
        secondary_color=secondary_color,
        accent_color=accent_color,
        sidebar_color=sidebar_color,
        welcome_message=welcome_message,
        status=user.status,
        company_type=company_type,
        partner_id=partner_id,
        partner_name=partner_name,
        partner_logo_url=partner_logo_url,
        co_branding_mode=co_branding_mode,
        employee_code=emp_code,
        department=emp_dept,
        training_progress_pct=emp_tr_pct,
        training_status=emp_tr_status,
        certificate_id=emp_cert_id
    )

@router.get("/me")
def read_current_user(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = None
    if current_user.company_id:
        company = db.query(Company).filter(Company.id == current_user.company_id).first()

    emp_code = None
    emp_dept = None
    emp_tr_pct = None
    emp_tr_status = None
    emp_cert_id = None
    emp_as_status = None
    emp_as_score = None

    if current_user.role == "EMPLOYEE":
        emp = db.query(Employee).filter(
            (Employee.email == current_user.email) & (Employee.company_id == current_user.company_id)
        ).first()
        if emp:
            emp_code = emp.employee_code
            emp_dept = emp.department
            emp_tr_pct = emp.training_progress_pct
            emp_tr_status = emp.training_status
            emp_cert_id = emp.certificate_id
            emp_as_status = emp.assessment_status
            emp_as_score = emp.assessment_score

    partner_name = (company.partner.name if (company and company.partner) else (company.partner_name if company else None))
    partner_logo_url = (company.partner.logo_url if (company and company.partner) else (company.partner_logo_url if company else None))

    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "company_id": current_user.company_id,
        "company_name": company.name if company else "HRYAAR Platform",
        "logo_url": company.logo_url if company else None,
        "primary_color": company.primary_color if company else "#2A62FF",
        "secondary_color": company.secondary_color if company else "#1D4ED8",
        "accent_color": company.accent_color if company else "#F59E0B",
        "sidebar_color": company.sidebar_color if company else "#061122",
        "welcome_message": company.welcome_message if company else "Welcome to HRYAAR Digi-PoSH",
        "designation": current_user.designation,
        "status": current_user.status,
        "partner_name": partner_name,
        "partner_logo_url": partner_logo_url,
        "co_branding_mode": company.co_branding_mode if company else "CO_BRANDED",
        "employee_code": emp_code,
        "department": emp_dept,
        "training_progress_pct": emp_tr_pct,
        "training_status": emp_tr_status,
        "certificate_id": emp_cert_id,
        "assessment_status": emp_as_status,
        "assessment_score": emp_as_score
    }
