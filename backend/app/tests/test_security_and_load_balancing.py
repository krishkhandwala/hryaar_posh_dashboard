import time
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.models import User, AuditLog, CompanyAPIKey, ClusterJob

client = TestClient(app)


def _login(email: str, password: str):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def test_health_probes_security_headers_and_cluster_telemetry():
    """Verify /health/live, /health/ready, OWASP headers, and multi-node telemetry."""
    live = client.get("/health/live")
    assert live.status_code == 200
    assert live.json()["status"] == "alive"
    assert "X-Cluster-Node" in live.headers
    assert live.headers.get("X-Content-Type-Options") == "nosniff"
    assert live.headers.get("Permissions-Policy")
    assert live.headers.get("Cross-Origin-Opener-Policy") == "same-origin-allow-popups"

    ready = client.get("/health/ready")
    assert ready.status_code == 200
    assert ready.json()["status"] == "ready"
    assert ready.json()["cache_backend"] in ("REDIS_CLUSTER", "POSTGRES_DISTRIBUTED", "IN_MEMORY_FALLBACK")

    sa_login = _login("superadmin@hryaar.com", "Admin@1234")
    assert sa_login.status_code == 200
    headers = {"Authorization": f"Bearer {sa_login.json()['access_token']}"}

    telem = client.get("/api/v1/cluster/telemetry", headers=headers)
    assert telem.status_code == 200
    data = telem.json()
    assert data["active_nodes_count"] >= 1
    assert isinstance(data["active_cluster_nodes"], list)
    assert data["tier_2_application"]["requests_handled_node"] >= 1


def test_cluster_job_persisted_in_postgresql():
    """Verify async batch jobs persist into cluster_jobs so any node can poll them."""
    login_resp = _login("hr@acme.com", "Acme@1234")
    assert login_resp.status_code == 200
    headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    trig = client.post(
        "/api/v1/cluster/jobs/trigger-async-batch",
        json={"batch_size": 50},
        headers=headers,
    )
    assert trig.status_code == 200
    job_id = trig.json()["job_id"]

    # Confirm record exists directly in DB (cross-node shared state)
    db = SessionLocal()
    try:
        row = db.query(ClusterJob).filter(ClusterJob.id == job_id).first()
        assert row is not None
        assert row.job_type == "STATUTORY_AUDIT_BATCH_SYNC"
    finally:
        db.close()

    # Poll up to 5 seconds until background worker marks job COMPLETED
    deadline = time.time() + 5.0
    final_status = None
    while time.time() < deadline:
        poll = client.get(f"/api/v1/cluster/jobs/{job_id}", headers=headers)
        assert poll.status_code == 200
        final_status = poll.json()["status"]
        if final_status == "COMPLETED":
            break
        time.sleep(0.25)
    assert final_status == "COMPLETED"


def test_brute_force_lockout_unlock_and_session_security():
    """Verify 5x failed login lockout, Super Admin unlock, active session revocation, and password rotation."""
    sa_res = _login("superadmin@hryaar.com", "Admin@1234")
    assert sa_res.status_code == 200
    sa_headers = {"Authorization": f"Bearer {sa_res.json()['access_token']}"}

    suffix = uuid.uuid4().hex[:6]
    test_email = f"sec.user.{suffix}@acme.com"
    init_pw = "SecInit@2026!"
    new_pw = "SecRotated@2026!"

    # Weak password must be rejected
    weak_res = client.post(
        "/api/v1/super-admin/users",
        json={
            "email": test_email,
            "full_name": "Security Test User",
            "password": "weak",
            "role": "COMPANY_ADMIN",
            "company_id": "c-acme-corp-1250",
        },
        headers=sa_headers,
    )
    assert weak_res.status_code == 400

    # Valid user provisioning
    create_res = client.post(
        "/api/v1/super-admin/users",
        json={
            "email": test_email,
            "full_name": "Security Test User",
            "password": init_pw,
            "role": "COMPANY_ADMIN",
            "company_id": "c-acme-corp-1250",
        },
        headers=sa_headers,
    )
    assert create_res.status_code == 200
    created_user_id = create_res.json()["id"]

    try:
        # 5 wrong attempts -> 6th attempt returns 429 lockout
        for _ in range(5):
            r = _login(test_email, "WrongPass@999")
            assert r.status_code == 401
        locked = _login(test_email, init_pw)
        assert locked.status_code == 429

        # Super Admin clears lockout
        unlock = client.post(f"/api/v1/super-admin/users/{created_user_id}/unlock", headers=sa_headers)
        assert unlock.status_code == 200

        # Create 2 sessions for the user
        s1 = _login(test_email, init_pw)
        assert s1.status_code == 200
        s2 = _login(test_email, init_pw)
        assert s2.status_code == 200

        h1 = {"Authorization": f"Bearer {s1.json()['access_token']}"}
        h2 = {"Authorization": f"Bearer {s2.json()['access_token']}"}

        # List sessions from device 2 -> includes both, device 2 marked is_current
        sess_list = client.get("/api/v1/auth/sessions", headers=h2)
        assert sess_list.status_code == 200
        items = sess_list.json()
        assert len(items) >= 2
        assert any(i["is_current"] for i in items)

        # Rotate password on device 2 -> revokes device 1 immediately
        bad_pw_chg = client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "WrongPassword!1", "new_password": new_pw},
            headers=h2,
        )
        assert bad_pw_chg.status_code == 400

        chg = client.post(
            "/api/v1/auth/change-password",
            json={"current_password": init_pw, "new_password": new_pw},
            headers=h2,
        )
        assert chg.status_code == 200

        # Device 1 token should now be rejected
        revoked_check = client.get("/api/v1/auth/me", headers=h1)
        assert revoked_check.status_code == 401

        # New login works with rotated password
        s3 = _login(test_email, new_pw)
        assert s3.status_code == 200
    finally:
        db = SessionLocal()
        try:
            db.query(AuditLog).filter(AuditLog.user_email == test_email).delete()
            db.query(User).filter(User.id == created_user_id).delete()
            db.commit()
        finally:
            db.close()


def test_company_api_key_generate_and_revoke():
    """Verify tenant API keys are generated hashed and revocable by Company Admin."""
    acme = _login("hr@acme.com", "Acme@1234")
    assert acme.status_code == 200
    headers = {"Authorization": f"Bearer {acme.json()['access_token']}"}

    gen = client.post(
        "/api/v1/company/integrations/api-keys",
        json={"name": "Pytest Ephemeral Key"},
        headers=headers,
    )
    assert gen.status_code == 200
    key_id = gen.json()["id"]
    assert gen.json()["api_key"].startswith("posh_live_")

    try:
        rev = client.delete(f"/api/v1/company/integrations/api-keys/{key_id}", headers=headers)
        assert rev.status_code == 200

        listing = client.get("/api/v1/company/integrations", headers=headers)
        assert listing.status_code == 200
        matched = [k for k in listing.json()["api_keys"] if k["id"] == key_id]
        assert len(matched) == 1
        assert matched[0]["is_active"] is False
    finally:
        db = SessionLocal()
        try:
            db.query(CompanyAPIKey).filter(CompanyAPIKey.id == key_id).delete()
            db.commit()
        finally:
            db.close()

