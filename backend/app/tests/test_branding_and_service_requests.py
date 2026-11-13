import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.models import User, Company, Employee, ClientServiceRequest

client = TestClient(app)

def _login(email: str, password: str):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})

def test_branding_restricted_to_admin_and_partner():
    """Ensure Company Admin cannot change branding, but Super Admin can."""
    # 1. Company Admin login (e.g. Acme Corp)
    ca_login = _login("hr@acme.com", "Acme@1234")
    assert ca_login.status_code == 200
    ca_token = ca_login.json()["access_token"]

    # Attempt to update branding as Company Admin -> Must be 403 Forbidden
    res = client.put(
        "/api/v1/company/branding",
        headers={"Authorization": f"Bearer {ca_token}"},
        json={"primary_color": "#FF0000"}
    )
    assert res.status_code == 403
    assert "restricted" in res.json()["detail"].lower()

    # Attempt to upload logo as Company Admin -> Must be 403 Forbidden
    fake_png = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4")
    res_logo = client.post(
        "/api/v1/company/branding/logo",
        headers={"Authorization": f"Bearer {ca_token}"},
        files={"file": ("logo.png", fake_png, "image/png")}
    )
    assert res_logo.status_code == 403

    # 2. Super Admin login -> Allowed
    sa_login = _login("superadmin@hryaar.com", "Admin@1234")
    assert sa_login.status_code == 200
    sa_token = sa_login.json()["access_token"]

    res_sa = client.put(
        "/api/v1/company/branding",
        headers={"Authorization": f"Bearer {sa_token}"},
        json={"primary_color": "#2A62FF"}
    )
    assert res_sa.status_code == 200


def test_credit_system_and_employee_filter():
    """Verify credits endpoint and employee failed/benchmark filter."""
    ca_login = _login("hr@acme.com", "Acme@1234")
    assert ca_login.status_code == 200
    ca_token = ca_login.json()["access_token"]

    # 1. Check Credits
    cred_res = client.get(
        "/api/v1/company/credits",
        headers={"Authorization": f"Bearer {ca_token}"}
    )
    assert cred_res.status_code == 200
    cred_data = cred_res.json()
    assert "credits_total" in cred_data
    assert "credits_used" in cred_data
    assert "credits_remaining" in cred_data
    assert cred_data["credits_total"] >= cred_data["credits_used"]

    # 2. Test employee roster filter for failed / below threshold
    emp_res = client.get(
        "/api/v1/employees?assessment_status=FAILED",
        headers={"Authorization": f"Bearer {ca_token}"}
    )
    assert emp_res.status_code == 200
    failed_list = emp_res.json()
    assert isinstance(failed_list, list)
    for emp in failed_list:
        if emp.get("assessment_score") is not None:
            assert emp["assessment_score"] < 70.0


def test_service_requests_csv_upload_and_super_admin_view():
    """Verify client can upload CSV roster and submit concerns, and Super Admin gets it."""
    ca_login = _login("hr@acme.com", "Acme@1234")
    assert ca_login.status_code == 200
    ca_token = ca_login.json()["access_token"]

    # 1. Upload sample CSV with names, emails, phones
    csv_content = (
        "Name,Email,Phone,Department,Designation\n"
        "Rajesh Kumar,rajesh.kumar@acme.com,9876543210,Engineering,Lead Architect\n"
        "Priya Sharma,priya.sharma@acme.com,9876543211,Product,Senior PM\n"
    ).encode("utf-8")

    upload_res = client.post(
        "/api/v1/company/service-requests/upload-csv",
        headers={"Authorization": f"Bearer {ca_token}"},
        files={"file": ("sample_roster.csv", io.BytesIO(csv_content), "text/csv")},
        data={"notes": "Q1 2026 Engineering Batch Addition"}
    )
    assert upload_res.status_code == 200
    up_data = upload_res.json()
    assert up_data["row_count"] == 2
    req_id = up_data["request_id"]

    # 2. Submit a corporate concern
    concern_res = client.post(
        "/api/v1/company/service-requests/concern",
        headers={"Authorization": f"Bearer {ca_token}"},
        json={
            "title": "Need IC External Member Recommendation",
            "category": "GRIEVANCE_ASSISTANCE",
            "priority": "HIGH",
            "description": "Please provide certified external advocate profile for our Mumbai branch IC."
        }
    )
    assert concern_res.status_code == 200

    # 3. Super Admin logs in and reviews service requests
    sa_login = _login("superadmin@hryaar.com", "Admin@1234")
    sa_token = sa_login.json()["access_token"]

    sa_reqs = client.get(
        "/api/v1/super-admin/service-requests",
        headers={"Authorization": f"Bearer {sa_token}"}
    )
    assert sa_reqs.status_code == 200
    req_items = sa_reqs.json()
    assert len(req_items) >= 2
    found_csv = any(r["id"] == req_id for r in req_items)
    assert found_csv is True

    # 4. Super Admin approves request with notes
    patch_res = client.patch(
        f"/api/v1/super-admin/service-requests/{req_id}",
        headers={"Authorization": f"Bearer {sa_token}"},
        json={
            "status": "APPROVED",
            "admin_notes": "Verified against compliance quota. Approved for scheduling.",
            "auto_ingest": False
        }
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["new_status"] == "APPROVED"
