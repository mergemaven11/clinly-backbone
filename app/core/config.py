from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


LogLevel = Literal["CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"]
AppEnv = Literal["local", "dev", "staging", "prod"]


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: AppEnv = Field("local", alias="APP_ENV")
    api_title: str = Field("Clinly Backbone", alias="API_TITLE")
    api_version: str = Field("0.1.0", alias="API_VERSION")
    log_level: LogLevel = Field("INFO", alias="LOG_LEVEL")

    mongo_uri: str = Field(..., alias="MONGO_URI")
    mongo_db_name: str = Field("clinly", alias="MONGO_DB_NAME")
    mongo_connect_timeout_ms: int = Field(3000, alias="MONGO_CONNECT_TIMEOUT_MS")
    mongo_server_selection_timeout_ms: int = Field(
        3000,
        alias="MONGO_SERVER_SELECTION_TIMEOUT_MS",
    )

    jwt_secret: str | None = Field(default=None, alias="JWT_SECRET")
    message_encryption_key: str = Field(..., alias="MESSAGE_ENCRYPTION_KEY")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the cached, validated settings instance."""
    return Settings()
