from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken


class MessageCipher:
    """Authenticated symmetric encryption for message bodies.

    Fernet provides confidentiality and integrity. The key is supplied only
    through runtime configuration and plaintext is never persisted by this
    service.
    """

    def __init__(self, key: str) -> None:
        try:
            self._fernet = Fernet(key.encode("ascii"))
        except (AttributeError, UnicodeEncodeError, ValueError) as exc:
            raise RuntimeError("MESSAGE_ENCRYPTION_KEY is invalid") from exc

    def encrypt(self, plaintext: str) -> str:
        """Return an authenticated, URL-safe base64 ciphertext token."""
        return self._fernet.encrypt(plaintext.encode("utf-8")).decode("ascii")

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt a stored token, failing closed if integrity validation fails."""
        try:
            plaintext = self._fernet.decrypt(ciphertext.encode("ascii"))
        except (InvalidToken, UnicodeEncodeError, ValueError) as exc:
            raise RuntimeError("Stored message ciphertext is invalid") from exc
        return plaintext.decode("utf-8")
