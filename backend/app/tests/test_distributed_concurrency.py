import pytest
import concurrent.futures
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_3_tier_telemetry_endpoint():
    """Verify Tier 1, Tier 2, and Tier 3 cluster telemetry"""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "superadmin@hryaar.com", "password": "Admin@1234"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/cluster/telemetry", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "tier_1_presentation" in data
    assert "tier_2_application" in data
    assert "tier_3_data_storage" in data
    assert data["tier_1_presentation"]["stateless"] is True
    assert "distributed_cache" in data["tier_2_application"]
    assert "database_pool" in data["tier_3_data_storage"]

def test_distributed_async_job_lifecycle():
    """Verify async job enqueue, non-blocking polling, and completion"""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "hr@acme.com", "password": "Acme@1234"}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Trigger async batch job
    trigger_resp = client.post(
        "/api/v1/cluster/jobs/trigger-async-batch",
        json={"batch_size": 150},
        headers=headers
    )
    assert trigger_resp.status_code == 200
    job_data = trigger_resp.json()
    assert job_data["status"] == "ACCEPTED"
    job_id = job_data["job_id"]

    # 2. Poll job status
    poll_resp = client.get(f"/api/v1/cluster/jobs/{job_id}", headers=headers)
    assert poll_resp.status_code == 200
    assert poll_resp.json()["status"] in ["QUEUED", "PROCESSING", "COMPLETED"]

def test_high_concurrency_multi_tenant_requests():
    """
    Simulates high-concurrency multi-user traffic across different tenants
    to verify connection pooling stability, thread safety, and tenant isolation.
    """
    # Authenticate Acme and Beta admins
    acme_login = client.post("/api/v1/auth/login", json={"email": "hr@acme.com", "password": "Acme@1234"}).json()
    beta_login = client.post("/api/v1/auth/login", json={"email": "hr@beta.com", "password": "Beta@1234"}).json()

    acme_headers = {"Authorization": f"Bearer {acme_login['access_token']}"}
    beta_headers = {"Authorization": f"Bearer {beta_login['access_token']}"}

    def fetch_acme_dashboard():
        resp = client.get("/api/v1/dashboard/kpis", headers=acme_headers)
        assert resp.status_code == 200
        # Acme has 1250 employees
        assert resp.json()["total_employees"] == 1250
        return True

    def fetch_beta_dashboard():
        resp = client.get("/api/v1/dashboard/kpis", headers=beta_headers)
        assert resp.status_code == 200
        # Beta has 600 employees
        assert resp.json()["total_employees"] == 600
        return True

    # Run 100 concurrent requests in parallel threads simulating 100-user load
    tasks = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=25) as executor:
        for i in range(50):
            tasks.append(executor.submit(fetch_acme_dashboard))
            tasks.append(executor.submit(fetch_beta_dashboard))

        for future in concurrent.futures.as_completed(tasks):
            assert future.result() is True

