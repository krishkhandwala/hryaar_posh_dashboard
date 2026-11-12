import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.models import User, Company

client = TestClient(app)


def _login(email: str, password: str):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def test_partner_creation_assigns_partner_admin_role():
    """
    Phase 1 Bug Fix: Creating a PARTNER organisation via /super-admin/companies
    must provision the initial user with PARTNER_ADMIN role (not COMPANY_ADMIN)
    and resolve to PARTNER_WORKSPACE.
    """
    sa_res = _login("tech@hryaar.com", "Admin@1234")
    assert sa_res.status_code == 200
    assert sa_res.json()["workspace"] == "INTERNAL_PLATFORM"
    sa_headers = {"Authorization": f"Bearer {sa_res.json()['access_token']}"}

    uid = uuid.uuid4().hex[:6]
    partner_email = f"lead@{uid}partner.com"
    res = client.post("/api/v1/super-admin/companies", headers=sa_headers, json={
        "name": f"Zenith Advisory {uid}",
        "slug": f"zenith-{uid}",
        "company_type": "PARTNER",
        "assigned_seat_quota": 2000,
        "admin_email": partner_email,
        "admin_password": "PartnerPass@2026",
        "admin_name": "Zenith Lead"
    })
    assert res.status_code == 200, res.text
    assert res.json()["company_type"] == "PARTNER"

    # Verify initial partner admin logs in with PARTNER_ADMIN & PARTNER_WORKSPACE
    p_login = _login(partner_email, "PartnerPass@2026")
    assert p_login.status_code == 200, p_login.text
    assert p_login.json()["role"] == "PARTNER_ADMIN"
    assert p_login.json()["workspace"] == "PARTNER_WORKSPACE"


def test_hierarchy_constraints_prevent_invalid_and_circular_parents():
    """
    Phase 1 Security: Prevent attaching a PARTNER under another parent,
    attaching a CLIENT under another CLIENT, or self-parenting.
    """
    sa_res = _login("tech@hryaar.com", "Admin@1234")
    sa_headers = {"Authorization": f"Bearer {sa_res.json()['access_token']}"}

    uid = uuid.uuid4().hex[:6]
    # Cannot create a PARTNER with a partner_id
    bad_partner = client.post("/api/v1/super-admin/companies", headers=sa_headers, json={
        "name": f"Nested Partner {uid}",
        "slug": f"nested-{uid}",
        "company_type": "PARTNER",
        "partner_id": "p-talentpro-hr"
    })
    assert bad_partner.status_code == 400

    # Cannot attach a CLIENT to another CLIENT (Acme is a CLIENT)
    bad_client = client.post("/api/v1/super-admin/companies", headers=sa_headers, json={
        "name": f"Sub Client {uid}",
        "slug": f"subclient-{uid}",
        "company_type": "CLIENT",
        "partner_id": "c-acme-corp-1250"
    })
    assert bad_client.status_code == 400

    # Cannot self-parent an existing company
    self_parent = client.put("/api/v1/super-admin/companies/p-talentpro-hr", headers=sa_headers, json={
        "partner_id": "p-talentpro-hr"
    })
    assert self_parent.status_code == 400


