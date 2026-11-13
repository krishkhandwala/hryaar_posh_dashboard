import pytest
import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    assert "HRYAAR" in res.json()["app"]

def test_super_admin_authentication_and_dashboard():
    # 1. Login as Super Admin
    res = client.post("/api/v1/auth/login", json={"email": "superadmin@hryaar.com", "password": "Admin@1234"})
    assert res.status_code == 200
    sa_token = res.json()["access_token"]
    assert res.json()["role"] in ["SUPER_ADMIN", "PLATFORM_ADMIN"]
    headers_sa = {"Authorization": f"Bearer {sa_token}"}

    # 2. Super Admin can access platform analytics
    analytics_res = client.get("/api/v1/super-admin/analytics", headers=headers_sa)
    assert analytics_res.status_code == 200
    data = analytics_res.json()
    assert data["total_companies"] >= 2
    assert data["total_employees"] >= 1850

    # 3. Super Admin can view system health
    health_res = client.get("/api/v1/super-admin/system-health", headers=headers_sa)
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "OPERATIONAL"

    # 4. Super Admin can list companies
    comps_res = client.get("/api/v1/super-admin/companies", headers=headers_sa)
    assert comps_res.status_code == 200
    comp_names = [c["name"] for c in comps_res.json()]
    assert "Nimbus Cloud Systems Pvt. Ltd." in comp_names
    assert "Crestline Precision Engineering" in comp_names

def test_tenant_login_and_dynamic_branding():
    # Acme Login returns Acme theme and branding
    res_acme = client.post("/api/v1/auth/login", json={"email": "hr@acme.com", "password": "Acme@1234"})
    assert res_acme.status_code == 200
    acme_data = res_acme.json()
    assert acme_data["company_name"] == "Nimbus Cloud Systems Pvt. Ltd."
    assert acme_data["primary_color"] in ["#142D50", "#1B365D"]

    # Beta Login returns Beta theme and branding
    res_beta = client.post("/api/v1/auth/login", json={"email": "hr@beta.com", "password": "Beta@1234"})
    assert res_beta.status_code == 200
    beta_data = res_beta.json()
    assert beta_data["company_name"] == "Crestline Precision Engineering"
    assert beta_data["primary_color"] == "#065F46"
    assert beta_data["sidebar_color"] == "#064E3B"
    assert beta_data["primary_color"] != acme_data["primary_color"]

def test_multi_tenant_data_isolation():
    # 1. Login Acme Admin
    res_acme = client.post("/api/v1/auth/login", json={"email": "hr@acme.com", "password": "Acme@1234"})
    acme_token = res_acme.json()["access_token"]
    headers_acme = {"Authorization": f"Bearer {acme_token}"}

    # 2. Login Beta Admin
    res_beta = client.post("/api/v1/auth/login", json={"email": "hr@beta.com", "password": "Beta@1234"})
    beta_token = res_beta.json()["access_token"]
    headers_beta = {"Authorization": f"Bearer {beta_token}"}

    # 3. Acme KPIs
    acme_kpis = client.get("/api/v1/dashboard/kpis", headers=headers_acme).json()
    assert acme_kpis["total_employees"] == 1250

    # 4. Beta KPIs
    beta_kpis = client.get("/api/v1/dashboard/kpis", headers=headers_beta).json()
    assert beta_kpis["total_employees"] == 600

    # 5. Acme cross-tenant attack against Beta is rejected
    cross_res = client.get("/api/v1/dashboard/kpis?company_id=c-beta-ind-600", headers=headers_acme)
    assert cross_res.status_code == 403
    assert "cross-tenant" in cross_res.json()["detail"].lower()

    # 6. Beta cross-tenant attack against Acme is rejected
    cross_res2 = client.get("/api/v1/dashboard/kpis?company_id=c-acme-corp-1250", headers=headers_beta)
    assert cross_res2.status_code == 403

