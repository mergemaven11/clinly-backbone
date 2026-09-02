"""Document this first-party Python module."""
from __future__ import annotations

import csv
import io
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


def _create_client(client: TestClient, therapist_token: str, email: str) -> dict:
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


def _insert_event(
    *,
    subject_user_id: str,
    timestamp: datetime,
    action: str,
    user_agent: str = "pytest",
) -> None:
    """Handle insert event.

    Args:
        subject_user_id: Function argument.
        timestamp: Function argument.
        action: Function argument.
        user_agent: Function argument.
    """
    app.state.mongo.db().audit_events.insert_one(
        {
            "timestamp": timestamp,
            "actor_user_id": "actor-id",
            "subject_user_id": subject_user_id,
            "action": action,
            "resource_type": "message",
            "resource_id": "resource-id",
            "success": True,
            "ip_address": "127.0.0.1",
            "user_agent": user_agent,
            "metadata": {},
        }
    )


def test_audit_query_is_scoped_and_date_filtered(client: TestClient) -> None:
    """Verify audit query is scoped and date filtered.

    Args:
        client: Function argument.
    """
    _signup(client, "therapist@example.com")
    therapist_token = _login(client, "therapist@example.com")
    owned_client = _create_client(client, therapist_token, "client@example.com")

    _insert_event(
        subject_user_id=owned_client["id"],
        timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc),
        action="BEFORE",
    )
    _insert_event(
        subject_user_id=owned_client["id"],
        timestamp=datetime(2026, 2, 1, tzinfo=timezone.utc),
        action="IN_RANGE",
    )
    _insert_event(
        subject_user_id=owned_client["id"],
        timestamp=datetime(2026, 3, 1, tzinfo=timezone.utc),
        action="AFTER",
    )

    response = client.get(
        "/audit",
        params={
            "subject_user_id": owned_client["id"],
            "from": "2026-01-15T00:00:00Z",
            "to": "2026-02-15T00:00:00Z",
        },
        headers={"Authorization": f"Bearer {therapist_token}"},
    )

    assert response.status_code == 200
    assert [event["action"] for event in response.json()] == ["IN_RANGE"]
    database = app.state.mongo.db()
    assert database.audit_events.count_documents({"action": "AUDIT_QUERIED"}) == 1


def test_foreign_therapist_cannot_query_or_export_client_audit(
    client: TestClient,
) -> None:
    """Verify foreign therapist cannot query or export client audit.

    Args:
        client: Function argument.
    """
    _signup(client, "owner@example.com")
    owner_token = _login(client, "owner@example.com")
    owned_client = _create_client(client, owner_token, "client@example.com")

    _signup(client, "foreign@example.com")
    foreign_token = _login(client, "foreign@example.com")

    query = client.get(
        "/audit",
        params={"subject_user_id": owned_client["id"]},
        headers={"Authorization": f"Bearer {foreign_token}"},
    )
    export = client.post(
        "/export",
        params={"subject_user_id": owned_client["id"]},
        headers={"Authorization": f"Bearer {foreign_token}"},
    )

    assert query.status_code == 404
    assert export.status_code == 404


def test_client_cannot_query_or_export_audit(client: TestClient) -> None:
    """Verify client cannot query or export audit.

    Args:
        client: Function argument.
    """
    _signup(client, "therapist@example.com")
    therapist_token = _login(client, "therapist@example.com")
    owned_client = _create_client(client, therapist_token, "client@example.com")
    client_token = _login(client, "client@example.com")

    query = client.get(
        "/audit",
        params={"subject_user_id": owned_client["id"]},
        headers={"Authorization": f"Bearer {client_token}"},
    )
    export = client.post(
        "/export",
        params={"subject_user_id": owned_client["id"]},
        headers={"Authorization": f"Bearer {client_token}"},
    )

    assert query.status_code == 403
    assert export.status_code == 403


def test_csv_export_filters_rows_and_escapes_formula_cells(client: TestClient) -> None:
    """Verify csv export filters rows and escapes formula cells.

    Args:
        client: Function argument.
    """
    _signup(client, "therapist@example.com")
    therapist_token = _login(client, "therapist@example.com")
    owned_client = _create_client(client, therapist_token, "client@example.com")

    _insert_event(
        subject_user_id=owned_client["id"],
        timestamp=datetime(2026, 2, 1, tzinfo=timezone.utc),
        action="IN_RANGE",
        user_agent="=HYPERLINK(\"https://example.invalid\")",
    )
    _insert_event(
        subject_user_id=owned_client["id"],
        timestamp=datetime(2026, 4, 1, tzinfo=timezone.utc),
        action="OUTSIDE_RANGE",
    )

    response = client.post(
        "/export",
        params={
            "subject_user_id": owned_client["id"],
            "from": "2026-01-15T00:00:00Z",
            "to": "2026-02-15T00:00:00Z",
        },
        headers={"Authorization": f"Bearer {therapist_token}"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    rows = list(csv.DictReader(io.StringIO(response.text)))
    assert len(rows) == 1
    assert rows[0]["action"] == "IN_RANGE"
    assert rows[0]["user_agent"].startswith("'=HYPERLINK")

    database = app.state.mongo.db()
    assert database.audit_events.count_documents({"action": "EXPORT_GENERATED"}) == 1


def test_invalid_date_range_is_rejected(client: TestClient) -> None:
    """Verify invalid date range is rejected.

    Args:
        client: Function argument.
    """
    _signup(client, "therapist@example.com")
    therapist_token = _login(client, "therapist@example.com")
    owned_client = _create_client(client, therapist_token, "client@example.com")

    response = client.get(
        "/audit",
        params={
            "subject_user_id": owned_client["id"],
            "from": "2026-03-01T00:00:00Z",
            "to": "2026-02-01T00:00:00Z",
        },
        headers={"Authorization": f"Bearer {therapist_token}"},
    )

    assert response.status_code == 422
