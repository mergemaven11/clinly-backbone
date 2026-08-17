from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

JWT_ALGORITHM = "HS256"
BCRYPT_ROUNDS = 12
BCRYPT_MAX_PASSWORD_BYTES = 72


def _password_bytes(password: str) -> bytes:
    encoded = password.encode("utf-8")
    if len(encoded) > BCRYPT_MAX_PASSWORD_BYTES:
        raise ValueError("password exceeds bcrypt's 72-byte limit")
    return encoded


def hash_password(password: str) -> str:
    """Hash a password with bcrypt using a fresh random salt."""
    hashed = bcrypt.hashpw(
        _password_bytes(password),
        bcrypt.gensalt(rounds=BCRYPT_ROUNDS),
    )
    return hashed.decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a candidate password against its stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            _password_bytes(password),
            password_hash.encode("ascii"),
        )
    except (ValueError, UnicodeEncodeError):
        return False


def create_access_token(
    *,
    subject: str,
    role: str,
    secret: str,
    expires_minutes: int,
) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str, *, secret: str) -> dict[str, Any]:
    """Decode and validate a Clinly JWT.

    ``JWTError`` is intentionally allowed to propagate to the auth dependency,
    which maps all invalid/expired token variants to the same public response.
    """
    payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
    if not payload.get("sub") or not payload.get("role"):
        raise JWTError("token missing required claims")
    return payload
