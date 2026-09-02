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
            "conversations",
            "messages",
            "portal_tracks",
            "portal_entries",
            "audit_events",
        )
        for collection in collections:
            database[collection].delete_many({})
        yield test_client
        for collection in collections:
            database[collection].delete_many({})


def _signup(client: TestClient, email: str) -> dict:
    """Handle signup.

    Args:
        client: Function argument.
        email: Function argument.

    Returns:
        Function result.
    """
    response = client.post(
        "/auth/signup-therapist",
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


def _create_client(client: TestClient, token: str, email: str) -> dict:
    """Handle create client.

    Args:
        client: Function argument.
        token: Function argument.
        email: Function argument.

    Returns:
        Function result.
    """
    response = client.post(
        "/auth/create-client",
        headers={"Authorization": f"Bearer {token}"},
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 201
    return response.json()


def _create_track(
    client: TestClient,
    *,
    token: str,
    client_id: str,
    kind: str,
    title: str,
) -> dict:
    """Handle create track.

    Args:
        client: Function argument.
        token: Function argument.
        client_id: Function argument.
        kind: Function argument.
        title: Function argument.

    Returns:
        Function result.
    """
    response = client.post(
        "/portal/tracks",
        headers={"Authorization": f"Bearer {token}"},
        json={"client_id": client_id, "kind": kind, "title": title},
    )
    assert response.status_code == 201
    return response.json()


def test_professional_lists_only_owned_clients(client: TestClient) -> None:
    """Verify professional lists only owned clients.

    Args:
        client: Function argument.
    """
    _signup(client, "one@example.com")
    one_token = _login(client, "one@example.com")
    owned = _create_client(client, one_token, "owned@example.com")

    _signup(client, "two@example.com")
    two_token = _login(client, "two@example.com")
    _create_client(client, two_token, "foreign@example.com")

    response = client.get(
        "/clients",
        headers={"Authorization": f"Bearer {one_token}"},
    )
    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [owned["id"]]


def test_fitness_journal_payload_is_encrypted_and_visible_to_client(
    client: TestClient,
) -> None:
    """Verify fitness journal payload is encrypted and visible to client.

    Args:
        client: Function argument.
    """
    _signup(client, "coach@example.com")
    professional_token = _login(client, "coach@example.com")
    candidate = _create_client(client, professional_token, "candidate@example.com")
    track = _create_track(
        client,
        token=professional_token,
        client_id=candidate["id"],
        kind="FITNESS",
        title="Strength and conditioning",
    )

    payload = {
        "journal_text": "Energy felt strong after today's workout.",
        "goal_name": "Three workouts each week",
        "progress_percent": 67,
        "measurement_label": "body weight",
        "measurement_value": 182.4,
        "measurement_unit": "lb",
    }
    created = client.post(
        "/portal/entries",
        headers={"Authorization": f"Bearer {professional_token}"},
        json={"track_id": track["id"], "entry_type": "FITNESS_CHECKIN", "payload": payload},
    )
    assert created.status_code == 201
    assert created.json()["payload"] == payload

    database = app.state.mongo.db()
    stored_track = database.portal_tracks.find_one({})
    stored_entry = database.portal_entries.find_one({})
    assert stored_track is not None
    assert stored_entry is not None
    assert "title" not in stored_track
    assert stored_track["title_ciphertext"] != "Strength and conditioning"
    assert "payload" not in stored_entry
    assert "Energy felt strong" not in stored_entry["ciphertext"]
    assert "body weight" not in stored_entry["ciphertext"]

    client_token = _login(client, "candidate@example.com")
    tracks = client.get(
        "/portal/tracks/me",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert tracks.status_code == 200
    assert tracks.json()[0]["title"] == "Strength and conditioning"

    entries = client.get(
        "/portal/entries",
        params={"track_id": track["id"]},
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert entries.status_code == 200
    assert entries.json()[0]["payload"] == payload


def test_laser_skin_checkin_supports_descriptive_tracking(client: TestClient) -> None:
    """Verify laser skin checkin supports descriptive tracking.

    Args:
        client: Function argument.
    """
    _signup(client, "provider@example.com")
    professional_token = _login(client, "provider@example.com")
    patient = _create_client(client, professional_token, "patient@example.com")
    track = _create_track(
        client,
        token=professional_token,
        client_id=patient["id"],
        kind="LASER_HAIR_REMOVAL",
        title="Laser progress",
    )

    payload = {
        "session_date": "2026-08-17",
        "treatment_area": "face",
        "redness": 2,
        "sensitivity": 3,
        "irritation": 1,
        "journal_text": "Mild warmth for about an hour after the session.",
    }
    response = client.post(
        "/portal/entries",
        headers={"Authorization": f"Bearer {professional_token}"},
        json={"track_id": track["id"], "entry_type": "SKIN_CHECKIN", "payload": payload},
    )
    assert response.status_code == 201
    assert response.json()["payload"] == payload


def test_foreign_professional_cannot_read_track_or_trigger_decryption(
    client: TestClient,
) -> None:
    """Verify foreign professional cannot read track or trigger decryption.

    Args:
        client: Function argument.
    """
    _signup(client, "owner@example.com")
    owner_token = _login(client, "owner@example.com")
    owned_client = _create_client(client, owner_token, "owned@example.com")
    track = _create_track(
        client,
        token=owner_token,
        client_id=owned_client["id"],
        kind="CARE",
        title="Private journal",
    )
    client.post(
        "/portal/entries",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={
            "track_id": track["id"],
            "entry_type": "JOURNAL",
            "payload": {"journal_text": "private entry"},
        },
    )

    _signup(client, "foreign@example.com")
    foreign_token = _login(client, "foreign@example.com")
    original_cipher = app.state.message_cipher

    class DecryptBomb:
        """Represent DecryptBomb."""
        def decrypt(self, ciphertext: str) -> str:
            """Handle decrypt.

            Args:
                ciphertext: Function argument.
            """
            raise AssertionError("unauthorized portal access must not decrypt")

    app.state.message_cipher = DecryptBomb()
    try:
        denied = client.get(
            "/portal/entries",
            params={"track_id": track["id"]},
            headers={"Authorization": f"Bearer {foreign_token}"},
        )
    finally:
        app.state.message_cipher = original_cipher

    assert denied.status_code == 404
    database = app.state.mongo.db()
    assert database.audit_events.find_one(
        {
            "action": "AUTHZ_DENIED",
            "resource_type": "portal_track",
            "resource_id": track["id"],
        }
    ) is not None
