from __future__ import annotations

import json
from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field, field_validator


class PortalTrackKind(StrEnum):
    CARE = "CARE"
    FITNESS = "FITNESS"
    LASER_HAIR_REMOVAL = "LASER_HAIR_REMOVAL"
    GENERAL = "GENERAL"


class PortalTrackCreate(BaseModel):
    client_id: str = Field(min_length=1, max_length=64)
    kind: PortalTrackKind
    title: str = Field(min_length=2, max_length=120)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("title cannot be blank")
        return normalized


class PortalTrackResponse(BaseModel):
    id: str
    professional_user_id: str
    client_user_id: str
    kind: PortalTrackKind
    title: str
    created_at: datetime


class PortalEntryCreate(BaseModel):
    track_id: str = Field(min_length=1, max_length=64)
    entry_type: str = Field(min_length=2, max_length=64)
    payload: dict[str, Any]

    @field_validator("entry_type")
    @classmethod
    def normalize_entry_type(cls, value: str) -> str:
        normalized = value.strip().upper().replace(" ", "_")
        if not normalized:
            raise ValueError("entry type cannot be blank")
        return normalized

    @field_validator("payload")
    @classmethod
    def validate_payload(cls, value: dict[str, Any]) -> dict[str, Any]:
        if not value:
            raise ValueError("payload cannot be empty")
        if len(value) > 40:
            raise ValueError("payload contains too many fields")
        encoded = json.dumps(
            value,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        ).encode("utf-8")
        if len(encoded) > 20_000:
            raise ValueError("payload is too large")
        return value


class PortalEntryResponse(BaseModel):
    id: str
    track_id: str
    author_user_id: str
    entry_type: str
    payload: dict[str, Any]
    created_at: datetime
