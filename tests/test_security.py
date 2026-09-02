"""Document this first-party Python module."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.models.users import TherapistSignup
from app.services.security import hash_password, verify_password


def test_password_hash_round_trip() -> None:
    """Verify password hash round trip."""
    password = "StrongPass123!"
    password_hash = hash_password(password)

    assert password_hash != password
    assert password_hash.startswith("$2")
    assert verify_password(password, password_hash) is True
    assert verify_password("WrongPass123!", password_hash) is False


def test_password_over_bcrypt_byte_limit_is_rejected() -> None:
    """Verify password over bcrypt byte limit is rejected."""
    with pytest.raises(ValidationError):
        TherapistSignup(
            email="therapist@example.com",
            password="é" * 37,
        )
