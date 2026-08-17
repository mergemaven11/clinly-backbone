from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

PASSWORD_CONTEXT = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """Hash a password using bcrypt through Passlib."""
    return PASSWORD_CONTEXT.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a candidate password against its stored hash."""
    return PASSWORD_CONTEXT.verify(password, password_hash)


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
    try:
        payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise

    if not payload.get("sub") or not payload.get("role"):
        raise JWTError("token missing required claims")
    return payload
