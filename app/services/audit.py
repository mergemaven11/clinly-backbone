"""Append-only audit logging helpers for security-sensitive Clinly actions.

Audit records intentionally retain only a narrow set of metadata. Callers
should never place message bodies, credentials, tokens, journal contents, or
other PHI-bearing request data into audit metadata.
"""

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
    """Insert an append-only, privacy-conscious audit event.

    The function records security-relevant context without exposing an update
    or delete path. Metadata is allowlisted so callers cannot accidentally
    persist sensitive request content. When an HTTP request is supplied, the
    client IP address and user agent are captured for operational auditing.

    Args:
        database: MongoDB database containing the ``audit_events`` collection.
        action: Stable event name describing the attempted operation.
        success: Whether the audited operation completed successfully.
        actor_user_id: Identifier of the user who initiated the operation.
        subject_user_id: Identifier of the user affected by the operation.
        resource_type: Logical resource category, such as ``portal_entry``.
        resource_id: Identifier of the affected resource when available.
        request: Optional FastAPI request used to capture network context.
        metadata: Optional supplementary metadata. Only explicitly allowlisted
            keys are persisted.

    Returns:
        None.

    Note:
        This helper does not redact arbitrary metadata values. Safety depends on
        keeping ``_ALLOWED_METADATA_KEYS`` narrow and avoiding sensitive data in
        approved fields.
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
