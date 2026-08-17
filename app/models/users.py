from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field, field_validator


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
