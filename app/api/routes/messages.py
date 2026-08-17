from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query, Request, status
from pymongo.database import Database

from app.api.dependencies import get_current_user, get_database
from app.models.messaging import MessageCreate, MessageResponse
from app.services.audit import log_audit_event
from app.services.authorization import authorize_conversation_access
from app.services.encryption import MessageCipher

router = APIRouter(prefix="/messages", tags=["messages"])


def _serialize_message(
    message: dict[str, Any],
    *,
    cipher: MessageCipher,
) -> MessageResponse:
    return MessageResponse(
        id=str(message["_id"]),
        conversation_id=str(message["conversation_id"]),
        sender_user_id=str(message["sender_user_id"]),
        plaintext_body=cipher.decrypt(message["ciphertext"]),
        created_at=message["created_at"],
    )


@router.post(
    "",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send an encrypted message in an authorized conversation",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        404: {"description": "Conversation is not found or not accessible"},
        422: {"description": "Request validation failed"},
    },
)
def send_message(
    payload: MessageCreate,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> MessageResponse:
    conversation = authorize_conversation_access(
        database,
        conversation_id=payload.conversation_id,
        current_user=current_user,
        request=request,
    )

    cipher: MessageCipher = request.app.state.message_cipher
    message: dict[str, Any] = {
        "conversation_id": conversation["_id"],
        "sender_user_id": current_user["_id"],
        "ciphertext": cipher.encrypt(payload.plaintext_body),
        "created_at": datetime.now(timezone.utc),
    }
    result = database.messages.insert_one(message)
    message["_id"] = result.inserted_id

    subject_user_id = (
        conversation["client_id"]
        if current_user["_id"] == conversation["therapist_id"]
        else conversation["therapist_id"]
    )
    log_audit_event(
        database,
        action="MESSAGE_SENT",
        success=True,
        actor_user_id=str(current_user["_id"]),
        subject_user_id=str(subject_user_id),
        resource_type="message",
        resource_id=str(result.inserted_id),
        request=request,
    )
    return _serialize_message(message, cipher=cipher)


@router.get(
    "",
    response_model=list[MessageResponse],
    summary="List messages in an authorized conversation",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        404: {"description": "Conversation is not found or not accessible"},
        422: {"description": "Query validation failed"},
    },
)
def list_messages(
    request: Request,
    conversation_id: str = Query(..., min_length=1, max_length=64),
    limit: int = Query(100, ge=1, le=500),
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[MessageResponse]:
    conversation = authorize_conversation_access(
        database,
        conversation_id=conversation_id,
        current_user=current_user,
        request=request,
    )

    cursor = (
        database.messages.find({"conversation_id": conversation["_id"]})
        .sort("created_at", 1)
        .limit(limit)
    )
    stored_messages = list(cursor)

    log_audit_event(
        database,
        action="MESSAGE_LISTED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        resource_type="conversation",
        resource_id=conversation_id,
        request=request,
    )

    cipher: MessageCipher = request.app.state.message_cipher
    return [_serialize_message(message, cipher=cipher) for message in stored_messages]
