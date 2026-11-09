import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.models import Employee, User, Company

client = TestClient(app)

def test_employee_login_and_learner_portal_flow():
    # 1. Login as an employee using corporate credentials
    login_res = client.post("/api/v1/auth/login", json={
        "email": "rohan.reddy194@acmecorp.com",
        "password": "Employee@1234"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    data = login_res.json()
    assert data["role"] == "EMPLOYEE"
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get learner context (/learner/me)
    profile_res = client.get("/api/v1/learner/me", headers=headers)
    assert profile_res.status_code == 200
    pdata = profile_res.json()
    assert pdata["employee"]["email"] == "rohan.reddy194@acmecorp.com"
    assert "Acme" in pdata["company"]["name"]

    # 3. Get statutory curriculum modules (/learner/modules)
    modules_res = client.get("/api/v1/learner/modules", headers=headers)
    assert modules_res.status_code == 200
    modules = modules_res.json()
    assert len(modules) == 3
    assert modules[0]["id"] == "posh-mod-1"

    # 4. Complete Module 1
    complete_res = client.post("/api/v1/learner/modules/posh-mod-1/complete", headers=headers)
    assert complete_res.status_code == 200
    cdata = complete_res.json()
    assert cdata["new_progress_pct"] >= 33.0

    # 5. Submit statutory scenario assessment
    submit_res = client.post("/api/v1/learner/assessment/submit", headers=headers, json={
        "answers": [
            {"question_id": "scenario-1", "selected_key": "B"},
            {"question_id": "scenario-2", "selected_key": "C"},
            {"question_id": "scenario-3", "selected_key": "B"},
            {"question_id": "scenario-4", "selected_key": "C"},
            {"question_id": "scenario-5", "selected_key": "B"}
        ]
    })
    assert submit_res.status_code == 200
    sdata = submit_res.json()
    assert sdata["passed"] is True
    assert sdata["score"] >= 70.0
    assert sdata["certificate_id"] is not None

    # 6. Retrieve issued verifiable certificate
    cert_res = client.get("/api/v1/learner/certificate", headers=headers)
    assert cert_res.status_code == 200
    cert_data = cert_res.json()
    assert cert_data["certificate_id"] == sdata["certificate_id"]
    assert "Acme" in cert_data["company_name"]

    # 7. File confidential inquiry to Internal Committee
    grievance_res = client.post("/api/v1/learner/file-grievance", headers=headers, json={
        "summary": "Inquiry regarding remote team meeting decorum and digital workplace policy."
    })
    assert grievance_res.status_code == 200
    gdata = grievance_res.json()
    assert gdata["status"] == "success"
    assert "CONF-" in gdata["ticket_number"]
