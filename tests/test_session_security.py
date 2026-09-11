"""Authentication-session lifecycle regression tests."""
from __future__ import annotations

from collections.abc import Iterator

from fastapi.testclient import TestClient
import jwt
import pytest

from app.core.config import get_settings
from app.main import app

PASSWORD = "StrongPass123!"


@pytest.fixture
def client() -> Iterator[TestClient]:
    """Provide a clean application client for session lifecycle tests."""
    with TestClient(app) as test_client:
        database = app.state.mongo.db()
        for collection in ("users", "auth_sessions", "audit_events"):
            database[collection].delete_many({})
        yield test_client
        for collection in ("users", "auth_sessions", "audit_events"):
            database[collection].delete_many({})


def _signup_and_login(client: TestClient) -> str:
    signup = client.post(
        "/auth/signup-provider",
        json={"email": "provider@example.com", "password": PASSWORD},
    )
    assert signup.status_code == 201
    login = client.post(
        "/auth/login",
        json={"email": "provider@example.com", "password": PASSWORD},
    )
    assert login.status_code == 200
    return login.json()["access_token"]


def test_login_creates_active_server_session(client: TestClient) -> None:
    """A valid access token must map to an active MongoDB session record."""
    token = _signup_and_login(client)
    settings = get_settings()
    claims = jwt.decode(
        token,
        settings.jwt_secret.get_secret_value(),
        algorithms=["HS256"],
    )

    session = app.state.mongo.db().auth_sessions.find_one({"_id": claims["jti"]})
    assert session is not None
    assert str(session["user_id"]) == claims["sub"]
    assert session["revoked_at"] is None
    assert session["expires_at"] is not None

    me = client.get(
        "/account/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me.status_code == 200


def test_logout_immediately_revokes_access_token(client: TestClient) -> None:
    """Signing out invalidates the same bearer token on its next use."""
    token = _signup_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}

    logout = client.post("/auth/logout", headers=headers)
    assert logout.status_code == 200
    assert logout.json() == {"status": "signed_out"}

    rejected = client.get("/account/me", headers=headers)
    assert rejected.status_code == 401

    audit = app.state.mongo.db().audit_events.find_one({"action": "LOGOUT"})
    assert audit is not None
    assert audit["success"] is True


def test_each_login_gets_a_distinct_session(client: TestClient) -> None:
    """Separate logins are independently revocable sessions."""
    first = _signup_and_login(client)
    second_login = client.post(
        "/auth/login",
        json={"email": "provider@example.com", "password": PASSWORD},
    )
    assert second_login.status_code == 200
    second = second_login.json()["access_token"]
    assert first != second

    settings = get_settings()
    first_claims = jwt.decode(first, settings.jwt_secret.get_secret_value(), algorithms=["HS256"])
    second_claims = jwt.decode(second, settings.jwt_secret.get_secret_value(), algorithms=["HS256"])
    assert first_claims["jti"] != second_claims["jti"]
