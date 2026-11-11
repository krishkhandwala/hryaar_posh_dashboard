import pytest
import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_full_definition_of_done_scenario():
    """
    Automated verification of the exact scenario defined in prompt Section 20:
    1. Super Admin logs into central administrative platform.
    2. Super Admin creates Company A and uploads logo.
    3. Super Admin creates Company B and uploads a different logo.
    4. Super Admin provisions administrator account for each company.
    5. Company A admin logs in: sees Company A logo, branding, employees, analytics, POSH complaints.
    6. Company B admin logs in: sees Company B logo, branding, employees, analytics, POSH complaints.
    7. Both companies operate concurrently on the single platform.
    8. Cross-tenant access is rejected with 403 Forbidden.
    9. Super Admin independently inspects and manages both companies.
    """

    # -------------------------------------------------------------
    # STEP 1: Super Admin logs into the central administrative dashboard
    # -------------------------------------------------------------
    sa_login = client.post("/api/v1/auth/login", json={
        "email": "superadmin@hryaar.com",
        "password": "Admin@1234"
    })
    assert sa_login.status_code == 200, "Super Admin login failed"
    sa_token = sa_login.json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}

    # Verify Super Admin has platform-level access
    analytics = client.get("/api/v1/super-admin/analytics", headers=sa_headers).json()
    assert analytics["total_companies"] >= 2

    # Idempotent pre-cleanup of test companies if a previous run was interrupted
    existing_comps = client.get("/api/v1/super-admin/companies", headers=sa_headers).json()
    for c in existing_comps:
        if c["slug"] in ["apex-fintech", "beacon-logistics"]:
            client.delete(f"/api/v1/super-admin/companies/{c['id']}", headers=sa_headers)

    # -------------------------------------------------------------
    # STEP 2 & 3: Create Company A (Apex FinTech) and Company B (Beacon Logistics)
    # -------------------------------------------------------------
    comp_a_res = client.post("/api/v1/super-admin/companies", headers=sa_headers, json={
        "name": "Apex FinTech Global",
        "slug": "apex-fintech",
        "industry": "Financial Technology & Wealth",
        "headquarters": "Bandra Kurla Complex, Mumbai",
        "primary_color": "#1E3A8A", # Deep Blue
        "secondary_color": "#3B82F6",
        "sidebar_color": "#0F172A",
        "welcome_message": "Apex FinTech Employee PoSH & Inclusion Portal",
        "admin_email": "admin@apexfintech.com",
        "admin_password": "ApexPassword@2026",
        "admin_name": "Rohan Deshmukh"
    })
    assert comp_a_res.status_code == 200, f"Failed to create Company A: {comp_a_res.text}"
    comp_a_id = comp_a_res.json()["id"]

    comp_b_res = client.post("/api/v1/super-admin/companies", headers=sa_headers, json={
        "name": "Beacon Logistics Worldwide",
        "slug": "beacon-logistics",
        "industry": "Supply Chain & Cargo Logistics",
        "headquarters": "Sector 18, Gurugram",
        "primary_color": "#047857", # Emerald Green
        "secondary_color": "#10B981",
        "sidebar_color": "#064E3B",
        "welcome_message": "Beacon Logistics Workplace Dignity & PoSH Compliance",
        "admin_email": "admin@beaconlogistics.com",
        "admin_password": "BeaconPassword@2026",
        "admin_name": "Kavita Rao"
    })
    assert comp_b_res.status_code == 200, f"Failed to create Company B: {comp_b_res.text}"
    comp_b_id = comp_b_res.json()["id"]

    # Upload distinct logo for Company A
    logo_a_data = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4")
    upload_a = client.post(
        f"/api/v1/super-admin/companies/{comp_a_id}/logo",
        headers=sa_headers,
        files={"file": ("apex_logo.png", logo_a_data, "image/png")}
    )
    assert upload_a.status_code == 200
    logo_a_url = upload_a.json()["logo_url"]
    assert "apex-fintech" in logo_a_url

    # Upload distinct logo for Company B
    logo_b_data = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4")
    upload_b = client.post(
        f"/api/v1/super-admin/companies/{comp_b_id}/logo",
        headers=sa_headers,
        files={"file": ("beacon_logo.png", logo_b_data, "image/png")}
    )
    assert upload_b.status_code == 200
    logo_b_url = upload_b.json()["logo_url"]
    assert "beacon-logistics" in logo_b_url
    assert logo_a_url != logo_b_url

    # -------------------------------------------------------------
    # STEP 4: Login as Company A Admin
    # -------------------------------------------------------------
    login_a = client.post("/api/v1/auth/login", json={
        "email": "admin@apexfintech.com",
        "password": "ApexPassword@2026"
    })
    assert login_a.status_code == 200, "Company A admin login failed"
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Verify Company A receives its own logo and branding
    assert login_a.json()["company_name"] == "Apex FinTech Global"
    assert login_a.json()["logo_url"] == logo_a_url
    assert login_a.json()["primary_color"] == "#1E3A8A"
    assert login_a.json()["sidebar_color"] == "#0F172A"
    assert "Apex FinTech" in login_a.json()["welcome_message"]

    # Company A Admin adds an employee to Company A
    emp_a_res = client.post("/api/v1/employees", headers=headers_a, json={
        "employee_code": "APX-001",
        "first_name": "Arjun",
        "last_name": "Nambiar",
        "email": "arjun.nambiar@apexfintech.com",
        "department": "Algorithmic Trading",
        "designation": "Quant Trader"
    })
    assert emp_a_res.status_code == 200

    # Company A Admin files a confidential POSH grievance
    complaint_a_res = client.post("/api/v1/company/complaints", headers=headers_a, json={
        "complainant_name": "Confidential Analyst 101",
        "complainant_department": "Algorithmic Trading",
        "respondent_name": "Senior Partner",
        "respondent_department": "Trading Strategy",
        "summary": "Inappropriate comments regarding personal dress and after-hours text messages."
    })
    assert complaint_a_res.status_code == 200
    complaint_a_id = complaint_a_res.json()["id"]

    # -------------------------------------------------------------
    # STEP 5: Login as Company B Admin
    # -------------------------------------------------------------
    login_b = client.post("/api/v1/auth/login", json={
        "email": "admin@beaconlogistics.com",
        "password": "BeaconPassword@2026"
    })
    assert login_b.status_code == 200, "Company B admin login failed"
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Verify Company B receives its own logo and branding
    assert login_b.json()["company_name"] == "Beacon Logistics Worldwide"
    assert login_b.json()["logo_url"] == logo_b_url
    assert login_b.json()["primary_color"] == "#047857"
    assert login_b.json()["sidebar_color"] == "#064E3B"
    assert "Beacon Logistics" in login_b.json()["welcome_message"]

    # Company B Admin adds an employee to Company B
    emp_b_res = client.post("/api/v1/employees", headers=headers_b, json={
        "employee_code": "BCN-001",
        "first_name": "Sunil",
        "last_name": "Chavan",
        "email": "sunil.chavan@beaconlogistics.com",
        "department": "Fleet Operations",
        "designation": "Logistics Dispatcher"
    })
    assert emp_b_res.status_code == 200

    # Company B Admin files a distinct POSH grievance
    complaint_b_res = client.post("/api/v1/company/complaints", headers=headers_b, json={
        "complainant_name": "Confidential Dispatcher 202",
        "complainant_department": "Fleet Operations",
        "respondent_name": "Depot Superintendent",
        "respondent_department": "Fleet Operations",
        "summary": "Hostile conduct following refusal of non-professional dinner invitations."
    })
    assert complaint_b_res.status_code == 200
    complaint_b_id = complaint_b_res.json()["id"]

    # -------------------------------------------------------------
    # STEP 6: Multi-Tenant Strict Isolation Verification
    # -------------------------------------------------------------
    # Company A Admin can see only Company A employees (count == 1)
    emps_a = client.get("/api/v1/employees", headers=headers_a).json()
    assert len(emps_a) == 1
    assert emps_a[0]["employee_code"] == "APX-001"

    # Company B Admin can see only Company B employees (count == 1)
    emps_b = client.get("/api/v1/employees", headers=headers_b).json()
    assert len(emps_b) == 1
    assert emps_b[0]["employee_code"] == "BCN-001"

    # Company A CANNOT access Company B's employees via spoofing parameter
    cross_emp = client.get(f"/api/v1/employees?company_id={comp_b_id}", headers=headers_a)
    assert cross_emp.status_code == 403

    # Company A / Company B Admins cannot read confidential IC grievance contents directly (403)
    assert client.get(f"/api/v1/company/complaints/{complaint_b_id}", headers=headers_a).status_code == 403
    assert client.get(f"/api/v1/company/complaints/{complaint_a_id}", headers=headers_b).status_code == 403

    # Explicitly authorised IC_MEMBER for Company A sees Company A complaint, gets 404 on Company B's
    client.post("/api/v1/super-admin/users", headers=sa_headers, json={
        "email": "ic@apexfintech.com",
        "full_name": "IC Chair Apex",
        "password": "IcPassword@2026",
        "role": "IC_MEMBER",
        "company_id": comp_a_id
    })
    ic_a_login = client.post("/api/v1/auth/login", json={"email": "ic@apexfintech.com", "password": "IcPassword@2026"})
    headers_ic_a = {"Authorization": f"Bearer {ic_a_login.json()['access_token']}"}
    assert client.get(f"/api/v1/company/complaints/{complaint_a_id}", headers=headers_ic_a).status_code == 200
    assert client.get(f"/api/v1/company/complaints/{complaint_b_id}", headers=headers_ic_a).status_code == 404

    # Company A CANNOT change Company B's branding
    cross_brand = client.put(
        f"/api/v1/company/branding?company_id={comp_b_id}",
        headers=headers_a,
        json={"primary_color": "#FF0000"}
    )
    # The server ignores any injected query param and modifies only Company A's branding
    # Verify Company B's branding was not changed to red
    brand_b = client.get("/api/v1/company/branding", headers=headers_b).json()
    assert brand_b["primary_color"] == "#047857"

    # -------------------------------------------------------------
    # STEP 7: Super Admin independently supervises both companies
    # -------------------------------------------------------------
    comp_a_detail = client.get(f"/api/v1/super-admin/companies/{comp_a_id}", headers=sa_headers).json()
    assert comp_a_detail["name"] == "Apex FinTech Global"
    assert comp_a_detail["total_employees"] == 1

    comp_b_detail = client.get(f"/api/v1/super-admin/companies/{comp_b_id}", headers=sa_headers).json()
    assert comp_b_detail["name"] == "Beacon Logistics Worldwide"
    assert comp_b_detail["total_employees"] == 1

    # Super Admin suspends Company B and verifies Company B is blocked
    client.patch(f"/api/v1/super-admin/companies/{comp_b_id}/status", headers=sa_headers, json={"status": "SUSPENDED"})
    blocked_b = client.get("/api/v1/dashboard/kpis", headers=headers_b)
    assert blocked_b.status_code == 403
    assert "suspended" in blocked_b.json()["detail"].lower()

    # Company A remains completely active and operational
    active_a = client.get("/api/v1/dashboard/kpis", headers=headers_a)
    assert active_a.status_code == 200

    # Clean up test companies
    client.delete(f"/api/v1/super-admin/companies/{comp_a_id}", headers=sa_headers)
    client.delete(f"/api/v1/super-admin/companies/{comp_b_id}", headers=sa_headers)