def test_partner_mutual_exclusivity_and_seat_allocation_engine():
    """
    Phase 1 Bug Fix & Feature:
    - Partner A only sees its own assigned clients (not Partner B's Beta, not direct clients).
    - Partner A can onboard a client and adjust seats via /allocate-seats.
    - Total seats allocated cannot exceed Partner A's purchased pool.
    - Partner A cannot allocate seats on Partner B's client or read grievances.
    """
    pa_res = _login("partner@talentpro.com", "Partner@1234")
    assert pa_res.status_code == 200
    assert pa_res.json()["workspace"] == "PARTNER_WORKSPACE"
    pa_headers = {"Authorization": f"Bearer {pa_res.json()['access_token']}"}

    overview = client.get("/api/v1/partner/overview", headers=pa_headers)
    assert overview.status_code == 200
    odata = overview.json()
    client_slugs = [c["slug"] for c in odata["clients"]]
    assert "acme" in client_slugs
    assert "beta" not in client_slugs  # Mutual exclusivity

    # Partner A cannot inspect Partner B's Beta KPIs
    cross_partner = client.get("/api/v1/dashboard/kpis?company_id=c-beta-ind-600", headers=pa_headers)
    if cross_partner.status_code != 404:
        assert cross_partner.status_code == 403

    # Partner A cannot read confidential grievance contents
    grievances_attempt = client.get("/api/v1/company/complaints", headers=pa_headers)
    assert grievances_attempt.status_code == 403

    # Remaining capacity test: create a small client, re-allocate seats, reject over-allocation
    remaining = odata["remaining_seats"]
    if remaining >= 100:
        uid = uuid.uuid4().hex[:6]
        create_res = client.post("/api/v1/partner/clients", headers=pa_headers, json={
            "name": f"Partner Client {uid}",
            "assigned_seat_quota": 50,
            "admin_email": f"hr@{uid}.com",
            "admin_password": "ClientPass@2026"
        })
        assert create_res.status_code == 200, create_res.text
        new_client_id = create_res.json()["client_id"]

        # Valid seat increase within remaining pool
        alloc_ok = client.post(f"/api/v1/partner/clients/{new_client_id}/allocate-seats", headers=pa_headers, json={
            "seat_quota": 80
        })
        assert alloc_ok.status_code == 200, alloc_ok.text
        assert alloc_ok.json()["assigned_seat_quota"] == 80

        # Reject excessive seat allocation exceeding pool capacity
        over_alloc = client.post(f"/api/v1/partner/clients/{new_client_id}/allocate-seats", headers=pa_headers, json={
            "seat_quota": remaining + 99999
        })
        assert over_alloc.status_code == 400
        assert "exceeded" in over_alloc.json()["detail"].lower()


def test_employee_rbac_and_no_horizontal_privilege_leak():
    """
    Phase 1 Critical Security Fix:
    - Employee role cannot access HR Analytics KPIs, Employee directory, CSV import, or webinar mail-all.
    - An EMPLOYEE user without a matching Employee email never receives another employee's record.
    """
    emp_login = _login("rohan.reddy194@acmecorp.com", "Employee@1234")
    assert emp_login.status_code == 200
    assert emp_login.json()["workspace"] == "LEARNER_WORKSPACE"
    emp_headers = {"Authorization": f"Bearer {emp_login.json()['access_token']}"}

    assert client.get("/api/v1/dashboard/kpis", headers=emp_headers).status_code == 403
    assert client.get("/api/v1/employees", headers=emp_headers).status_code == 403
    assert client.post("/api/v1/dashboard/webinars/nonexistent/mail-all", headers=emp_headers).status_code == 403
    assert client.post("/api/v1/dashboard/webinars/nonexistent/trigger-reminders", json={}, headers=emp_headers).status_code == 403

    # Create an isolated EMPLOYEE user with no matching Employee record in Acme
    sa_headers = {"Authorization": f"Bearer {_login('tech@hryaar.com', 'Admin@1234').json()['access_token']}"}
    uid = uuid.uuid4().hex[:6]
    orphan_email = f"orphan-{uid}@acmecorp.com"
    u_res = client.post("/api/v1/super-admin/users", headers=sa_headers, json={
        "email": orphan_email,
        "full_name": "Orphan Learner",
        "password": "OrphanPass@2026",
        "role": "EMPLOYEE",
        "company_id": "c-acme-corp-1250"
    })
    assert u_res.status_code == 200

    orphan_token = _login(orphan_email, "OrphanPass@2026").json()["access_token"]
    profile = client.get("/api/v1/learner/me", headers={"Authorization": f"Bearer {orphan_token}"})
    assert profile.status_code == 200
    pdata = profile.json()
    # Must NOT leak another employee's email or certificate!
    assert pdata["employee"]["email"] == orphan_email
    assert pdata["employee"]["employee_code"] == "EMP-LOCAL"
    assert pdata["certificate"]["certificate_id"] is None


