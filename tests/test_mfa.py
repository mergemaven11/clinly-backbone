"""End-to-end MFA lifecycle tests against the FastAPI and MongoDB stack."""
from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.mfa import totp_code

PASSWORD = "StrongPass123!"
EMAIL = "mfa-provider@example.com"


@pytest.fixture
def client() -> Iterator[TestClient]:
    """Provide an isolated application client for MFA lifecycle tests."""
    with TestClient(app) as test_client:
        database = app.state.mongo.db()
        for collection in ("users", "auth_sessions", "audit_events"):
            database[collection].delete_many({})
        yield test_client
        for collection in ("users", "auth_sessions", "audit_events"):
            database[collection].delete_many({})


def _signup(client: TestClient) -> None:
    response = client.post(
        "/auth/signup-provider",
        json={"email": EMAIL, "password": PASSWORD},
    )
    assert response.status_code == 201


def _login(client: TestClient, **extra: str) -> TestClient:
    payload = {"email": EMAIL, "password": PASSWORD, **extra}
    return client.post("/auth/login", json=payload)


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_mfa_enrollment_revokes_other_sessions_and_requires_second_factor(
    client: TestClient,
) -> None:
    """Enabling MFA protects future logins and invalidates other active devices."""
    _signup(client)

    first_login = _login(client)
    second_login = _login(client)
    assert first_login.status_code == 200
    assert second_login.status_code == 200
    first_token = first_login.json()["access_token"]
    second_token = second_login.json()["access_token"]

    setup = client.post("/auth/mfa/setup", headers=_headers(first_token))
    assert setup.status_code == 200
    setup_body = setup.json()
    assert setup_body["provisioning_uri"].startswith("otpauth://totp/")
    assert setup_body["secret"] not in str(
        app.state.mongo.db().users.find_one({"email": EMAIL})
    )

    confirmation_code = totp_code(setup_body["secret"])
    confirm = client.post(
        "/auth/mfa/confirm",
        headers=_headers(first_token),
        json={"code": confirmation_code},
    )
    assert confirm.status_code == 200
    recovery_codes = confirm.json()["recovery_codes"]
    assert len(recovery_codes) == 10
    assert len(set(recovery_codes)) == 10

    # The browser that enrolled MFA remains valid; a separate device/session is
    # revoked immediately at the security-boundary change.
    assert client.get("/account/me", headers=_headers(first_token)).status_code == 200
    assert client.get("/account/me", headers=_headers(second_token)).status_code == 401

    missing_factor = _login(client)
    assert missing_factor.status_code == 401
    assert missing_factor.json()["detail"] == "MFA code required"
    assert missing_factor.headers["X-MFA-Required"] == "true"

    # The enrollment code's TOTP time step was recorded at confirmation and
    # cannot be replayed to create a new session in the same 30-second window.
    replayed = _login(client, mfa_code=confirmation_code)
    assert replayed.status_code == 401
    assert replayed.json()["detail"] == "Invalid MFA code"

    recovery_login = _login(client, mfa_code=recovery_codes[0])
    assert recovery_login.status_code == 200
    protected_token = recovery_login.json()["access_token"]

    reused_recovery = _login(client, mfa_code=recovery_codes[0])
    assert reused_recovery.status_code == 401
    assert reused_recovery.json()["detail"] == "Invalid MFA code"

    status_response = client.get(
        "/auth/mfa/status",
        headers=_headers(protected_token),
    )
    assert status_response.status_code == 200
    assert status_response.json() == {
        "enabled": True,
        "recovery_codes_remaining": 9,
    }

    stored_user = app.state.mongo.db().users.find_one({"email": EMAIL})
    assert stored_user is not None
    assert stored_user["mfa_enabled"] is True
    assert "mfa_secret_ciphertext" in stored_user
    assert "mfa_recovery_digests" in stored_user
    assert all(code not in str(stored_user) for code in recovery_codes)


def test_recovery_rotation_and_mfa_disable_require_current_factor(
    client: TestClient,
) -> None:
    """Recovery rotation and MFA disable are protected security operations."""
    _signup(client)
    login = _login(client)
    token = login.json()["access_token"]
    headers = _headers(token)

    setup = client.post("/auth/mfa/setup", headers=headers).json()
    confirmation_code = totp_code(setup["secret"])
    confirm = client.post(
        "/auth/mfa/confirm",
        headers=headers,
        json={"code": confirmation_code},
    )
    assert confirm.status_code == 200
    original_codes = confirm.json()["recovery_codes"]

    rotate = client.post(
        "/auth/mfa/recovery-codes",
        headers=headers,
        json={"code": original_codes[0]},
    )
    assert rotate.status_code == 200
    replacement_codes = rotate.json()["recovery_codes"]
    assert replacement_codes != original_codes

    old_code_login = _login(client, mfa_code=original_codes[1])
    assert old_code_login.status_code == 401

    bad_password = client.post(
        "/auth/mfa/disable",
        headers=headers,
        json={"password": "WrongPass123!", "code": replacement_codes[0]},
    )
    assert bad_password.status_code == 401

    disable = client.post(
        "/auth/mfa/disable",
        headers=headers,
        json={"password": PASSWORD, "code": replacement_codes[0]},
    )
    assert disable.status_code == 200
    assert disable.json() == {"enabled": False}

    password_only_login = _login(client)
    assert password_only_login.status_code == 200

    status_response = client.get("/auth/mfa/status", headers=headers)
    assert status_response.status_code == 200
    assert status_response.json() == {
        "enabled": False,
        "recovery_codes_remaining": 0,
    }
