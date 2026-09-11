"""Authenticated multi-factor authentication enrollment and recovery routes."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from pymongo.database import Database

from app.api.dependencies import get_current_user, get_database
from app.core.config import get_settings
from app.services.audit import log_audit_event
from app.services.mfa import (
    MfaSecretCipher,
    generate_recovery_codes,
    generate_totp_secret,
    provisioning_uri,
    recovery_code_digest,
    verify_totp,
)
from app.services.security import verify_password

router = APIRouter(prefix="/auth/mfa", tags=["auth", "mfa"])
MFA_SETUP_MINUTES = 10


class MfaCodeRequest(BaseModel):
    """Authenticator or recovery code submitted by an authenticated user."""

    code: str = Field(min_length=6, max_length=64)


class MfaDisableRequest(MfaCodeRequest):
    """MFA disable request requiring the account password and second factor."""

    password: str = Field(min_length=8, max_length=128)


def _cipher() -> MfaSecretCipher:
    """Build the MFA cipher from the application's protected AEAD key."""
    key = get_settings().message_encryption_key.get_secret_value()
    return MfaSecretCipher(key)


def _recovery_digests(codes: list[str]) -> list[str]:
    pepper = get_settings().jwt_secret.get_secret_value()
    return [recovery_code_digest(code, pepper=pepper) for code in codes]


def _consume_enabled_factor(
    database: Database,
    *,
    user: dict[str, Any],
    code: str,
) -> str | None:
    """Consume a valid TOTP or recovery code and return the factor type."""
    ciphertext = user.get("mfa_secret_ciphertext")
    if not user.get("mfa_enabled") or not ciphertext:
        return None

    try:
        secret = _cipher().decrypt(ciphertext)
    except RuntimeError:
        return None

    counter = verify_totp(secret, code)
    if counter is not None:
        result = database.users.update_one(
            {
                "_id": user["_id"],
                "$or": [
                    {"mfa_last_counter": {"$lt": counter}},
                    {"mfa_last_counter": {"$exists": False}},
                    {"mfa_last_counter": None},
                ],
            },
            {"$set": {"mfa_last_counter": counter}},
        )
        return "totp" if result.modified_count == 1 else None

    pepper = get_settings().jwt_secret.get_secret_value()
    digest = recovery_code_digest(code, pepper=pepper)
    result = database.users.update_one(
        {"_id": user["_id"], "mfa_recovery_digests": digest},
        {"$pull": {"mfa_recovery_digests": digest}},
    )
    return "recovery" if result.modified_count == 1 else None


