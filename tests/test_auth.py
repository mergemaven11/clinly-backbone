"""Document this first-party Python module."""
from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app

THERAPIST_EMAIL = "therapist@example.com"
THERAPIST_PASSWORD = "StrongPass123!"
CLIENT_EMAIL = "client@example.com"
CLIENT_PASSWORD = "ClientPass123!"


@pytest.fixture
def client() -> Iterator[TestClient]:
    """Handle client.

    Yields:
        Values produced by the function.
    """
    with TestClient(app) as test_client:
        database = app.state.mongo.db()
        database.users.delete_many({})
        database.audit_events.delete_many({})
        yield test_client
        database.users.delete_many({})
        database.audit_events.delete_many({})


def _signup_therapist(client: TestClient) -> dict:
    """Handle signup therapist.

    Args:
        client: Function argument.

    Returns:
        Function result.
    """
    response = client.post(
        "/auth/signup-therapist",
        json={"email": THERAPIST_EMAIL, "password": THERAPIST_PASSWORD},
    )
    assert response.status_code == 201
    return response.json()


def _login(client: TestClient, email: str, password: str) -> str:
    """Handle login.

    Args:
        client: Function argument.
        email: Function argument.
        password: Function argument.

    Returns:
        Function result.
    """
    response = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["access_token"]
    return payload["access_token"]


def test_therapist_signup_hashes_password_and_audits(client: TestClient) -> None:
    """Verify therapist signup hashes password and audits.

    Args:
        client: Function argument.
    """
    user = _signup_therapist(client)

    assert user["email"] == THERAPIST_EMAIL
    assert user["role"] == "THERAPIST"
    assert user["therapist_id"] is None
    assert user["is_active"] is True

    database = app.state.mongo.db()
    stored = database.users.find_one({"email": THERAPIST_EMAIL})
    assert stored is not None
    assert stored["password_hash"] != THERAPIST_PASSWORD
    assert THERAPIST_PASSWORD not in stored["password_hash"]

    audit = database.audit_events.find_one({"action": "USER_CREATED"})
    assert audit is not None
    assert audit["success"] is True
    assert audit["subject_user_id"] == user["id"]


def test_duplicate_email_returns_conflict(client: TestClient) -> None:
    """Verify duplicate email returns conflict.

    Args:
        client: Function argument.
    """
    _signup_therapist(client)

    response = client.post(
        "/auth/signup-therapist",
        json={"email": THERAPIST_EMAIL.upper(), "password": THERAPIST_PASSWORD},
    )

    assert response.status_code == 409


def test_login_returns_jwt_and_protected_me(client: TestClient) -> None:
    """Verify login returns jwt and protected me.

    Args:
        client: Function argument.
    """
    user = _signup_therapist(client)
    token = _login(client, THERAPIST_EMAIL, THERAPIST_PASSWORD)

    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["id"] == user["id"]

    database = app.state.mongo.db()
    assert database.audit_events.count_documents({"action": "LOGIN_SUCCESS"}) == 1


def test_invalid_login_is_denied_and_audited(client: TestClient) -> None:
    """Verify invalid login is denied and audited.

    Args:
        client: Function argument.
    """
    _signup_therapist(client)

    response = client.post(
        "/auth/login",
        json={"email": THERAPIST_EMAIL, "password": "WrongPassword123!"},
    )

    assert response.status_code == 401
    database = app.state.mongo.db()
    audit = database.audit_events.find_one({"action": "LOGIN_FAILURE"})
    assert audit is not None
    assert audit["success"] is False
    assert audit["metadata"]["reason"] == "invalid_credentials"


def test_disabled_user_cannot_login(client: TestClient) -> None:
    """Verify disabled user cannot login.

    Args:
        client: Function argument.
    """
    _signup_therapist(client)
    database = app.state.mongo.db()
    database.users.update_one(
        {"email": THERAPIST_EMAIL},
        {"$set": {"is_active": False}},
    )

    response = client.post(
        "/auth/login",
        json={"email": THERAPIST_EMAIL, "password": THERAPIST_PASSWORD},
    )

    assert response.status_code == 403
    audit = database.audit_events.find_one(
        {"action": "LOGIN_FAILURE", "metadata.reason": "disabled_account"}
    )
    assert audit is not None


def test_therapist_creates_owned_client(client: TestClient) -> None:
    """Verify therapist creates owned client.

    Args:
        client: Function argument.
    """
    therapist = _signup_therapist(client)
    therapist_token = _login(client, THERAPIST_EMAIL, THERAPIST_PASSWORD)

    response = client.post(
        "/auth/create-client",
        headers={"Authorization": f"Bearer {therapist_token}"},
        json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD},
    )

    assert response.status_code == 201
    created_client = response.json()
    assert created_client["role"] == "CLIENT"
    assert created_client["therapist_id"] == therapist["id"]

    database = app.state.mongo.db()
    audit = database.audit_events.find_one({"action": "CLIENT_CREATED"})
    assert audit is not None
    assert audit["actor_user_id"] == therapist["id"]
    assert audit["subject_user_id"] == created_client["id"]


def test_client_cannot_create_another_client(client: TestClient) -> None:
    """Verify client cannot create another client.

    Args:
        client: Function argument.
    """
    _signup_therapist(client)
    therapist_token = _login(client, THERAPIST_EMAIL, THERAPIST_PASSWORD)

    create_response = client.post(
        "/auth/create-client",
        headers={"Authorization": f"Bearer {therapist_token}"},
        json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD},
    )
    assert create_response.status_code == 201

    client_token = _login(client, CLIENT_EMAIL, CLIENT_PASSWORD)
    denied = client.post(
        "/auth/create-client",
        headers={"Authorization": f"Bearer {client_token}"},
        json={"email": "other@example.com", "password": "OtherPass123!"},
    )

    assert denied.status_code == 403
    database = app.state.mongo.db()
    audit = database.audit_events.find_one(
        {"action": "AUTHZ_DENIED", "metadata.route": "/auth/create-client"}
    )
    assert audit is not None
    assert audit["success"] is False
