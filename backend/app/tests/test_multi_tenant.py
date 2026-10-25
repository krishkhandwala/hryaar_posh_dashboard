import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_login_and_multi_tenant_isolation():
    # 1. Login as Acme HR Admin
    res_acme = client.post("/api/v1/auth/login", json={"email": "hr@acme.com", "password": "Acme@1234"})
    assert res_acme.status_code == 200
    acme_token = res_acme.json()["access_token"]
    acme_company_id = res_acme.json()["company_id"]
    assert acme_company_id == "c-acme-corp-1250"

    headers_acme = {"Authorization": f"Bearer {acme_token}"}

    # 2. Acme should see exactly 1,250 total employees
    kpi_res = client.get("/api/v1/dashboard/kpis", headers=headers_acme)
    assert kpi_res.status_code == 200
    kpis = kpi_res.json()
    assert kpis["total_employees"] == 1250

    # 3. Acme should NEVER be able to query Beta's data
    cross_tenant_res = client.get("/api/v1/dashboard/kpis?company_id=c-beta-ind-600", headers=headers_acme)
    assert cross_tenant_res.status_code == 403
    assert "cross-tenant" in cross_tenant_res.json()["detail"]

    # 4. Login as Beta HR Admin
    res_beta = client.post("/api/v1/auth/login", json={"email": "hr@beta.com", "password": "Beta@1234"})
    assert res_beta.status_code == 200
    beta_token = res_beta.json()["access_token"]
    headers_beta = {"Authorization": f"Bearer {beta_token}"}

    # 5. Beta should see exactly 600 total employees
    beta_kpi_res = client.get("/api/v1/dashboard/kpis", headers=headers_beta)
    assert beta_kpi_res.status_code == 200
    assert beta_kpi_res.json()["total_employees"] == 600

    # 6. Beta cannot query Acme's data
    cross_acme = client.get("/api/v1/dashboard/kpis?company_id=c-acme-corp-1250", headers=headers_beta)
    assert cross_acme.status_code == 403
