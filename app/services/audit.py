from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import Request
from pymongo.database import Database

_ALLOWED_METADATA_KEYS = {"reason", "route"}


def log_audit_event(
    database: Database,
    *,
    action: str,
    success: bool,
    actor_user_id: str | None = None,
    subject_user_id: str | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    request: Request | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Insert an append-only audit event.

    This module intentionally exposes no update or delete operation. Metadata
    is allowlisted so callers cannot accidentally persist message bodies,
    passwords, tokens, or other PHI-bearing request data.
    """
    safe_metadata = {
        key: value
        for key, value in (metadata or {}).items()
        if key in _ALLOWED_METADATA_KEYS
    }

    ip_address = None
    user_agent = None
    if request is not None:
        if request.client is not None:
            ip_address = request.client.host
        user_agent = request.headers.get("user-agent")

    event = {
        "timestamp": datetime.now(timezone.utc),
        "actor_user_id": actor_user_id,
        "subject_user_id": subject_user_id,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "success": success,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "metadata": safe_metadata,
    }
    database.audit_events.insert_one(event)