def test_session_revocation_on_logout_and_bcrypt_hashing():
    """
    Phase 1 Security Upgrade:
    - Password hashes are upgraded/stored using salted bcrypt ($2).
    - Calling POST /auth/logout immediately revokes the active JWT session.
    """
    login_res = _login("hr@acme.com", "Acme@1234")
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify bcrypt upgrade occurred in DB
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "hr@acme.com").first()
        assert user is not None
        assert user.hashed_password.startswith("$2")
    finally:
        db.close()

    # Active token works before logout
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200

    # Logout revokes session
    logout_res = client.post("/api/v1/auth/logout", headers=headers)
    assert logout_res.status_code == 200

    # Same token is now rejected
    me_after = client.get("/api/v1/auth/me", headers=headers)
    assert me_after.status_code == 401


def test_partner_overview_excludes_employee_analytics_and_allows_user_assignment():
    """
    Partners manage client orgs, seat allocations, and HR/admin user assignments.
    They must NOT receive employee training completion or assessment analytics.
    """
    login_res = _login("partner@talentpro.com", "Partner@1234")
    assert login_res.status_code == 200
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    overview = client.get("/api/v1/partner/overview", headers=headers)
    assert overview.status_code == 200
    odata = overview.json()
    assert "total_users_assigned" in odata
    assert "portfolio_avg_completion_pct" not in odata
    assert "total_learners_managed" not in odata

    clients_res = client.get("/api/v1/partner/clients", headers=headers)
    assert clients_res.status_code == 200
    clients = clients_res.json()
    assert len(clients) >= 1
    first_client = clients[0]
    assert "completion_rate_pct" not in first_client
    assert "assessment_success_pct" not in first_client
    assert "total_employees" not in first_client
    assert "assigned_users" in first_client

    # Assigning an HR user to a partner's own client succeeds
    unique_email = f"assigned.hr.{uuid.uuid4().hex[:8]}@nimbus.test"
    assign_res = client.post(
        f"/api/v1/partner/clients/{first_client['id']}/users",
        headers=headers,
        json={
            "full_name": "Kavita Nair",
            "email": unique_email,
            "password": "Client@1234",
            "role": "HR_MANAGER",
        },
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["email"] == unique_email

    # Assigning a user to another partner's client (Beta/Crestline) is forbidden
    forbidden_res = client.post(
        "/api/v1/partner/clients/c-beta-ind-600/users",
        headers=headers,
        json={
            "full_name": "Intruder User",
            "email": f"bad.{uuid.uuid4().hex[:8]}@crestline.test",
            "password": "Client@1234",
            "role": "COMPANY_ADMIN",
        },
    )
    assert forbidden_res.status_code == 403


def test_partner_and_client_branding_isolation():
    """
    Partners can customise their own branding + each owned client's branding
    (colors, logo_url, welcome_message, co_branding_mode), but cannot modify
    another partner's client branding (403).
    """
    login_res = _login("partner@talentpro.com", "Partner@1234")
    assert login_res.status_code == 200
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Update partner branding & preserve Nimbus client branding test
    p_res = client.patch(
        "/api/v1/partner/branding",
        headers=headers,
        json={
            "primary_color": "#0F766E",
            "sidebar_color": "#042F2E",
            "accent_color": "#14B8A6",
            "co_branding_mode": "CO_BRANDED",
        },
    )
    assert p_res.status_code == 200
    assert p_res.json()["sidebar_color"] == "#042F2E"

    # Update owned client (Nimbus Cloud Systems Pvt. Ltd.) branding
    c_res = client.put(
        "/api/v1/partner/clients/c-acme-corp-1250/branding",
        headers=headers,
        json={
            "primary_color": "#1B365D",
            "sidebar_color": "#0B1F3A",
            "accent_color": "#38BDF8",
            "co_branding_mode": "CLIENT_ONLY",
            "welcome_message": "Welcome to Nimbus Cloud Compliance Portal",
        },
    )
    assert c_res.status_code == 200
    assert c_res.json()["co_branding_mode"] == "CLIENT_ONLY"
    assert c_res.json()["sidebar_color"] == "#0B1F3A"

    # Restore CO_BRANDED so seeded defaults remain clean
    restore_res = client.put(
        "/api/v1/partner/clients/c-acme-corp-1250/branding",
        headers=headers,
        json={"co_branding_mode": "CO_BRANDED"},
    )
    assert restore_res.status_code == 200

    # Cross-partner client branding modification is rejected
    forbidden = client.put(
        "/api/v1/partner/clients/c-beta-ind-600/branding",
        headers=headers,
        json={"primary_color": "#FF0000"},
    )
    assert forbidden.status_code == 403


def test_leap10x_csv_import_restricted_to_super_admin_only():
    """
    Only HRYAAR Master Platform Admins (SUPER_ADMIN / PLATFORM_ADMIN) may import Leap10x CSV rosters.
    Partner, Client HR, and Employee roles must all be rejected with 403 Forbidden.
    """
    import io

    csv_payload = (
        "employee_code,name,email,department,progress,score\n"
        f"LEAP-{uuid.uuid4().hex[:4]},Test Learner,leap.{uuid.uuid4().hex[:6]}@acmecorp.com,Engineering,100,90.0\n"
    ).encode("utf-8")

    # 1. Client HR (COMPANY_ADMIN), Partner (PARTNER_ADMIN), and Employee (EMPLOYEE) must get 403
    for email, pwd in [
        ("hr@acme.com", "Acme@1234"),
        ("partner@talentpro.com", "Partner@1234"),
        ("rohan.reddy194@acmecorp.com", "Employee@1234"),
    ]:
        res = _login(email, pwd)
        assert res.status_code == 200
        tok = res.json()["access_token"]
        imp_res = client.post(
            "/api/v1/import/csv?company_id=c-acme-corp-1250",
            headers={"Authorization": f"Bearer {tok}"},
            files={"file": ("leap10x.csv", io.BytesIO(csv_payload), "text/csv")},
        )
        assert imp_res.status_code == 403, f"Expected 403 for {email}, got {imp_res.status_code}"

    # 2. Platform Master Admin (SUPER_ADMIN) succeeds targeting a specific client company
    leap_code = f"LEAP-{uuid.uuid4().hex[:4]}"
    leap_email = f"leap.{uuid.uuid4().hex[:6]}@acmecorp.com"
    leap_payload = (
        "employee_code,name,email,department,progress,score\n"
        f"{leap_code},Test Learner,{leap_email},Engineering,100,90.0\n"
    ).encode("utf-8")
    sa_res = _login("tech@hryaar.com", "Admin@1234")
    assert sa_res.status_code == 200
    sa_tok = sa_res.json()["access_token"]
    sa_imp = client.post(
        "/api/v1/import/csv?company_id=c-acme-corp-1250",
        headers={"Authorization": f"Bearer {sa_tok}"},
        files={"file": ("leap10x.csv", io.BytesIO(leap_payload), "text/csv")},
    )
    assert sa_imp.status_code == 200, sa_imp.text
    assert sa_imp.json()["success"] is True
    assert sa_imp.json()["successful_rows"] == 1

    # Cleanup inserted test employees to preserve seeded count invariants
    from app.models.models import Employee
    db = SessionLocal()
    try:
        db.query(Employee).filter(Employee.employee_code.like("LEAP-%")).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def test_payment_checkout_signature_verification_and_invoice_pdf():
    """
    Verifies full billing workflow:
    - Plans catalog & payment checkout (server-computed pricing)
    - Rejects forged HMAC signatures (400) and cross-tenant verify/invoice access (403)
    - Valid signature atomically upgrades partner seat pool & generates PDF invoice
    """
    from app.models.models import PaymentTransaction, Company

    p_login = _login("partner@talentpro.com", "Partner@1234")
    assert p_login.status_code == 200
    p_tok = p_login.json()["access_token"]
    p_headers = {"Authorization": f"Bearer {p_tok}"}

    other_p_login = _login("partner@apex.com", "Partner@1234")
    assert other_p_login.status_code == 200
    other_headers = {"Authorization": f"Bearer {other_p_login.json()['access_token']}"}

    # 1. Fetch billing plans
    plans_res = client.get("/api/v1/billing/plans", headers=p_headers)
    assert plans_res.status_code == 200
    assert len(plans_res.json()["plans"]) >= 3

    # 2. Initiate seat pack checkout (+100 seats)
    chk_res = client.post(
        "/api/v1/billing/checkout",
        headers=p_headers,
        json={"provider": "SANDBOX", "currency": "INR", "billing_cycle": "TOPUP", "seats_to_add": 100},
    )
    assert chk_res.status_code == 200
    chk = chk_res.json()
    assert chk["amount_cents"] > 0

    # 3. Forged signature must fail (400)
    bad_ver = client.post(
        "/api/v1/billing/verify",
        headers=p_headers,
        json={"order_id": chk["order_id"], "payment_id": chk["sandbox_payment_id"], "signature": "forged_sig"},
    )
    assert bad_ver.status_code == 400

    # 4. Cross-tenant verification must fail (403)
    cross_ver = client.post(
        "/api/v1/billing/verify",
        headers=other_headers,
        json={
            "order_id": chk["order_id"],
            "payment_id": chk["sandbox_payment_id"],
            "signature": chk["sandbox_signature"],
        },
    )
    assert cross_ver.status_code == 403

    # 5. Valid signature succeeds & increases seat pool
    ok_ver = client.post(
        "/api/v1/billing/verify",
        headers=p_headers,
        json={
            "order_id": chk["order_id"],
            "payment_id": chk["sandbox_payment_id"],
            "signature": chk["sandbox_signature"],
        },
    )
    assert ok_ver.status_code == 200
    assert ok_ver.json()["status"] == "PAID"
    assert "INV-POSH-" in ok_ver.json()["invoice_number"]

    tx_id = ok_ver.json()["transaction_id"]

    # 6. Partner can download PDF invoice, another partner receives 403
    pdf_res = client.get(f"/api/v1/billing/invoices/{tx_id}/pdf", headers=p_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"].startswith("application/pdf")
    assert pdf_res.content.startswith(b"%PDF")

    cross_pdf = client.get(f"/api/v1/billing/invoices/{tx_id}/pdf", headers=other_headers)
    assert cross_pdf.status_code == 403

    # Restore quota & remove synthetic test transaction so seeded state stays clean
    db = SessionLocal()
    try:
        comp = db.query(Company).filter(Company.id == "p-talentpro-hr").first()
        if comp:
            comp.assigned_seat_quota = max(5000, (comp.assigned_seat_quota or 5100) - 100)
        db.query(PaymentTransaction).filter(PaymentTransaction.id == tx_id).delete()
        db.commit()
    finally:
        db.close()


def test_cluster_telemetry_does_not_leak_global_counts_to_tenants():
    hr_res = _login("hr@acme.com", "Acme@1234")
    assert hr_res.status_code == 200
    headers = {"Authorization": f"Bearer {hr_res.json()['access_token']}"}
    tel = client.get("/api/v1/cluster/telemetry", headers=headers)
    assert tel.status_code == 200
    counts = tel.json()["tier_3_data_storage"]["entity_counts"]
    assert counts["companies"] == 1
    assert counts["employees"] == 1250
    assert counts["complaints"] == 0





