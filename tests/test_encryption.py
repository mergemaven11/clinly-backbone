from __future__ import annotations

import pytest

from app.services.encryption import MessageCipher

TEST_KEY = "fFauOTt3BH8g9ZW7qzMjYBlq4WqrbGzZkr0KQINCO3c="


def test_message_cipher_round_trip() -> None:
    cipher = MessageCipher(TEST_KEY)
    plaintext = "Private clinical message"

    ciphertext = cipher.encrypt(plaintext)

    assert ciphertext != plaintext
    assert plaintext not in ciphertext
    assert cipher.decrypt(ciphertext) == plaintext


def test_invalid_encryption_key_fails_fast() -> None:
    with pytest.raises(RuntimeError, match="MESSAGE_ENCRYPTION_KEY is invalid"):
        MessageCipher("not-a-fernet-key")


def test_tampered_ciphertext_fails_closed() -> None:
    cipher = MessageCipher(TEST_KEY)
    ciphertext = cipher.encrypt("private")
    tampered = ciphertext[:-2] + "AA"

    with pytest.raises(RuntimeError, match="ciphertext is invalid"):
        cipher.decrypt(tampered)
