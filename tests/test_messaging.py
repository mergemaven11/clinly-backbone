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
        for collection in ("users", "conversations", "messages", "audit_events"):
            database[collection].delete_many({})
        yield test_client
        for collection in ("users", "conversations", "messages", "audit_events"):
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


def _create_client(
    client: TestClient,
    *,
    therapist_token: str,
    email: str,
) -> dict:
    """Handle create client.

    Args:
        client: Function argument.
        therapist_token: Function argument.
        email: Function argument.

    Returns:
        Function result.
    """
    response = client.post(
        "/auth/create-client",
        headers={"Authorization": f"Bearer {therapist_token}"},
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 201
    return response.json()


def _create_conversation(
    client: TestClient,
    *,
    therapist_token: str,
    client_id: str,
) -> dict:
    """Handle create conversation.

    Args:
        client: Function argument.
        therapist_token: Function argument.
        client_id: Function argument.

    Returns:
        Function result.
    """
    response = client.post(
        "/conversations",
        headers={"Authorization": f"Bearer {therapist_token}"},
        json={"client_id": client_id},
    )
    assert response.status_code == 201
    return response.json()


def test_conversation_pair_is_unique_and_visible_to_owned_client(
    client: TestClient,
) -> None:
    """Verify conversation pair is unique and visible to owned client.

    Args:
        client: Function argument.
    """
    _signup(client, "therapist@example.com")
    therapist_token = _login(client, "therapist@example.com")
    owned_client = _create_client(
        client,
        therapist_token=therapist_token,
        email="client@example.com",
    )
    conversation = _create_conversation(
        client,
        therapist_token=therapist_token,
        client_id=owned_client["id"],
    )

    duplicate = client.post(
        "/conversations",
        headers={"Authorization": f"Bearer {therapist_token}"},
        json={"client_id": owned_client["id"]},
    )
    assert duplicate.status_code == 409

    client_token = _login(client, "client@example.com")
    listed = client.get(
        "/conversations/me",
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [conversation["id"]]


def test_therapist_cannot_create_conversation_with_foreign_client(
    client: TestClient,
) -> None:
    """Verify therapist cannot create conversation with foreign client.

    Args:
        client: Function argument.
    """
    _signup(client, "therapist-one@example.com")
    therapist_one_token = _login(client, "therapist-one@example.com")
    foreign_client = _create_client(
        client,
        therapist_token=therapist_one_token,
        email="owned-by-one@example.com",
    )

    therapist_two = _signup(client, "therapist-two@example.com")
    therapist_two_token = _login(client, "therapist-two@example.com")
    denied = client.post(
        "/conversations",
        headers={"Authorization": f"Bearer {therapist_two_token}"},
        json={"client_id": foreign_client["id"]},
    )

    assert denied.status_code == 404
    database = app.state.mongo.db()
    audit = database.audit_events.find_one(
        {
            "action": "AUTHZ_DENIED",
            "actor_user_id": therapist_two["id"],
            "resource_type": "user",
        }
    )
    assert audit is not None


def test_message_plaintext_never_persists_and_participants_can_read(
    client: TestClient,
) -> None:
    """Verify message plaintext never persists and participants can read.

    Args:
        client: Function argument.
    """
    therapist = _signup(client, "therapist@example.com")
    therapist_token = _login(client, "therapist@example.com")
    owned_client = _create_client(
        client,
        therapist_token=therapist_token,
        email="client@example.com",
    )
    conversation = _create_conversation(
        client,
        therapist_token=therapist_token,
        client_id=owned_client["id"],
    )

    plaintext = "Please remember our appointment is private."
    sent = client.post(
        "/messages",
        headers={"Authorization": f"Bearer {therapist_token}"},
        json={
            "conversation_id": conversation["id"],
            "plaintext_body": plaintext,
        },
    )
    assert sent.status_code == 201
    assert sent.json()["plaintext_body"] == plaintext
    assert sent.json()["sender_user_id"] == therapist["id"]

    database = app.state.mongo.db()
    stored = database.messages.find_one({})
    assert stored is not None
    assert "plaintext_body" not in stored
    assert stored["ciphertext"] != plaintext
    assert plaintext not in stored["ciphertext"]

    client_token = _login(client, "client@example.com")
    listed = client.get(
        "/messages",
        params={"conversation_id": conversation["id"]},
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert listed.status_code == 200
    assert [item["plaintext_body"] for item in listed.json()] == [plaintext]

    assert database.audit_events.count_documents({"action": "MESSAGE_SENT"}) == 1
    assert database.audit_events.count_documents({"action": "MESSAGE_LISTED"}) == 1


def test_foreign_conversation_is_denied_before_decryption(client: TestClient) -> None:
    """Verify foreign conversation is denied before decryption.

    Args:
        client: Function argument.
    """
    _signup(client, "therapist-one@example.com")
    therapist_one_token = _login(client, "therapist-one@example.com")
    owned_client = _create_client(
        client,
        therapist_token=therapist_one_token,
        email="client-one@example.com",
    )
    conversation = _create_conversation(
        client,
        therapist_token=therapist_one_token,
        client_id=owned_client["id"],
    )
    sent = client.post(
        "/messages",
        headers={"Authorization": f"Bearer {therapist_one_token}"},
        json={"conversation_id": conversation["id"], "plaintext_body": "secret"},
    )
    assert sent.status_code == 201

    _signup(client, "therapist-two@example.com")
    therapist_two_token = _login(client, "therapist-two@example.com")
    foreign_client = _create_client(
        client,
        therapist_token=therapist_two_token,
        email="client-two@example.com",
    )
    foreign_client_token = _login(client, "client-two@example.com")

    original_cipher = app.state.message_cipher

    class DecryptBomb:
        """Represent DecryptBomb."""
        def decrypt(self, ciphertext: str) -> str:
            """Handle decrypt.

            Args:
                ciphertext: Function argument.
            """
            raise AssertionError("decryption must not run for unauthorized access")

    app.state.message_cipher = DecryptBomb()
    try:
        denied = client.get(
            "/messages",
            params={"conversation_id": conversation["id"]},
            headers={"Authorization": f"Bearer {foreign_client_token}"},
        )
    finally:
        app.state.message_cipher = original_cipher

    assert denied.status_code == 404
    database = app.state.mongo.db()
    audit = database.audit_events.find_one(
        {
            "action": "AUTHZ_DENIED",
            "actor_user_id": foreign_client["id"],
            "resource_type": "conversation",
            "resource_id": conversation["id"],
        }
    )
    assert audit is not None


def test_malformed_conversation_id_uses_same_safe_denial(client: TestClient) -> None:
    """Verify malformed conversation id uses same safe denial.

    Args:
        client: Function argument.
    """
    therapist = _signup(client, "therapist@example.com")
    therapist_token = _login(client, "therapist@example.com")

    response = client.get(
        "/messages",
        params={"conversation_id": "definitely-not-an-object-id"},
        headers={"Authorization": f"Bearer {therapist_token}"},
    )

    assert response.status_code == 404
    database = app.state.mongo.db()
    audit = database.audit_events.find_one(
        {"action": "AUTHZ_DENIED", "actor_user_id": therapist["id"]}
    )
    assert audit is not None
