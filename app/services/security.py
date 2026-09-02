"""Document this first-party Python module."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from jwt import InvalidTokenError

JWT_ALGORITHM = "HS256"
BCRYPT_ROUNDS = 12
BCRYPT_MAX_PASSWORD_BYTES = 72


def _password_bytes(password: str) -> bytes:
    """Handle password bytes.

    Args:
        password: Function argument.

    Returns:
        Function result.
    """
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
    """Handle create access token.

    Args:
        subject: Function argument.
        role: Function argument.
        secret: Function argument.
        expires_minutes: Function argument.

    Returns:
        Function result.
    """
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

    ``InvalidTokenError`` is intentionally allowed to propagate to the auth
    dependency, which maps invalid and expired tokens to the same public
    response.
    """
    payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
    if not payload.get("sub") or not payload.get("role"):
        raise InvalidTokenError("token missing required claims")
    return payload
