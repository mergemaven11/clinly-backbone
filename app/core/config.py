from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


LogLevel = Literal["CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"]
AppEnv = Literal["local", "dev", "staging", "prod"]
DEV_ENCRYPTION_KEY = "fFauOTt3BH8g9ZW7qzMjYBlq4WqrbGzZkr0KQINCO3c="


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: AppEnv = Field(
        "local",
        validation_alias=AliasChoices("APP_ENV", "ENVIRONMENT"),
    )
    api_title: str = Field("Clinly Backbone", alias="API_TITLE")
    api_version: str = Field("0.1.0", alias="API_VERSION")
    log_level: LogLevel = Field("INFO", alias="LOG_LEVEL")

    mongo_uri: str = Field(..., min_length=1, alias="MONGO_URI")
    mongo_db_name: str = Field("clinly", alias="MONGO_DB_NAME")
    mongo_connect_timeout_ms: int = Field(
        3000,
        ge=250,
        le=30_000,
        alias="MONGO_CONNECT_TIMEOUT_MS",
    )
    mongo_server_selection_timeout_ms: int = Field(
        3000,
        ge=250,
        le=30_000,
        alias="MONGO_SERVER_SELECTION_TIMEOUT_MS",
    )

    jwt_secret: SecretStr = Field(..., min_length=32, alias="JWT_SECRET")
    message_encryption_key: SecretStr = Field(..., alias="MESSAGE_ENCRYPTION_KEY")
    jwt_access_token_minutes: int = Field(
        60,
        ge=5,
        le=1440,
        alias="JWT_ACCESS_TOKEN_MINUTES",
    )

    cors_allowed_origins: list[str] = Field(
        default_factory=list,
        alias="CORS_ALLOWED_ORIGINS",
    )
    login_rate_limit_max_attempts: int = Field(
        5,
        ge=2,
        le=100,
        alias="LOGIN_RATE_LIMIT_MAX_ATTEMPTS",
    )
    login_rate_limit_ip_max_attempts: int = Field(
        20,
        ge=2,
        le=500,
        alias="LOGIN_RATE_LIMIT_IP_MAX_ATTEMPTS",
    )
    login_rate_limit_window_seconds: int = Field(
        300,
        ge=30,
        le=3600,
        alias="LOGIN_RATE_LIMIT_WINDOW_SECONDS",
    )

    @field_validator("log_level", mode="before")
    @classmethod
    def normalize_log_level(cls, value: str) -> str:
        return value.upper() if isinstance(value, str) else value

    @field_validator("cors_allowed_origins")
    @classmethod
    def normalize_origins(cls, value: list[str]) -> list[str]:
        return [origin.rstrip("/") for origin in value if origin.strip()]

    @model_validator(mode="after")
    def enforce_production_security(self) -> "Settings":
        if self.app_env != "prod":
            return self

        jwt_secret = self.jwt_secret.get_secret_value()
        encryption_key = self.message_encryption_key.get_secret_value()
        weak_markers = ("change-me", "placeholder", "dev-only", "example")

        if self.log_level == "DEBUG":
            raise ValueError("LOG_LEVEL=DEBUG is not allowed in production")
        if any(marker in jwt_secret.lower() for marker in weak_markers):
            raise ValueError("JWT_SECRET uses a development/example value")
        if encryption_key == DEV_ENCRYPTION_KEY:
            raise ValueError("MESSAGE_ENCRYPTION_KEY must be unique in production")
        if "*" in self.cors_allowed_origins:
            raise ValueError("Wildcard CORS origins are not allowed in production")
        if any(not origin.startswith("https://") for origin in self.cors_allowed_origins):
            raise ValueError("Production CORS origins must use HTTPS")

        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the cached, validated settings instance."""
    return Settings()
