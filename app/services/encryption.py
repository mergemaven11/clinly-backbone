"""Document this first-party Python module."""
from __future__ import annotations

import base64
import binascii

from nacl.exceptions import CryptoError
from nacl.secret import Aead

MESSAGE_AAD = b"clinly-message-v1"


class MessageCipher:
    """Authenticated symmetric encryption for message bodies.

    PyNaCl's AEAD API uses XChaCha20-Poly1305 and generates a random extended
    nonce by default. The URL-safe base64 key must decode to exactly 32 bytes.
    Plaintext is never persisted by this service.
    """

    def __init__(self, key: str) -> None:
        """Initialize the instance.

        Args:
            key: Function argument.
        """
        try:
            raw_key = base64.urlsafe_b64decode(key.encode("ascii"))
        except (AttributeError, UnicodeEncodeError, ValueError, binascii.Error) as exc:
            raise RuntimeError("MESSAGE_ENCRYPTION_KEY is invalid") from exc

        if len(raw_key) != Aead.KEY_SIZE:
            raise RuntimeError("MESSAGE_ENCRYPTION_KEY is invalid")
        self._aead = Aead(raw_key)

    def encrypt(self, plaintext: str) -> str:
        """Return an authenticated, nonce-containing URL-safe ciphertext."""
        encrypted = self._aead.encrypt(plaintext.encode("utf-8"), MESSAGE_AAD)
        return base64.urlsafe_b64encode(bytes(encrypted)).decode("ascii")

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt a stored token, failing closed if authentication fails."""
        try:
            encrypted = base64.urlsafe_b64decode(ciphertext.encode("ascii"))
            plaintext = self._aead.decrypt(encrypted, MESSAGE_AAD)
        except (
            CryptoError,
            UnicodeEncodeError,
            UnicodeDecodeError,
            ValueError,
            binascii.Error,
        ) as exc:
            raise RuntimeError("Stored message ciphertext is invalid") from exc
        return plaintext.decode("utf-8")
