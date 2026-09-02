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
        collections = (
            "users",
            "provider_profiles",
            "provider_services",
            "audit_events",
        )
        for collection in collections:
            database[collection].delete_many({})
        yield test_client
        for collection in collections:
            database[collection].delete_many({})


def _signup_provider(client: TestClient, email: str) -> dict:
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


def _auth(token: str) -> dict[str, str]:
    """Handle auth.

    Args:
        token: Function argument.

    Returns:
        Function result.
    """
    return {"Authorization": f"Bearer {token}"}


def test_provider_builds_public_business_profile_and_service_catalog(
    client: TestClient,
) -> None:
    """Verify provider builds public business profile and service catalog.

    Args:
        client: Function argument.
    """
    _signup_provider(client, "coach@example.com")
    token = _login(client, "coach@example.com")

    empty = client.get("/provider/profile", headers=_auth(token))
    assert empty.status_code == 200
    assert empty.json() is None

    profile = client.put(
        "/provider/profile",
        headers=_auth(token),
        json={
            "display_name": "  Jordan Rivers  ",
            "business_name": "Rivers Performance",
            "provider_type": "Strength coach",
            "headline": "Build durable strength around your real life.",
            "bio": "Coaching for adults who want sustainable progress.",
            "categories": ["Strength", "Mobility", "strength"],
            "pronouns": "they/them",
            "timezone": "America/New_York",
            "locale": "en-US",
            "locations": [
                {
                    "label": "Virtual",
                    "kind": "VIRTUAL",
                    "public": True,
                },
                {
                    "label": "Private studio",
                    "kind": "IN_PERSON",
                    "address": "123 Private Way",
                    "public": False,
                },
            ],
            "credentials": [
                {
                    "name": "Certified Strength Coach",
                    "issuer": "Example Association",
                    "reference": "PUBLIC-1",
                    "expires_on": "2028-01-01",
                    "public": True,
                },
                {
                    "name": "Internal training credential",
                    "reference": "PRIVATE-9",
                    "public": False,
                },
            ],
            "public_slug": "Jordan-Rivers",
            "is_public": True,
        },
    )
    assert profile.status_code == 200
    profile_body = profile.json()
    assert profile_body["display_name"] == "Jordan Rivers"
    assert profile_body["public_slug"] == "jordan-rivers"
    assert profile_body["categories"] == ["Strength", "Mobility"]

    public_service = client.post(
        "/provider/services",
        headers=_auth(token),
        json={
            "name": "Strength strategy session",
            "description": "A focused planning and coaching session.",
            "duration_minutes": 60,
            "price_minor": 7500,
            "currency": "usd",
            "delivery_mode": "HYBRID",
            "capacity": 1,
            "location_labels": ["Virtual", "Private studio"],
            "intake_required": True,
            "is_public": True,
            "active": True,
        },
    )
    assert public_service.status_code == 201
    public_service_body = public_service.json()
    assert public_service_body["price_minor"] == 7500
    assert public_service_body["currency"] == "USD"
    assert public_service_body["delivery_mode"] == "HYBRID"

    private_service = client.post(
        "/provider/services",
        headers=_auth(token),
        json={
            "name": "Private follow-up",
            "duration_minutes": 30,
            "price_minor": 4000,
            "currency": "USD",
            "delivery_mode": "VIRTUAL",
            "capacity": 1,
            "is_public": False,
            "active": True,
        },
    )
    assert private_service.status_code == 201

    page = client.get("/public/providers/jordan-rivers")
    assert page.status_code == 200
    public_page = page.json()
    assert public_page["profile"]["display_name"] == "Jordan Rivers"
    assert public_page["profile"]["locations"] == [
        {"label": "Virtual", "kind": "VIRTUAL", "address": None, "public": True}
    ]
    assert len(public_page["profile"]["credentials"]) == 1
    assert public_page["profile"]["credentials"][0]["reference"] == "PUBLIC-1"
    assert [service["name"] for service in public_page["services"]] == [
        "Strength strategy session"
    ]
    serialized = str(public_page)
    assert "provider_user_id" not in serialized
    assert "coach@example.com" not in serialized
    assert "123 Private Way" not in serialized
    assert "PRIVATE-9" not in serialized


