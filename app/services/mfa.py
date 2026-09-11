"""Multi-factor authentication primitives for Clinly accounts."""
from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote, urlencode

from nacl.exceptions import CryptoError
from nacl.secret import Aead

MFA_AAD = b"clinly-mfa-v1"
TOTP_PERIOD_SECONDS = 30
TOTP_DIGITS = 6
RECOVERY_CODE_COUNT = 10
RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_totp_secret() -> str:
    """Return a 160-bit RFC 6238-compatible base32 secret without padding."""
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def _decode_base32(secret: str) -> bytes:
    normalized = secret.strip().replace(" ", "").upper()
    normalized += "=" * ((8 - len(normalized) % 8) % 8)
    try:
        return base64.b32decode(normalized, casefold=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("invalid TOTP secret") from exc


def hotp(secret: str, counter: int, digits: int = TOTP_DIGITS) -> str:
    """Generate an RFC 4226 HOTP value for a counter."""
    if counter < 0:
        raise ValueError("counter must be non-negative")
    digest = hmac.new(
        _decode_base32(secret),
        struct.pack(">Q", counter),
        hashlib.sha1,
    ).digest()
    offset = digest[-1] & 0x0F
    binary = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return f"{binary % (10 ** digits):0{digits}d}"


def totp_code(secret: str, at_time: float | None = None) -> str:
    """Generate the current six-digit TOTP value."""
    moment = time.time() if at_time is None else at_time
    return hotp(secret, int(moment // TOTP_PERIOD_SECONDS))


def verify_totp(
    secret: str,
    code: str,
    *,
    at_time: float | None = None,
    window: int = 1,
) -> int | None:
    """Validate a TOTP value and return the matched counter.

    Returning the counter lets callers persist the last successful counter and
    reject replay of an authenticator code during its validity window.
    """
    normalized = code.strip().replace(" ", "")
    if len(normalized) != TOTP_DIGITS or not normalized.isdigit():
        return None

    moment = time.time() if at_time is None else at_time
    current_counter = int(moment // TOTP_PERIOD_SECONDS)
    for offset in range(-window, window + 1):
        counter = current_counter + offset
        if counter < 0:
            continue
        if hmac.compare_digest(hotp(secret, counter), normalized):
            return counter
    return None


def provisioning_uri(secret: str, account_name: str, issuer: str = "Clinly") -> str:
    """Return an ``otpauth://`` URI accepted by standard authenticator apps."""
    label = quote(f"{issuer}:{account_name}", safe="")
    query = urlencode(
        {
            "secret": secret,
            "issuer": issuer,
            "algorithm": "SHA1",
            "digits": str(TOTP_DIGITS),
            "period": str(TOTP_PERIOD_SECONDS),
        }
    )
    return f"otpauth://totp/{label}?{query}"


def generate_recovery_codes(count: int = RECOVERY_CODE_COUNT) -> list[str]:
    """Generate one-time recovery codes suitable for offline storage."""
    codes: list[str] = []
    for _ in range(count):
        raw = "".join(secrets.choice(RECOVERY_ALPHABET) for _ in range(12))
        codes.append(f"{raw[:4]}-{raw[4:8]}-{raw[8:]}")
    return codes


def normalize_recovery_code(code: str) -> str:
    """Normalize user-entered recovery-code formatting."""
    return "".join(character for character in code.upper() if character.isalnum())


def recovery_code_digest(code: str, *, pepper: str) -> str:
    """Return a keyed digest so plaintext recovery codes are never stored."""
    normalized = normalize_recovery_code(code)
    return hmac.new(
        pepper.encode("utf-8"),
        b"clinly-recovery-v1:" + normalized.encode("ascii", errors="ignore"),
        hashlib.sha256,
    ).hexdigest()


class MfaSecretCipher:
    """Encrypt TOTP seed material using the application's 32-byte AEAD key."""

    def __init__(self, key: str) -> None:
        try:
            raw_key = base64.urlsafe_b64decode(key.encode("ascii"))
        except (AttributeError, UnicodeEncodeError, ValueError, binascii.Error) as exc:
            raise RuntimeError("MFA encryption key is invalid") from exc
        if len(raw_key) != Aead.KEY_SIZE:
            raise RuntimeError("MFA encryption key is invalid")
        self._aead = Aead(raw_key)

    def encrypt(self, secret: str) -> str:
        """Encrypt a TOTP secret with a random nonce and MFA-specific AAD."""
        encrypted = self._aead.encrypt(secret.encode("ascii"), MFA_AAD)
        return base64.urlsafe_b64encode(bytes(encrypted)).decode("ascii")

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt stored TOTP seed material and fail closed on tampering."""
        try:
            encrypted = base64.urlsafe_b64decode(ciphertext.encode("ascii"))
            plaintext = self._aead.decrypt(encrypted, MFA_AAD)
            return plaintext.decode("ascii")
        except (
            CryptoError,
            UnicodeEncodeError,
            UnicodeDecodeError,
            ValueError,
            binascii.Error,
        ) as exc:
            raise RuntimeError("Stored MFA secret is invalid") from exc
