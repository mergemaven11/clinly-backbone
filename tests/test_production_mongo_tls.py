"""Production MongoDB transport security tests."""
from __future__ import annotations

import base64

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def _settings(mongo_uri: str) -> Settings:
    """Build otherwise-valid production settings for a Mongo URI."""
    encryption_key = base64.urlsafe_b64encode(b"x" * 32).decode("ascii")
    return Settings(
        APP_ENV="prod",
        LOG_LEVEL="INFO",
        MONGO_URI=mongo_uri,
        JWT_SECRET="p" * 48,
        MESSAGE_ENCRYPTION_KEY=encryption_key,
        CORS_ALLOWED_ORIGINS=["https://clinly.example"],
    )


def test_production_rejects_plaintext_standard_mongo_uri() -> None:
    """A standard mongodb URI must opt into TLS in production."""
    with pytest.raises(ValidationError):
        _settings("mongodb://internal-mongo:27017/clinly")


def test_production_accepts_tls_standard_mongo_uri() -> None:
    """A standard mongodb URI is accepted when TLS is explicit."""
    settings = _settings("mongodb://internal-mongo:27017/clinly?tls=true")
    assert settings.app_env == "prod"


def test_production_accepts_srv_tls_default() -> None:
    """SRV connections use encrypted transport by default."""
    settings = _settings("mongodb+srv://cluster.example/clinly")
    assert settings.app_env == "prod"


def test_production_rejects_explicitly_disabled_srv_tls() -> None:
    """An SRV URI cannot explicitly turn TLS off in production."""
    with pytest.raises(ValidationError):
        _settings("mongodb+srv://cluster.example/clinly?tls=false")
