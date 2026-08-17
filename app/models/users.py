from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field, field_validator

BCRYPT_MAX_PASSWORD_BYTES = 72


class UserRole(StrEnum):
    THERAPIST = "THERAPIST"
    CLIENT = "CLIENT"


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


class TherapistSignup(Credentials):
    pass


class ClientCreate(Credentials):
    pass


class LoginRequest(Credentials):
    pass


class UserResponse(BaseModel):
    id: str
    email: str
    role: UserRole
    therapist_id: str | None = None
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
