"""Pydantic models for Clinly portal tracks and encrypted progress entries.

These models validate the shape and size of portal data before route handlers
persist encrypted content. They describe transport and validation semantics;
they do not grant access to a client, track, or entry. Authorization is enforced
by the portal route and authorization service layers.
"""

from __future__ import annotations

import json
from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field, field_validator


class PortalTrackKind(StrEnum):
    """Supported relationship-track categories in the client portal."""

    CARE = "CARE"
    FITNESS = "FITNESS"
    LASER_HAIR_REMOVAL = "LASER_HAIR_REMOVAL"
    GENERAL = "GENERAL"


class PortalTrackCreate(BaseModel):
    """Request payload for creating a professional-to-client portal track."""

    client_id: str = Field(min_length=1, max_length=64)
    kind: PortalTrackKind
    title: str = Field(min_length=2, max_length=120)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        """Normalize a portal-track title and reject blank values.

        Args:
            value: User-supplied track title.

        Returns:
            The title with leading and trailing whitespace removed.

        Raises:
            ValueError: If the normalized title is blank.
        """
        normalized = value.strip()
        if not normalized:
            raise ValueError("title cannot be blank")
        return normalized


class PortalTrackResponse(BaseModel):
    """API representation of a portal track visible to an authorized user."""

    id: str
    professional_user_id: str
    client_user_id: str
    kind: PortalTrackKind
    title: str
    created_at: datetime


class PortalEntryCreate(BaseModel):
    """Request payload for adding a journal or progress entry to a portal track.

    The payload is constrained before encryption so unexpectedly large or
    structurally excessive records are rejected early. Privacy and visibility
    decisions are enforced separately by authorization logic.
    """

    track_id: str = Field(min_length=1, max_length=64)
    entry_type: str = Field(min_length=2, max_length=64)
    payload: dict[str, Any]

    @field_validator("entry_type")
    @classmethod
    def normalize_entry_type(cls, value: str) -> str:
        """Normalize entry types to an uppercase underscore-delimited token.

        Args:
            value: User- or client-supplied entry-type label.

        Returns:
            The normalized entry type.

        Raises:
            ValueError: If the normalized entry type is blank.
        """
        normalized = value.strip().upper().replace(" ", "_")
        if not normalized:
            raise ValueError("entry type cannot be blank")
        return normalized

    @field_validator("payload")
    @classmethod
    def validate_payload(cls, value: dict[str, Any]) -> dict[str, Any]:
        """Validate portal-entry payload complexity and serialized size.

        Args:
            value: Structured portal entry data that will later be encrypted.

        Returns:
            The original payload when it satisfies the validation limits.

        Raises:
            ValueError: If the payload is empty, contains more than 40 top-level
                fields, or serializes to more than 20,000 UTF-8 bytes.
        """
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
    """Decrypted portal-entry representation returned after access checks."""

    id: str
    track_id: str
    author_user_id: str
    entry_type: str
    payload: dict[str, Any]
    created_at: datetime
