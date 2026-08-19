from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field, field_validator

BCRYPT_MAX_PASSWORD_BYTES = 72


class UserRole(StrEnum):
    # Legacy storage values retained for V1 data/API compatibility. V2 exposes
    # provider/participant endpoint vocabulary without rewriting stored roles.
    THERAPIST = "THERAPIST"
    CLIENT = "CLIENT"


class PlatformRole(StrEnum):
    PROVIDER = "PROVIDER"
    PARTICIPANT = "PARTICIPANT"


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
            raise ValueError("invalid email address")
        return normalized

    @field_validator("password")
    @classmethod
    def validate_bcrypt_password_length(cls, value: str) -> str:
        if len(value.encode("utf-8")) > BCRYPT_MAX_PASSWORD_BYTES:
            raise ValueError("password must be at most 72 UTF-8 bytes")
        return value


class ProviderSignup(Credentials):
    pass


class ParticipantCreate(Credentials):
    pass


class TherapistSignup(ProviderSignup):
    """Backward-compatible V1 request model."""


class ClientCreate(ParticipantCreate):
    """Backward-compatible V1 request model."""


class LoginRequest(Credentials):
    pass


class UserResponse(BaseModel):
    id: str
    email: str
    role: UserRole
    therapist_id: str | None = None
    is_active: bool


class PlatformUserResponse(BaseModel):
    id: str
    email: str
    role: PlatformRole
    provider_id: str | None = None
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
