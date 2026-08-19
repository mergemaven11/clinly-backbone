from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class IntegrationCategory(StrEnum):
    CALENDAR = "CALENDAR"
    VIDEO = "VIDEO"
    PAYMENTS = "PAYMENTS"
    AUTOMATION = "AUTOMATION"
    STORAGE = "STORAGE"
    CRM = "CRM"


class IntegrationAvailability(StrEnum):
    PLANNED = "PLANNED"
    BETA = "BETA"
    AVAILABLE = "AVAILABLE"


class IntegrationEntitlement(StrEnum):
    INCLUDED = "INCLUDED"
    PLAN_GATED = "PLAN_GATED"
    PAID_ADDON = "PAID_ADDON"


class IntegrationSetupType(StrEnum):
    OAUTH2_PKCE = "OAUTH2_PKCE"
    OAUTH2 = "OAUTH2"
    MANAGED = "MANAGED"
    WEBHOOK = "WEBHOOK"


class IntegrationConnectionState(StrEnum):
    AVAILABLE = "AVAILABLE"
    CONNECTING = "CONNECTING"
    CONNECTED = "CONNECTED"
    DEGRADED = "DEGRADED"
    DISCONNECTED = "DISCONNECTED"
    REVOKED = "REVOKED"


class IntegrationDefinition(BaseModel):
    key: str = Field(min_length=2, max_length=64, pattern=r"^[a-z0-9_]+$")
    display_name: str = Field(min_length=2, max_length=100)
    category: IntegrationCategory
    description: str = Field(min_length=1, max_length=500)
    capabilities: list[str]
    availability: IntegrationAvailability
    entitlement: IntegrationEntitlement
    setup_type: IntegrationSetupType


class IntegrationConnectionResponse(BaseModel):
    integration_key: str
    state: IntegrationConnectionState
    connected_at: datetime | None = None
    updated_at: datetime | None = None
    last_sync_at: datetime | None = None
