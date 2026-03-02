from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


LogLevel = Literal["CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"]
AppEnv = Literal["local", "dev", "staging", "prod"]


class Settings(BaseSettings):
    """App configuration loaded from environment variables.

    - Fails fast for truly required variables (e.g., MONGO_URI).
    - Provides safe defaults for local dev ergonomics.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # =========================
    # App
    # =========================
    app_env: AppEnv = Field("local", alias="APP_ENV")
    api_title: str = Field("Clinly Backbone", alias="API_TITLE")
    api_version: str = Field("0.1.0", alias="API_VERSION")
    log_level: LogLevel = Field("INFO", alias="LOG_LEVEL")

    # =========================
    # Mongo
    # =========================
    mongo_uri: str = Field(..., alias="MONGO_URI")
    mongo_db_name: str = Field("clinly", alias="MONGO_DB_NAME")
    mongo_connect_timeout_ms: int = Field(3000, alias="MONGO_CONNECT_TIMEOUT_MS")
    mongo_server_selection_timeout_ms: int = Field(3000, alias="MONGO_SERVER_SELECTION_TIMEOUT_MS")

    # =========================
    # Security placeholders (later milestones)
    # =========================
    jwt_secret: str | None = Field(default=None, alias="JWT_SECRET")
    message_encryption_key: str | None = Field(default=None, alias="MESSAGE_ENCRYPTION_KEY")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance.

    Instantiating Settings triggers validation.
    """
    s = Settings()

    # Normalize log level if someone sets "info" instead of "INFO"
    if isinstance(s.log_level, str):
        s.log_level = s.log_level.upper()  # type: ignore[assignment]

    return s