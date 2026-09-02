"""Document this first-party Python module."""
from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.main import app

PASSWORD = "StrongPass123!"


@pytest.fixture
def client() -> Iterator[TestClient]:
    """Handle client.

    Yields:
        Values produced by the function.
    """
    with TestClient(app) as test_client:
        database = app.state.mongo.db()
        for collection in ("users", "integration_connections", "audit_events"):
            database[collection].delete_many({})
        yield test_client
        for collection in ("users", "integration_connections", "audit_events"):
            database[collection].delete_many({})


def _signup_provider(client: TestClient, email: str = "provider@example.com") -> dict:
    """Handle signup provider.

    Args:
        client: Function argument.
        email: Function argument.

    Returns:
        Function result.
    """
    response = client.post(
        "/auth/signup-provider",
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 201
    return response.json()


def _login(client: TestClient, email: str) -> str:
    """Handle login.

    Args:
        client: Function argument.
        email: Function argument.

    Returns:
        Function result.
    """
    response = client.post(
        "/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_provider_catalog_is_commercial_metadata_without_secrets(
    client: TestClient,
) -> None:
    """Verify provider catalog is commercial metadata without secrets.

    Args:
        client: Function argument.
    """
    _signup_provider(client)
    token = _login(client, "provider@example.com")

    response = client.get(
        "/integrations/catalog",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    catalog = response.json()

    assert {item["key"] for item in catalog} == {
        "google_calendar",
        "microsoft_outlook",
        "zoom",
        "stripe",
        "zapier_webhooks",
    }
    assert any(item["entitlement"] == "PAID_ADDON" for item in catalog)
    assert all(item["availability"] == "PLANNED" for item in catalog)

    forbidden_keys = {
        "access_token",
        "refresh_token",
        "client_secret",
        "api_key",
        "credentials",
    }
    assert all(forbidden_keys.isdisjoint(item) for item in catalog)


def test_connections_are_provider_scoped_and_never_return_credentials(
    client: TestClient,
) -> None:
    """Verify connections are provider scoped and never return credentials.

    Args:
        client: Function argument.
    """
    _signup_provider(client, "one@example.com")
    one_token = _login(client, "one@example.com")
    provider_two = _signup_provider(client, "two@example.com")

    database = app.state.mongo.db()
    one_user = database.users.find_one({"email": "one@example.com"})
    two_user = database.users.find_one({"email": "two@example.com"})
    assert one_user is not None and two_user is not None

    now = datetime.now(timezone.utc)
    database.integration_connections.insert_many(
        [
            {
                "provider_user_id": one_user["_id"],
                "integration_key": "google_calendar",
                "state": "CONNECTED",
                "connected_at": now,
                "updated_at": now,
                "last_sync_at": now,
                "encrypted_access_token": "must-not-leak",
            },
            {
                "provider_user_id": two_user["_id"],
                "integration_key": "stripe",
                "state": "CONNECTED",
                "connected_at": now,
                "updated_at": now,
                "encrypted_access_token": "foreign-secret",
            },
        ]
    )

    response = client.get(
        "/integrations/connections",
        headers={"Authorization": f"Bearer {one_token}"},
    )
    assert response.status_code == 200
    connections = response.json()
    assert len(connections) == 1
    assert connections[0]["integration_key"] == "google_calendar"
    assert connections[0]["state"] == "CONNECTED"
    assert "encrypted_access_token" not in connections[0]
    assert provider_two["id"] not in str(connections)


def test_participant_cannot_access_provider_integration_surface(
    client: TestClient,
) -> None:
    """Verify participant cannot access provider integration surface.

    Args:
        client: Function argument.
    """
    _signup_provider(client)
    provider_token = _login(client, "provider@example.com")
    client.post(
        "/auth/create-participant",
        headers={"Authorization": f"Bearer {provider_token}"},
        json={"email": "member@example.com", "password": PASSWORD},
    )
    participant_token = _login(client, "member@example.com")

    catalog = client.get(
        "/integrations/catalog",
        headers={"Authorization": f"Bearer {participant_token}"},
    )
    connections = client.get(
        "/integrations/connections",
        headers={"Authorization": f"Bearer {participant_token}"},
    )

    assert catalog.status_code == 403
    assert connections.status_code == 403