@router.get("/status", summary="Return MFA enrollment status")
def mfa_status(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Return only non-secret MFA state for the authenticated account."""
    return {
        "enabled": bool(current_user.get("mfa_enabled")),
        "recovery_codes_remaining": len(current_user.get("mfa_recovery_digests", [])),
    }


@router.post("/setup", summary="Start authenticator-app enrollment")
def mfa_setup(
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    """Create short-lived pending TOTP seed material for enrollment."""
    if current_user.get("mfa_enabled"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="MFA is already enabled",
        )

    secret = generate_totp_secret()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=MFA_SETUP_MINUTES)
    ciphertext = _cipher().encrypt(secret)
    database.users.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "mfa_pending_secret_ciphertext": ciphertext,
                "mfa_pending_expires_at": expires_at,
            }
        },
    )
    actor_id = str(current_user["_id"])
    log_audit_event(
        database,
        action="MFA_SETUP_STARTED",
        success=True,
        actor_user_id=actor_id,
        subject_user_id=actor_id,
        resource_type="user",
        resource_id=actor_id,
        request=request,
    )
    return {
        "secret": secret,
        "provisioning_uri": provisioning_uri(secret, current_user["email"]),
        "expires_at": expires_at.isoformat(),
    }


@router.post("/confirm", summary="Confirm authenticator enrollment")
def mfa_confirm(
    payload: MfaCodeRequest,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Validate the enrollment code, enable MFA, and issue recovery codes."""
    if current_user.get("mfa_enabled"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="MFA is already enabled",
        )

    pending = current_user.get("mfa_pending_secret_ciphertext")
    pending_expires_at = current_user.get("mfa_pending_expires_at")
    now = datetime.now(timezone.utc)
    if not pending or pending_expires_at is None or pending_expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA setup has expired; start setup again",
        )

    try:
        secret = _cipher().decrypt(pending)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA setup is invalid; start setup again",
        ) from exc

    counter = verify_totp(secret, payload.code)
    if counter is None:
        log_audit_event(
            database,
            action="MFA_ENABLE_FAILURE",
            success=False,
            actor_user_id=str(current_user["_id"]),
            subject_user_id=str(current_user["_id"]),
            resource_type="user",
            resource_id=str(current_user["_id"]),
            request=request,
            metadata={"reason": "invalid_code"},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid authenticator code",
        )

    recovery_codes = generate_recovery_codes()
    result = database.users.update_one(
        {
            "_id": current_user["_id"],
            "mfa_pending_secret_ciphertext": pending,
            "mfa_enabled": {"$ne": True},
        },
        {
            "$set": {
                "mfa_enabled": True,
                "mfa_enabled_at": now,
                "mfa_secret_ciphertext": pending,
                "mfa_last_counter": counter,
                "mfa_recovery_digests": _recovery_digests(recovery_codes),
            },
            "$unset": {
                "mfa_pending_secret_ciphertext": "",
                "mfa_pending_expires_at": "",
            },
        },
    )
    if result.modified_count != 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="MFA enrollment changed; start setup again",
        )

    # Enabling MFA is a security-boundary change. Revoke every other session so
    # old browser/device sessions cannot continue without the newly enabled MFA.
    database.auth_sessions.update_many(
        {
            "user_id": current_user["_id"],
            "_id": {"$ne": request.state.auth_session_id},
            "revoked_at": None,
        },
        {"$set": {"revoked_at": now}},
    )
    actor_id = str(current_user["_id"])
    log_audit_event(
        database,
        action="MFA_ENABLED",
        success=True,
        actor_user_id=actor_id,
        subject_user_id=actor_id,
        resource_type="user",
        resource_id=actor_id,
        request=request,
        metadata={"recovery_codes_generated": len(recovery_codes)},
    )
    return {"enabled": True, "recovery_codes": recovery_codes}


@router.post("/recovery-codes", summary="Replace MFA recovery codes")
def mfa_replace_recovery_codes(
    payload: MfaCodeRequest,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Require a current factor and replace every remaining recovery code."""
    factor = _consume_enabled_factor(database, user=current_user, code=payload.code)
    if factor is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code",
        )

    recovery_codes = generate_recovery_codes()
    database.users.update_one(
        {"_id": current_user["_id"], "mfa_enabled": True},
        {"$set": {"mfa_recovery_digests": _recovery_digests(recovery_codes)}},
    )
    actor_id = str(current_user["_id"])
    log_audit_event(
        database,
        action="MFA_RECOVERY_CODES_REPLACED",
        success=True,
        actor_user_id=actor_id,
        subject_user_id=actor_id,
        resource_type="user",
        resource_id=actor_id,
        request=request,
        metadata={"factor": factor},
    )
    return {"recovery_codes": recovery_codes}


@router.post("/disable", summary="Disable MFA for the current account")
def mfa_disable(
    payload: MfaDisableRequest,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, bool]:
    """Disable MFA only after re-entering the password and a valid factor."""
    if not current_user.get("mfa_enabled"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="MFA is not enabled",
        )
    if not verify_password(payload.password, current_user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    factor = _consume_enabled_factor(database, user=current_user, code=payload.code)
    if factor is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code",
        )

    now = datetime.now(timezone.utc)
    database.users.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {"mfa_enabled": False, "mfa_disabled_at": now},
            "$unset": {
                "mfa_secret_ciphertext": "",
                "mfa_last_counter": "",
                "mfa_recovery_digests": "",
                "mfa_pending_secret_ciphertext": "",
                "mfa_pending_expires_at": "",
            },
        },
    )
    database.auth_sessions.update_many(
        {
            "user_id": current_user["_id"],
            "_id": {"$ne": request.state.auth_session_id},
            "revoked_at": None,
        },
        {"$set": {"revoked_at": now}},
    )
    actor_id = str(current_user["_id"])
    log_audit_event(
        database,
        action="MFA_DISABLED",
        success=True,
        actor_user_id=actor_id,
        subject_user_id=actor_id,
        resource_type="user",
        resource_id=actor_id,
        request=request,
        metadata={"factor": factor},
    )
    return {"enabled": False}
