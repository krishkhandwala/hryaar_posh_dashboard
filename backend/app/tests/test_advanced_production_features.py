import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_enterprise_security_and_tracing_headers():
    """Verify OWASP and observability headers on every response"""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert "x-request-id" in resp.headers
    assert "x-response-time-ms" in resp.headers
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.headers.get("x-frame-options") == "SAMEORIGIN"
    assert resp.headers.get("x-xss-protection") == "1; mode=block"
    assert resp.headers.get("referrer-policy") == "strict-origin-when-cross-origin"

def test_statutory_scenario_quiz_and_certificate():
    """Verify quiz question retrieval, scenario submission, and certificate lookup"""
    # 1. Login as Acme admin
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "hr@acme.com", "password": "Acme@1234"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get questions
    q_resp = client.get("/api/v1/training/quiz/questions", headers=headers)
    assert q_resp.status_code == 200
    questions = q_resp.json()
    assert len(questions) == 5

    # 3. Submit passing answers
    submit_resp = client.post(
        "/api/v1/training/quiz/submit",
        json={"answers": {"q1": "A", "q2": "B", "q3": "A", "q4": "B", "q5": "B"}},
        headers=headers
    )
    assert submit_resp.status_code == 200
    data = submit_resp.json()
    assert data["passed"] is True
    assert data["score"] == 100.0
    cert_id = data["certificate_id"]
    assert cert_id.startswith("CERT-ACME-")

    # 4. Public certificate validation
    cert_resp = client.get(f"/api/v1/training/certificate/{cert_id}")
    assert cert_resp.status_code == 200
    cert_data = cert_resp.json()
    assert cert_data["certificate_id"] == cert_id
    assert cert_data["is_valid"] is True
    assert cert_data["status"] == "CRYPTOGRAPHICALLY_VERIFIED"

def test_annual_statutory_pdf_report_generation():
    """Verify generation of Section 21 statutory compliance PDF report"""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "hr@acme.com", "password": "Acme@1234"}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    pdf_resp = client.get("/api/v1/company/reports/annual-statutory-pdf", headers=headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert len(pdf_resp.content) > 1000
    # PDF magic number header: %PDF-
    assert pdf_resp.content[:5] == b"%PDF-"

def test_lms_integrations_and_webhook_simulation():
    """Verify external LMS adapter details and batch simulation"""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "hr@acme.com", "password": "Acme@1234"}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch integrations info
    int_resp = client.get("/api/v1/company/integrations", headers=headers)
    assert int_resp.status_code == 200
    int_data = int_resp.json()
    assert "webhook_url" in int_data
    assert "c-acme-corp-1250" in int_data["webhook_url"]

    # 2. Simulate LMS webhook ingestion
    sync_resp = client.post("/api/v1/company/integrations/simulate-lms-sync", json={}, headers=headers)
    assert sync_resp.status_code == 200
    sync_data = sync_resp.json()
    assert sync_data["status"] == "success"
    assert "synced_records" in sync_data

