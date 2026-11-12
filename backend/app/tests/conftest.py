from app.db.migrate import run_migrations


def pytest_sessionstart(session):
    """Ensure newly added tables and columns are migrated even when TestClient skips ASGI lifespan."""
    run_migrations()

