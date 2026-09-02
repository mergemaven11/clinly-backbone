"""Document this first-party Python module."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AuditEventResponse(BaseModel):
    """Represent AuditEventResponse."""
    id: str
    timestamp: datetime
    actor_user_id: str | None = None
    subject_user_id: str | None = None
    action: str
    resource_type: str | None = None
    resource_id: str | None = None
    success: bool
    ip_address: str | None = None
    user_agent: str | None = None
    metadata: dict[str, Any]
