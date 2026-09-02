"""Document this first-party Python module."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.api.dependencies import get_current_user, get_database
from app.models.messaging import ConversationCreate, ConversationResponse
from app.models.users import UserRole
from app.services.audit import log_audit_event
from app.services.authorization import authorize_subject_client_access, require_therapist

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _serialize_conversation(conversation: dict[str, Any]) -> ConversationResponse:
    """Handle serialize conversation.

    Args:
        conversation: Function argument.

    Returns:
        Function result.
    """
    return ConversationResponse(
        id=str(conversation["_id"]),
        therapist_id=str(conversation["therapist_id"]),
        client_id=str(conversation["client_id"]),
        created_at=conversation["created_at"],
    )


@router.post(
    "",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a therapist-client conversation",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Therapist role is required"},
        404: {"description": "Client is not found or not owned by the therapist"},
        409: {"description": "Conversation already exists"},
        422: {"description": "Request validation failed"},
    },
)
def create_conversation(
    payload: ConversationCreate,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ConversationResponse:
    """Handle create conversation.

    Args:
        payload: Function argument.
        request: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    require_therapist(database, current_user=current_user, request=request)
    client = authorize_subject_client_access(
        database,
        subject_user_id=payload.client_id,
        therapist_user=current_user,
        request=request,
    )

    conversation: dict[str, Any] = {
        "therapist_id": current_user["_id"],
        "client_id": client["_id"],
        "created_at": datetime.now(timezone.utc),
    }
    try:
        result = database.conversations.insert_one(conversation)
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conversation already exists",
        ) from exc

    conversation["_id"] = result.inserted_id
    conversation_id = str(result.inserted_id)
    log_audit_event(
        database,
        action="CONVERSATION_CREATED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        subject_user_id=str(client["_id"]),
        resource_type="conversation",
        resource_id=conversation_id,
        request=request,
    )
    return _serialize_conversation(conversation)


@router.get(
    "/me",
    response_model=list[ConversationResponse],
    summary="List conversations for the authenticated participant",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Authenticated role cannot access conversations"},
    },
)
def list_my_conversations(
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[ConversationResponse]:
    """Handle list my conversations.

    Args:
        request: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    role = current_user.get("role")
    if role == UserRole.THERAPIST.value:
        query = {"therapist_id": current_user["_id"]}
    elif role == UserRole.CLIENT.value:
        query = {"client_id": current_user["_id"]}
    else:
        log_audit_event(
            database,
            action="AUTHZ_DENIED",
            success=False,
            actor_user_id=str(current_user["_id"]),
            resource_type="conversation",
            request=request,
            metadata={"reason": "unsupported_role", "route": request.url.path},
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    conversations = list(database.conversations.find(query).sort("created_at", 1))
    log_audit_event(
        database,
        action="CONVERSATION_LISTED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        resource_type="conversation",
        request=request,
    )
    return [_serialize_conversation(item) for item in conversations]
