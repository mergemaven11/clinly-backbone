"""Document this first-party Python module."""
from __future__ import annotations

from typing import Any, NoReturn

from bson import ObjectId
from fastapi import HTTPException, Request, status
from pymongo.database import Database

from app.models.users import UserRole
from app.services.audit import log_audit_event

# V2 presentation/API vocabulary is provider/participant. V1 storage remains
# THERAPIST/CLIENT until a separately tested data migration is warranted.
_PROVIDER_ROLE_VALUES = {UserRole.THERAPIST.value, "PROVIDER"}
_PARTICIPANT_ROLE_VALUES = {UserRole.CLIENT.value, "PARTICIPANT"}


def is_provider_role(role: str | None) -> bool:
    """Handle is provider role.

    Args:
        role: Function argument.

    Returns:
        Function result.
    """
    return role in _PROVIDER_ROLE_VALUES


def is_participant_role(role: str | None) -> bool:
    """Handle is participant role.

    Args:
        role: Function argument.

    Returns:
        Function result.
    """
    return role in _PARTICIPANT_ROLE_VALUES


def _deny(
    database: Database,
    *,
    current_user: dict[str, Any],
    request: Request,
    resource_type: str,
    resource_id: str | None = None,
    reason: str = "not_found_or_not_owned",
    status_code: int = status.HTTP_404_NOT_FOUND,
) -> NoReturn:
    """Audit and return a resource-safe authorization denial."""
    log_audit_event(
        database,
        action="AUTHZ_DENIED",
        success=False,
        actor_user_id=str(current_user["_id"]),
        resource_type=resource_type,
        resource_id=resource_id,
        request=request,
        metadata={"reason": reason, "route": request.url.path},
    )
    detail = "Resource not found" if status_code == 404 else "Access denied"
    raise HTTPException(status_code=status_code, detail=detail)


def require_provider(
    database: Database,
    *,
    current_user: dict[str, Any],
    request: Request,
) -> None:
    """Require the authenticated user to hold a provider-compatible role."""
    if not is_provider_role(current_user.get("role")):
        _deny(
            database,
            current_user=current_user,
            request=request,
            resource_type="role",
            reason="provider_required",
            status_code=status.HTTP_403_FORBIDDEN,
        )


def require_therapist(
    database: Database,
    *,
    current_user: dict[str, Any],
    request: Request,
) -> None:
    """Backward-compatible V1 alias for require_provider."""
    require_provider(database, current_user=current_user, request=request)


def authorize_subject_participant_access(
    database: Database,
    *,
    subject_user_id: str,
    provider_user: dict[str, Any],
    request: Request,
) -> dict[str, Any]:
    """Return an owned participant without revealing whether foreign IDs exist."""
    require_provider(database, current_user=provider_user, request=request)

    safe_resource_id = subject_user_id if ObjectId.is_valid(subject_user_id) else None
    if not ObjectId.is_valid(subject_user_id):
        _deny(
            database,
            current_user=provider_user,
            request=request,
            resource_type="user",
            resource_id=safe_resource_id,
        )

    participant = database.users.find_one(
        {
            "_id": ObjectId(subject_user_id),
            "role": {"$in": list(_PARTICIPANT_ROLE_VALUES)},
            "therapist_id": provider_user["_id"],
            "is_active": True,
        }
    )
    if participant is None:
        _deny(
            database,
            current_user=provider_user,
            request=request,
            resource_type="user",
            resource_id=safe_resource_id,
        )
    return participant


def authorize_subject_client_access(
    database: Database,
    *,
    subject_user_id: str,
    therapist_user: dict[str, Any],
    request: Request,
) -> dict[str, Any]:
    """Backward-compatible V1 alias for participant ownership authorization."""
    return authorize_subject_participant_access(
        database,
        subject_user_id=subject_user_id,
        provider_user=therapist_user,
        request=request,
    )


def authorize_conversation_access(
    database: Database,
    *,
    conversation_id: str,
    current_user: dict[str, Any],
    request: Request,
) -> dict[str, Any]:
    """Authorize a conversation participant before protected content is accessed."""
    safe_resource_id = conversation_id if ObjectId.is_valid(conversation_id) else None
    if not ObjectId.is_valid(conversation_id):
        _deny(
            database,
            current_user=current_user,
            request=request,
            resource_type="conversation",
            resource_id=safe_resource_id,
        )

    conversation = database.conversations.find_one({"_id": ObjectId(conversation_id)})
    if conversation is None:
        _deny(
            database,
            current_user=current_user,
            request=request,
            resource_type="conversation",
            resource_id=safe_resource_id,
        )

    user_id = current_user["_id"]
    role = current_user.get("role")
    authorized = (
        is_provider_role(role) and conversation["therapist_id"] == user_id
    ) or (
        is_participant_role(role) and conversation["client_id"] == user_id
    )

    if not authorized:
        _deny(
            database,
            current_user=current_user,
            request=request,
            resource_type="conversation",
            resource_id=safe_resource_id,
        )
    return conversation


def authorize_track_access(
    database: Database,
    *,
    track_id: str,
    current_user: dict[str, Any],
    request: Request,
) -> dict[str, Any]:
    """Authorize a relationship participant before decrypting track data."""
    safe_resource_id = track_id if ObjectId.is_valid(track_id) else None
    if not ObjectId.is_valid(track_id):
        _deny(
            database,
            current_user=current_user,
            request=request,
            resource_type="portal_track",
            resource_id=safe_resource_id,
        )

    track = database.portal_tracks.find_one({"_id": ObjectId(track_id)})
    if track is None:
        _deny(
            database,
            current_user=current_user,
            request=request,
            resource_type="portal_track",
            resource_id=safe_resource_id,
        )

    user_id = current_user["_id"]
    role = current_user.get("role")
    authorized = (
        is_provider_role(role) and track["professional_user_id"] == user_id
    ) or (
        is_participant_role(role) and track["client_user_id"] == user_id
    )

    if not authorized:
        _deny(
            database,
            current_user=current_user,
            request=request,
            resource_type="portal_track",
            resource_id=safe_resource_id,
        )
    return track
