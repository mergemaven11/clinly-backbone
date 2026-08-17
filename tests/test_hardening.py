from __future__ import annotations

import io
import json
import logging
from collections.abc import Iterator
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from bson import ObjectId
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import DEV_ENCRYPTION_KEY, Settings, get_settings
from app.core.logging import JsonFormatter
from app.main import app

PASSWORD = "StrongPass123!"


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        database = app.state.mongo.db()
        for collection in ("users", "conversations", "messages", "audit_events"):
            database[collection].delete_many({})
        yield test_client
        for collection in ("users", "conversations", "messages", "audit_events"):
            database[collection].delete_many({})


def _signup(client: TestClient, email: str = "therapist@example.com") -> dict:
    response = client.post(
        "/auth/signup-therapist",
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 201
    return response.json()


def _login(client: TestClient, email: str = "therapist@example.com") -> str:
    response = client.post(
        "/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _prod_settings(**overrides) -> Settings:
    values = {
        "APP_ENV": "prod",
        "LOG_LEVEL": "INFO",
        "MONGO_URI": "mongodb://internal-mongo:27017/clinly",
        "JWT_SECRET": "p" * 48,
        "MESSAGE_ENCRYPTION_KEY": "_T2oX4z8Q_Ao1mmWS1K5W9asYzXk8YoYRmR7pP9oDC0=",
        "CORS_ALLOWED_ORIGINS": ["https://clinly.example"],
    }
    values.update(overrides)
    return Settings(**values)


def test_production_rejects_debug_and_unsafe_cors() -> None:
    with pytest.raises(ValidationError):
        _prod_settings(LOG_LEVEL="DEBUG")
    with pytest.raises(ValidationError):
        _prod_settings(CORS_ALLOWED_ORIGINS=["*"])
    with pytest.raises(ValidationError):
        _prod_settings(CORS_ALLOWED_ORIGINS=["http://clinly.example"])


def test_production_rejects_example_secrets() -> None:
    with pytest.raises(ValidationError):
        _prod_settings(JWT_SECRET="change-me-" + "x" * 40)
    with pytest.raises(ValidationError):
        _prod_settings(MESSAGE_ENCRYPTION_KEY=DEV_ENCRYPTION_KEY)


def test_cors_is_disabled_by_default() -> None:
    assert get_settings().cors_allowed_origins == []
    assert all(middleware.cls is not CORSMiddleware for middleware in app.user_middleware)


def test_login_is_rate_limited_and_rate_limit_is_audited(client: TestClient) -> None:
    _signup(client)
    for _ in range(get_settings().login_rate_limit_max_attempts):
        response = client.post(
            "/auth/login",
            json={"email": "therapist@example.com", "password": "WrongPass123!"},
        )
        assert response.status_code == 401

    blocked = client.post(
        "/auth/login",
        json={"email": "therapist@example.com", "password": "WrongPass123!"},
    )
    assert blocked.status_code == 429
    assert int(blocked.headers["Retry-After"]) >= 1

    database = app.state.mongo.db()
    audit = database.audit_events.find_one(
        {"action": "LOGIN_FAILURE", "metadata.reason": "rate_limited"}
    )
    assert audit is not None


def test_expired_and_forged_jwts_are_rejected(client: TestClient) -> None:
    settings = get_settings()
    secret = settings.jwt_secret.get_secret_value()
    expired = jwt.encode(
        {
            "sub": str(ObjectId()),
            "role": "THERAPIST",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        secret,
        algorithm="HS256",
    )
    forged = jwt.encode(
        {
            "sub": str(ObjectId()),
            "role": "THERAPIST",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        },
        "different-secret-that-is-long-enough-123456",
        algorithm="HS256",
    )

    for token in (expired, forged):
        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401


def test_missing_login_parameters_return_validation_error(client: TestClient) -> None:
    response = client.post("/auth/login", json={})
    assert response.status_code == 422


def test_valid_but_unknown_conversation_id_is_safely_denied(client: TestClient) -> None:
    therapist = _signup(client)
    token = _login(client)
    guessed_id = str(ObjectId())

    response = client.get(
        "/messages",
        params={"conversation_id": guessed_id},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404
    audit = app.state.mongo.db().audit_events.find_one(
        {
            "action": "AUTHZ_DENIED",
            "actor_user_id": therapist["id"],
            "resource_id": guessed_id,
        }
    )
    assert audit is not None


def test_ready_returns_503_when_mongo_ping_fails(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_ping() -> bool:
        raise RuntimeError("database unavailable")

    monkeypatch.setattr(app.state.mongo, "ping", fail_ping)
    response = client.get("/ready")
    assert response.status_code == 503
    assert response.json()["detail"] == "Service not ready"


def test_plaintext_message_never_appears_in_structured_logs(client: TestClient) -> None:
    therapist = _signup(client)
    therapist_token = _login(client)
    created_client = client.post(
        "/auth/create-client",
        headers={"Authorization": f"Bearer {therapist_token}"},
        json={"email": "client@example.com", "password": PASSWORD},
    ).json()
    conversation = client.post(
        "/conversations",
        headers={"Authorization": f"Bearer {therapist_token}"},
        json={"client_id": created_client["id"]},
    ).json()

    log_buffer = io.StringIO()
    capture_handler = logging.StreamHandler(log_buffer)
    capture_handler.setFormatter(JsonFormatter(app_env=get_settings().app_env))
    root_logger = logging.getLogger()
    root_logger.addHandler(capture_handler)

    secret_body = "ultra-private-message-body-9f8d7c"
    try:
        sent = client.post(
            "/messages",
            headers={"Authorization": f"Bearer {therapist_token}"},
            json={
                "conversation_id": conversation["id"],
                "plaintext_body": secret_body,
            },
        )
        assert sent.status_code == 201
        capture_handler.flush()
        captured = log_buffer.getvalue()
        assert secret_body not in captured

        log_lines = [line for line in captured.splitlines() if line.startswith("{")]
        request_logs = [
            json.loads(line)
            for line in log_lines
            if '"message":"request_complete"' in line
            and '"route":"/messages"' in line
        ]
        assert request_logs
        message_log = request_logs[-1]
        assert message_log["actor_user_id"] == therapist["id"]
        assert message_log["status_code"] == 201
        assert message_log["request_id"]
        assert isinstance(message_log["latency_ms"], (int, float))

        log_buffer.seek(0)
        log_buffer.truncate(0)
        listed = client.get(
            "/messages",
            params={"conversation_id": conversation["id"]},
            headers={"Authorization": f"Bearer {therapist_token}"},
        )
        assert listed.status_code == 200
        assert listed.json()[0]["plaintext_body"] == secret_body
        capture_handler.flush()
        assert secret_body not in log_buffer.getvalue()
    finally:
        root_logger.removeHandler(capture_handler)
        capture_handler.close()
