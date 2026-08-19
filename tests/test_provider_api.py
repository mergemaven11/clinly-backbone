from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app

PASSWORD = "StrongPass123!"


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        database = app.state.mongo.db()
        for collection in ("users", "audit_events"):
            database[collection].delete_many({})
        yield test_client
        for collection in ("users", "audit_events"):
            database[collection].delete_many({})


def _login(client: TestClient, email: str) -> str:
    response = client.post(
        "/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_v2_provider_contract_preserves_legacy_storage(client: TestClient) -> None:
    created = client.post(
        "/auth/signup-provider",
        json={"email": "provider@example.com", "password": PASSWORD},
    )
    assert created.status_code == 201
    assert created.json()["role"] == "PROVIDER"
    assert created.json()["provider_id"] is None

    database = app.state.mongo.db()
    stored = database.users.find_one({"email": "provider@example.com"})
    assert stored is not None
    assert stored["role"] == "THERAPIST"

    token = _login(client, "provider@example.com")
    me = client.get(
        "/account/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me.status_code == 200
    assert me.json()["role"] == "PROVIDER"

    legacy_me = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert legacy_me.status_code == 200
    assert legacy_me.json()["role"] == "THERAPIST"


def test_provider_creates_and_lists_participant_with_v2_contract(
    client: TestClient,
) -> None:
    provider = client.post(
        "/auth/signup-provider",
        json={"email": "provider@example.com", "password": PASSWORD},
    ).json()
    token = _login(client, "provider@example.com")

    created = client.post(
        "/auth/create-participant",
        headers={"Authorization": f"Bearer {token}"},
        json={"email": "member@example.com", "password": PASSWORD},
    )
    assert created.status_code == 201
    participant = created.json()
    assert participant["role"] == "PARTICIPANT"
    assert participant["provider_id"] == provider["id"]

    listed = client.get(
        "/participants",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert listed.status_code == 200
    assert listed.json() == [participant]

    database = app.state.mongo.db()
    stored = database.users.find_one({"email": "member@example.com"})
    assert stored is not None
    assert stored["role"] == "CLIENT"
    assert str(stored["therapist_id"]) == provider["id"]

    assert database.audit_events.find_one(
        {"action": "PARTICIPANT_CREATED", "subject_user_id": participant["id"]}
    ) is not None


def test_participant_cannot_create_or_list_other_participants(client: TestClient) -> None:
    client.post(
        "/auth/signup-provider",
        json={"email": "provider@example.com", "password": PASSWORD},
    )
    provider_token = _login(client, "provider@example.com")
    client.post(
        "/auth/create-participant",
        headers={"Authorization": f"Bearer {provider_token}"},
        json={"email": "member@example.com", "password": PASSWORD},
    )
    participant_token = _login(client, "member@example.com")

    denied_create = client.post(
        "/auth/create-participant",
        headers={"Authorization": f"Bearer {participant_token}"},
        json={"email": "other@example.com", "password": PASSWORD},
    )
    denied_list = client.get(
        "/participants",
        headers={"Authorization": f"Bearer {participant_token}"},
    )

    assert denied_create.status_code == 403
    assert denied_list.status_code == 403