def test_profile_requires_slug_when_published_and_slugs_are_unique(
    client: TestClient,
) -> None:
    """Verify profile requires slug when published and slugs are unique.

    Args:
        client: Function argument.
    """
    _signup_provider(client, "one@example.com")
    one_token = _login(client, "one@example.com")

    missing_slug = client.put(
        "/provider/profile",
        headers=_auth(one_token),
        json={"display_name": "Provider One", "is_public": True},
    )
    assert missing_slug.status_code == 422

    created = client.put(
        "/provider/profile",
        headers=_auth(one_token),
        json={
            "display_name": "Provider One",
            "public_slug": "shared-slug",
            "is_public": True,
        },
    )
    assert created.status_code == 200

    _signup_provider(client, "two@example.com")
    two_token = _login(client, "two@example.com")
    collision = client.put(
        "/provider/profile",
        headers=_auth(two_token),
        json={
            "display_name": "Provider Two",
            "public_slug": "shared-slug",
            "is_public": True,
        },
    )
    assert collision.status_code == 409


def test_services_are_provider_scoped_and_archived_instead_of_hard_deleted(
    client: TestClient,
) -> None:
    """Verify services are provider scoped and archived instead of hard deleted.

    Args:
        client: Function argument.
    """
    _signup_provider(client, "owner@example.com")
    owner_token = _login(client, "owner@example.com")
    service = client.post(
        "/provider/services",
        headers=_auth(owner_token),
        json={
            "name": "Consultation",
            "duration_minutes": 45,
            "price_minor": 5000,
            "currency": "USD",
            "delivery_mode": "VIRTUAL",
        },
    )
    assert service.status_code == 201
    service_id = service.json()["id"]

    _signup_provider(client, "foreign@example.com")
    foreign_token = _login(client, "foreign@example.com")
    denied = client.patch(
        f"/provider/services/{service_id}",
        headers=_auth(foreign_token),
        json={"price_minor": 1},
    )
    assert denied.status_code == 404

    updated = client.patch(
        f"/provider/services/{service_id}",
        headers=_auth(owner_token),
        json={"price_minor": 5500, "delivery_mode": "ASYNC"},
    )
    assert updated.status_code == 200
    assert updated.json()["price_minor"] == 5500
    assert updated.json()["delivery_mode"] == "ASYNC"

    archived = client.delete(
        f"/provider/services/{service_id}",
        headers=_auth(owner_token),
    )
    assert archived.status_code == 200
    assert archived.json()["active"] is False
    assert archived.json()["archived_at"] is not None

    listed = client.get("/provider/services", headers=_auth(owner_token))
    assert listed.status_code == 200
    assert listed.json() == []

    database = app.state.mongo.db()
    assert database.provider_services.count_documents({"_id": {"$exists": True}}) == 1


def test_participant_cannot_manage_provider_business(client: TestClient) -> None:
    """Verify participant cannot manage provider business.

    Args:
        client: Function argument.
    """
    _signup_provider(client, "provider@example.com")
    provider_token = _login(client, "provider@example.com")
    participant = client.post(
        "/auth/create-participant",
        headers=_auth(provider_token),
        json={"email": "member@example.com", "password": PASSWORD},
    )
    assert participant.status_code == 201
    participant_token = _login(client, "member@example.com")

    profile = client.get("/provider/profile", headers=_auth(participant_token))
    service = client.post(
        "/provider/services",
        headers=_auth(participant_token),
        json={
            "name": "Should fail",
            "duration_minutes": 30,
            "price_minor": 1000,
            "currency": "USD",
            "delivery_mode": "VIRTUAL",
        },
    )

    assert profile.status_code == 403
    assert service.status_code == 403


def test_invalid_timezone_is_rejected(client: TestClient) -> None:
    """Verify invalid timezone is rejected.

    Args:
        client: Function argument.
    """
    _signup_provider(client, "provider@example.com")
    token = _login(client, "provider@example.com")
    response = client.put(
        "/provider/profile",
        headers=_auth(token),
        json={
            "display_name": "Timezone Test",
            "timezone": "Mars/Olympus_Mons",
            "is_public": False,
        },
    )
    assert response.status_code == 422
