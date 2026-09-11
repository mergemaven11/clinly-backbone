"""Unit tests for Clinly's MFA cryptographic primitives."""
from __future__ import annotations

import base64

import pytest

from app.services.mfa import (
    MfaSecretCipher,
    generate_recovery_codes,
    hotp,
    normalize_recovery_code,
    provisioning_uri,
    recovery_code_digest,
    totp_code,
    verify_totp,
)

RFC_4226_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"


def test_hotp_matches_rfc_4226_vectors() -> None:
    """HOTP implementation must match the published RFC test vectors."""
    assert hotp(RFC_4226_SECRET, 0) == "755224"
    assert hotp(RFC_4226_SECRET, 1) == "287082"
    assert hotp(RFC_4226_SECRET, 2) == "359152"


def test_totp_verification_returns_matched_counter() -> None:
    """A valid TOTP returns its counter so callers can reject replay."""
    at_time = 1_700_000_000.0
    code = totp_code(RFC_4226_SECRET, at_time=at_time)
    expected_counter = int(at_time // 30)
    assert verify_totp(RFC_4226_SECRET, code, at_time=at_time) == expected_counter
    assert verify_totp(RFC_4226_SECRET, "000000", at_time=at_time) is None


def test_mfa_secret_cipher_round_trips_and_rejects_tampering() -> None:
    """TOTP seed material is authenticated and encrypted at rest."""
    key = base64.urlsafe_b64encode(b"m" * 32).decode("ascii")
    cipher = MfaSecretCipher(key)
    encrypted = cipher.encrypt(RFC_4226_SECRET)

    assert RFC_4226_SECRET not in encrypted
    assert cipher.decrypt(encrypted) == RFC_4226_SECRET

    raw = bytearray(base64.urlsafe_b64decode(encrypted.encode("ascii")))
    raw[-1] ^= 1
    tampered = base64.urlsafe_b64encode(bytes(raw)).decode("ascii")
    with pytest.raises(RuntimeError):
        cipher.decrypt(tampered)


def test_recovery_codes_are_unique_and_stored_as_keyed_digests() -> None:
    """Recovery codes should be one-time secrets, never plaintext database values."""
    codes = generate_recovery_codes()
    assert len(codes) == 10
    assert len(set(codes)) == len(codes)

    sample = codes[0]
    normalized = normalize_recovery_code(sample.lower())
    digest = recovery_code_digest(sample, pepper="unit-test-pepper")
    same_digest = recovery_code_digest(normalized, pepper="unit-test-pepper")

    assert digest == same_digest
    assert normalized not in digest
    assert len(digest) == 64


def test_provisioning_uri_contains_only_expected_totp_configuration() -> None:
    """Authenticator enrollment URI identifies Clinly and the intended account."""
    uri = provisioning_uri(RFC_4226_SECRET, "provider@example.com")
    assert uri.startswith("otpauth://totp/Clinly%3Aprovider%40example.com?")
    assert f"secret={RFC_4226_SECRET}" in uri
    assert "issuer=Clinly" in uri
    assert "digits=6" in uri
    assert "period=30" in uri
