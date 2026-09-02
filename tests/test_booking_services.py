"""Document this first-party Python module."""
from __future__ import annotations

from collections.abc import Iterator

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
        for collection in ("users", "provider_profiles", "provider_services", "audit_events"):
            database[collection].delete_many({})
        yield test_client
        for collection in ("users", "provider_profiles", "provider_services", "audit_events"):
            database[collection].delete_many({})


def _login(client: TestClient, email: str) -> str:
    """Handle login.

    Args:
        client: Function argument.
        email: Function argument.

    Returns:
        Function result.
    """
    response = client.post("/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_provider_sees_active_private_and_public_services_but_member_sees_public_only(
    client: TestClient,
) -> None:
    """Verify provider sees active private and public services but member sees public only.

    Args:
        client: Function argument.
    """
    signup = client.post(
        "/auth/signup-provider",
        json={"email": "provider@example.com", "password": PASSWORD},
    )
    assert signup.status_code == 201
    provider_token = _login(client, "provider@example.com")
    profile = client.put(
        "/provider/profile",
        headers={"Authorization": f"Bearer {provider_token}"},
        json={
            "display_name": "Provider One",
            "timezone": "America/New_York",
            "locale": "en-US",
            "is_public": False,
        },
    )
    assert profile.status_code == 200

    for name, public in (("Public session", True), ("Private session", False)):
        created = client.post(
            "/provider/services",
            headers={"Authorization": f"Bearer {provider_token}"},
            json={
                "name": name,
                "duration_minutes": 60,
                "price_minor": 5000,
                "currency": "USD",
                "delivery_mode": "VIRTUAL",
                "capacity": 1,
                "is_public": public,
                "active": True,
            },
        )
        assert created.status_code == 201

    participant = client.post(
        "/auth/create-participant",
        headers={"Authorization": f"Bearer {provider_token}"},
        json={"email": "member@example.com", "password": PASSWORD},
    )
    assert participant.status_code == 201
    member_token = _login(client, "member@example.com")

    provider_services = client.get(
        "/booking-services",
        headers={"Authorization": f"Bearer {provider_token}"},
    )
    member_services = client.get(
        "/booking-services",
        headers={"Authorization": f"Bearer {member_token}"},
    )

    assert provider_services.status_code == 200
    assert {service["name"] for service in provider_services.json()} == {
        "Public session",
        "Private session",
    }
    assert member_services.status_code == 200
    assert [service["name"] for service in member_services.json()] == ["Public session"]
    assert member_services.json()[0]["provider_display_name"] == "Provider One"
