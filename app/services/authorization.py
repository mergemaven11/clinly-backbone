from __future__ import annotations

from typing import Any, NoReturn

from bson import ObjectId
from fastapi import HTTPException, Request, status
from pymongo.database import Database

from app.models.users import UserRole
from app.services.audit import log_audit_event


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


def require_therapist(
    database: Database,
    *,
    current_user: dict[str, Any],
    request: Request,
) -> None:
    """Require the authenticated user to have the therapist role."""
    if current_user.get("role") != UserRole.THERAPIST.value:
        _deny(
            database,
            current_user=current_user,
            request=request,
            resource_type="role",
            reason="therapist_required",
            status_code=status.HTTP_403_FORBIDDEN,
        )


def authorize_subject_client_access(
    database: Database,
    *,
    subject_user_id: str,
    therapist_user: dict[str, Any],
    request: Request,
) -> dict[str, Any]:
    """Return an owned client without revealing whether foreign IDs exist."""
    require_therapist(database, current_user=therapist_user, request=request)

    safe_resource_id = subject_user_id if ObjectId.is_valid(subject_user_id) else None
    if not ObjectId.is_valid(subject_user_id):
        _deny(
            database,
            current_user=therapist_user,
            request=request,
            resource_type="user",
            resource_id=safe_resource_id,
        )

    client = database.users.find_one(
        {
            "_id": ObjectId(subject_user_id),
            "role": UserRole.CLIENT.value,
            "therapist_id": therapist_user["_id"],
            "is_active": True,
        }
    )
    if client is None:
        _deny(
            database,
            current_user=therapist_user,
            request=request,
            resource_type="user",
            resource_id=safe_resource_id,
        )
    return client


def authorize_conversation_access(
    database: Database,
    *,
    conversation_id: str,
    current_user: dict[str, Any],
    request: Request,
) -> dict[str, Any]:
    """Authorize a conversation participant before any PHI is accessed."""
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
        role == UserRole.THERAPIST.value and conversation["therapist_id"] == user_id
    ) or (role == UserRole.CLIENT.value and conversation["client_id"] == user_id)

    if not authorized:
        _deny(
            database,
            current_user=current_user,
            request=request,
            resource_type="conversation",
            resource_id=safe_resource_id,
        )
    return conversation
