import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.services.event_bus import publish_realtime_event, get_recent_events
from app.models.models import ClusterEvent, User, Company

client = TestClient(app)

def _login(email: str, password: str):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})

def test_publish_and_retrieve_realtime_events():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "superadmin@hryaar.com").first()
        company = db.query(Company).first()
        assert user is not None
        assert company is not None

        event = publish_realtime_event(
            db=db,
            event_type="COMPLAINT_FILED",
            title="Real-time Test Grievance",
            message="A test grievance was lodged via event bus",
            company_id=company.id,
            user_id=user.id,
            payload={"ticket": "TEST-RT-101"}
        )
        assert event is not None
        assert event.id is not None
        assert event.event_type == "COMPLAINT_FILED"

        # Retrieve recent scoped events
        events = get_recent_events(
            db=db,
            user_company_id=company.id,
            user_role="COMPANY_ADMIN"
        )
        assert len(events) >= 1
        found = any(e["event_id"] == event.event_id for e in events)
        assert found is True
    finally:
        db.close()


def test_realtime_recent_endpoint():
    res = _login("superadmin@hryaar.com", "Admin@1234")
    assert res.status_code == 200
    token = res.json()["access_token"]

    response = client.get(
        "/api/v1/realtime/recent?limit=10",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "events" in data
    assert "count" in data
    assert isinstance(data["events"], list)


def test_realtime_broadcast_endpoint():
    res = _login("superadmin@hryaar.com", "Admin@1234")
    assert res.status_code == 200
    token = res.json()["access_token"]

    response = client.post(
        "/api/v1/realtime/broadcast",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Platform Maintenance Notice",
            "message": "Scheduled upgrades tonight at 02:00 AM UTC",
            "event_type": "SYSTEM_BROADCAST"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "event_id" in data


def test_realtime_unauthorized_access():
    response = client.get("/api/v1/realtime/stream")
    assert response.status_code == 401
