import io
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import Company, Employee, TrainingRecord, AssessmentRecord, ImportJob, AuditLog

class CSVImportService:
    @staticmethod
    def process_csv(file_bytes: bytes, filename: str, company_id: str, db: Session, user_email: str):
        # Create import job record
        import_job = ImportJob(
            company_id=company_id,
            source="CSV",
            filename=filename,
            status="PROCESSING"
        )
        db.add(import_job)
        db.commit()
        db.refresh(import_job)

        try:
            # Parse CSV with pandas
            df = pd.read_csv(io.BytesIO(file_bytes))
            
            # Normalize column names (strip whitespace and lowercase)
            df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
            
            # Required standard columns mapping
            # Support Leap10x headers or standard headers
            col_map = {
                "emp_id": "employee_code",
                "employee_id": "employee_code",
                "employee_code": "employee_code",
                "first_name": "first_name",
                "last_name": "last_name",
                "name": "full_name",
                "email": "email",
                "department": "department",
                "designation": "designation",
                "progress": "progress",
                "training_progress": "progress",
                "score": "score",
                "assessment_score": "score",
                "completion_date": "completion_date"
            }
            
            total_rows = len(df)
            successful_rows = 0
            failed_rows = 0
            errors = []

            comp = db.query(Company).filter(Company.id == company_id).first()
            current_emp_count = db.query(Employee).filter(Employee.company_id == company_id).count()
            assigned_quota = comp.assigned_seat_quota if (comp and comp.assigned_seat_quota and comp.assigned_seat_quota > 0) else None
            plan_limit = comp.plan.max_employees if (comp and comp.plan and comp.plan.max_employees > 0) else None
            effective_limit = min(x for x in [assigned_quota, plan_limit] if x is not None) if (assigned_quota or plan_limit) else None

            for idx, row in df.iterrows():
                try:
                    code = str(row.get("employee_code", row.get("emp_id", row.get("employee_id", "")))).strip()
                    email = str(row.get("email", "")).strip()
                    
                    if not code or not email or code == "nan" or email == "nan":
                        failed_rows += 1
                        continue

                    dept = str(row.get("department", "General")).strip()
                    if dept == "nan":
                        dept = "General"

                    # Names
                    first_name = str(row.get("first_name", "")).strip()
                    last_name = str(row.get("last_name", "")).strip()
                    if not first_name or first_name == "nan":
                        full_name = str(row.get("name", "Employee")).strip()
                        parts = full_name.split(" ", 1)
                        first_name = parts[0]
                        last_name = parts[1] if len(parts) > 1 else ""

                    # Progress & scores
                    raw_progress = row.get("progress", row.get("training_progress", 0))
                    try:
                        progress = float(str(raw_progress).replace("%", "").strip())
                    except:
                        progress = 0.0

                    raw_score = row.get("score", row.get("assessment_score", None))
                    score = None
                    if pd.notna(raw_score):
                        try:
                            score = float(str(raw_score).replace("%", "").strip())
                        except:
                            score = None

                    # Find or create employee strictly within company_id
                    emp = db.query(Employee).filter(
                        Employee.company_id == company_id,
                        (Employee.employee_code == code) | (Employee.email == email)
                    ).first()

                    training_status = "COMPLETED" if progress >= 100 else ("IN_PROGRESS" if progress > 0 else "NOT_STARTED")
                    assessment_status = "NOT_ATTEMPTED"
                    if score is not None:
                        assessment_status = "PASSED" if score >= 70.0 else "FAILED"

                    cert_status = "ISSUED" if (training_status == "COMPLETED" and assessment_status == "PASSED") else "PENDING"
                    cert_id = f"CERT-{company_id[:4].upper()}-{code}" if cert_status == "ISSUED" else None

                    if not emp:
                        if effective_limit is not None and current_emp_count >= effective_limit:
                            raise ValueError(f"Seat quota reached ({current_emp_count}/{effective_limit})")
                        emp = Employee(
                            company_id=company_id,
                            employee_code=code,
                            first_name=first_name,
                            last_name=last_name,
                            email=email,
                            department=dept,
                            training_status=training_status,
                            training_progress_pct=progress,
                            training_completion_date=datetime.utcnow() if training_status == "COMPLETED" else None,
                            assessment_status=assessment_status,
                            assessment_score=score,
                            assessment_date=datetime.utcnow() if score is not None else None,
                            certificate_status=cert_status,
                            certificate_id=cert_id,
                            certificate_issued_at=datetime.utcnow() if cert_status == "ISSUED" else None
                        )
                        db.add(emp)
                        current_emp_count += 1
                    else:
                        emp.department = dept
                        emp.training_progress_pct = progress
                        emp.training_status = training_status
                        if training_status == "COMPLETED" and not emp.training_completion_date:
                            emp.training_completion_date = datetime.utcnow()
                        if score is not None:
                            emp.assessment_score = score
                            emp.assessment_status = assessment_status
                            emp.assessment_date = datetime.utcnow()
                        if cert_status == "ISSUED":
                            emp.certificate_status = "ISSUED"
                            emp.certificate_id = cert_id
                            emp.certificate_issued_at = datetime.utcnow()

                    successful_rows += 1
                except Exception as row_err:
                    failed_rows += 1
                    errors.append(f"Row {idx+1}: {str(row_err)}")

            import_job.total_rows = total_rows
            import_job.successful_rows = successful_rows
            import_job.failed_rows = failed_rows
            import_job.status = "COMPLETED" if failed_rows == 0 else "COMPLETED_WITH_WARNINGS"
            import_job.error_summary = "\n".join(errors[:10]) if errors else None

            # Add Audit Log
            audit = AuditLog(
                company_id=company_id,
                user_email=user_email,
                action="CSV_IMPORT",
                details=f"Imported {successful_rows} employees from {filename}. Failures: {failed_rows}"
            )
            db.add(audit)
            db.commit()

            return {
                "success": True,
                "import_job_id": import_job.id,
                "total_rows": total_rows,
                "successful_rows": successful_rows,
                "failed_rows": failed_rows
            }
        except Exception as e:
            db.rollback()
            import_job.status = "FAILED"
            import_job.error_summary = str(e)
            db.commit()
            raise e