def test_rbac_company_admin_cannot_access_super_admin():
    # Company Admin cannot access Super Admin company management
    res_acme = client.post("/api/v1/auth/login", json={"email": "hr@acme.com", "password": "Acme@1234"})
    headers_acme = {"Authorization": f"Bearer {res_acme.json()['access_token']}"}

    res = client.get("/api/v1/super-admin/companies", headers=headers_acme)
    assert res.status_code == 403
    assert "Super Administrator privileges required" in res.json()["detail"]

    res_analytics = client.get("/api/v1/super-admin/analytics", headers=headers_acme)
    assert res_analytics.status_code == 403

def test_posh_complaints_isolation():
    # Company Admin / HR Manager must NOT automatically access confidential grievance contents
    res_hr_acme = client.post("/api/v1/auth/login", json={"email": "hr@acme.com", "password": "Acme@1234"})
    headers_hr_acme = {"Authorization": f"Bearer {res_hr_acme.json()['access_token']}"}
    hr_denied = client.get("/api/v1/company/complaints", headers=headers_hr_acme)
    assert hr_denied.status_code == 403

    # Authorised IC Members view ONLY their own company's complaints
    res_ic_acme = client.post("/api/v1/auth/login", json={"email": "ic@acme.com", "password": "Ic@1234"})
    assert res_ic_acme.status_code == 200
    assert res_ic_acme.json()["workspace"] == "IC_WORKSPACE"
    headers_ic_acme = {"Authorization": f"Bearer {res_ic_acme.json()['access_token']}"}

    res_ic_beta = client.post("/api/v1/auth/login", json={"email": "ic@beta.com", "password": "Ic@1234"})
    assert res_ic_beta.status_code == 200
    headers_ic_beta = {"Authorization": f"Bearer {res_ic_beta.json()['access_token']}"}

    # Acme IC complaints
    acme_res = client.get("/api/v1/company/complaints", headers=headers_ic_acme)
    assert acme_res.status_code == 200
    acme_complaints = acme_res.json()
    assert len(acme_complaints) > 0
    for comp in acme_complaints:
        assert "ACME" in comp["complaint_number"]

    # Beta IC complaints
    beta_res = client.get("/api/v1/company/complaints", headers=headers_ic_beta)
    assert beta_res.status_code == 200
    beta_complaints = beta_res.json()
    assert len(beta_complaints) > 0
    for comp in beta_complaints:
        assert "BETA" in comp["complaint_number"]

    # Beta IC cannot view Acme specific complaint details
    acme_comp_id = acme_complaints[0]["id"]
    unauth_comp = client.get(f"/api/v1/company/complaints/{acme_comp_id}", headers=headers_ic_beta)
    assert unauth_comp.status_code == 404

def test_company_branding_customization_and_isolation():
    res_acme = client.post("/api/v1/auth/login", json={"email": "hr@acme.com", "password": "Acme@1234"})
    headers_acme = {"Authorization": f"Bearer {res_acme.json()['access_token']}"}

    res_sa = client.post("/api/v1/auth/login", json={"email": "superadmin@hryaar.com", "password": "Admin@1234"})
    headers_sa = {"Authorization": f"Bearer {res_sa.json()['access_token']}"}

    res_beta = client.post("/api/v1/auth/login", json={"email": "hr@beta.com", "password": "Beta@1234"})
    headers_beta = {"Authorization": f"Bearer {res_beta.json()['access_token']}"}

    # Company admin is restricted and receives 403
    forbidden_res = client.put(
        "/api/v1/company/branding",
        headers=headers_acme,
        json={
            "primary_color": "#1B365D",
            "welcome_message": "Acme Updated Welcome Header"
        }
    )
    assert forbidden_res.status_code == 403

    # Super Admin / Partner Admin is authorized
    update_res = client.put(
        "/api/v1/company/branding",
        headers=headers_sa,
        json={
            "primary_color": "#1B365D",
            "welcome_message": "Acme Updated Welcome Header"
        }
    )
    assert update_res.status_code == 200
    assert update_res.json()["primary_color"] == "#1B365D"
    assert update_res.json()["welcome_message"] == "Acme Updated Welcome Header"

    # Beta's branding remains completely untouched
    beta_branding = client.get("/api/v1/company/branding", headers=headers_beta).json()
    assert beta_branding["primary_color"] == "#065F46"
    assert "Acme" not in beta_branding["welcome_message"]

def test_company_suspension_lifecycle():
    # 1. Super Admin logs in
    sa_res = client.post("/api/v1/auth/login", json={"email": "superadmin@hryaar.com", "password": "Admin@1234"})
    headers_sa = {"Authorization": f"Bearer {sa_res.json()['access_token']}"}

    # 2. Create a test company
    comp_create_res = client.post(
        "/api/v1/super-admin/companies",
        headers=headers_sa,
        json={
            "name": "Gamma Solutions",
            "slug": "gamma",
            "admin_email": "admin@gamma.com",
            "admin_password": "Gamma@1234"
        }
    )
    assert comp_create_res.status_code == 200
    gamma_id = comp_create_res.json()["id"]

    # 3. Gamma Admin can login initially
    gamma_login = client.post("/api/v1/auth/login", json={"email": "admin@gamma.com", "password": "Gamma@1234"})
    assert gamma_login.status_code == 200
    gamma_headers = {"Authorization": f"Bearer {gamma_login.json()['access_token']}"}

    # 4. Super Admin suspends Gamma Solutions
    suspend_res = client.patch(f"/api/v1/super-admin/companies/{gamma_id}/status", headers=headers_sa, json={"status": "SUSPENDED"})
    assert suspend_res.status_code == 200
    assert suspend_res.json()["status"] == "SUSPENDED"

    # 5. Gamma Admin is now blocked from operational endpoints
    blocked_res = client.get("/api/v1/dashboard/kpis", headers=gamma_headers)
    assert blocked_res.status_code == 403
    assert "suspended" in blocked_res.json()["detail"].lower()

    # 6. Subsequent login attempt for suspended company is blocked
    failed_login = client.post("/api/v1/auth/login", json={"email": "admin@gamma.com", "password": "Gamma@1234"})
    assert failed_login.status_code == 403

    # 7. Super Admin reactivates Gamma
    reactivate_res = client.patch(f"/api/v1/super-admin/companies/{gamma_id}/status", headers=headers_sa, json={"status": "ACTIVE"})
    assert reactivate_res.status_code == 200

    # 8. Clean up
    delete_res = client.delete(f"/api/v1/super-admin/companies/{gamma_id}", headers=headers_sa)
    assert delete_res.status_code == 200

def test_logo_file_upload_validation():
    res_acme = client.post("/api/v1/auth/login", json={"email": "hr@acme.com", "password": "Acme@1234"})
    headers_acme = {"Authorization": f"Bearer {res_acme.json()['access_token']}"}

    res_sa = client.post("/api/v1/auth/login", json={"email": "superadmin@hryaar.com", "password": "Admin@1234"})
    headers_sa = {"Authorization": f"Bearer {res_sa.json()['access_token']}"}

    fake_png = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4")

    # Company admin is restricted and receives 403
    forbidden_res = client.post(
        "/api/v1/company/branding/logo",
        headers=headers_acme,
        files={"file": ("acme_logo.png", fake_png, "image/png")}
    )
    assert forbidden_res.status_code == 403

    # Upload valid image file as Super Admin
    fake_png.seek(0)
    upload_res = client.post(
        "/api/v1/company/branding/logo",
        headers=headers_sa,
        files={"file": ("acme_logo.png", fake_png, "image/png")}
    )
    assert upload_res.status_code == 200
    assert "/static/uploads/brand_" in upload_res.json()["logo_url"]

    # Reject non-image file
    fake_exe = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00")
    bad_upload = client.post(
        "/api/v1/company/branding/logo",
        headers=headers_sa,
        files={"file": ("malware.exe", fake_exe, "application/octet-stream")}
    )
    assert bad_upload.status_code == 400
    assert "Invalid image type" in bad_upload.json()["detail"]
