"""Document this first-party Python module."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query, Request, status
from pymongo.database import Database

from app.api.dependencies import get_current_user, get_database
from app.models.portal import (
    PortalEntryCreate,
    PortalEntryResponse,
    PortalTrackCreate,
    PortalTrackKind,
    PortalTrackResponse,
)
from app.models.users import UserResponse, UserRole
from app.services.audit import log_audit_event
from app.services.authorization import (
    authorize_subject_client_access,
    authorize_track_access,
    require_therapist,
)
from app.services.encryption import MessageCipher

router = APIRouter(tags=["portal"])


def _serialize_user(user: dict[str, Any]) -> UserResponse:
    """Handle serialize user.

    Args:
        user: Function argument.

    Returns:
        Function result.
    """
    therapist_id = user.get("therapist_id")
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        role=UserRole(user["role"]),
        therapist_id=str(therapist_id) if therapist_id else None,
        is_active=user.get("is_active", True),
    )


def _serialize_track(
    track: dict[str, Any],
    *,
    cipher: MessageCipher,
) -> PortalTrackResponse:
    """Handle serialize track.

    Args:
        track: Function argument.
        cipher: Function argument.

    Returns:
        Function result.
    """
    return PortalTrackResponse(
        id=str(track["_id"]),
        professional_user_id=str(track["professional_user_id"]),
        client_user_id=str(track["client_user_id"]),
        kind=PortalTrackKind(track["kind"]),
        title=cipher.decrypt(track["title_ciphertext"]),
        created_at=track["created_at"],
    )


def _serialize_entry(
    entry: dict[str, Any],
    *,
    cipher: MessageCipher,
) -> PortalEntryResponse:
    """Handle serialize entry.

    Args:
        entry: Function argument.
        cipher: Function argument.

    Returns:
        Function result.
    """
    payload = json.loads(cipher.decrypt(entry["ciphertext"]))
    return PortalEntryResponse(
        id=str(entry["_id"]),
        track_id=str(entry["track_id"]),
        author_user_id=str(entry["author_user_id"]),
        entry_type=entry["entry_type"],
        payload=payload,
        created_at=entry["created_at"],
    )


@router.get(
    "/clients",
    response_model=list[UserResponse],
    summary="List active clients owned by the authenticated professional",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Professional role is required"},
    },
)
def list_clients(
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[UserResponse]:
    """Handle list clients.

    Args:
        request: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    require_therapist(database, current_user=current_user, request=request)
    clients = list(
        database.users.find(
            {
                "role": UserRole.CLIENT.value,
                "therapist_id": current_user["_id"],
                "is_active": True,
            }
        ).sort("email", 1)
    )
    log_audit_event(
        database,
        action="CLIENT_LISTED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        resource_type="user",
        request=request,
    )
    return [_serialize_user(client) for client in clients]


@router.post(
    "/portal/tracks",
    response_model=PortalTrackResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a care, fitness, laser, or general relationship track",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Professional role is required"},
        404: {"description": "Client was not found or is not owned"},
        422: {"description": "Request validation failed"},
    },
)
def create_track(
    payload: PortalTrackCreate,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> PortalTrackResponse:
    """Handle create track.

    Args:
        payload: Function argument.
        request: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    client = authorize_subject_client_access(
        database,
        subject_user_id=payload.client_id,
        therapist_user=current_user,
        request=request,
    )
    cipher: MessageCipher = request.app.state.message_cipher
    track: dict[str, Any] = {
        "professional_user_id": current_user["_id"],
        "client_user_id": client["_id"],
        "kind": payload.kind.value,
        "title_ciphertext": cipher.encrypt(payload.title),
        "created_at": datetime.now(timezone.utc),
    }
    result = database.portal_tracks.insert_one(track)
    track["_id"] = result.inserted_id

    log_audit_event(
        database,
        action="PORTAL_TRACK_CREATED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        subject_user_id=str(client["_id"]),
        resource_type="portal_track",
        resource_id=str(result.inserted_id),
        request=request,
        metadata={"kind": payload.kind.value},
    )
    return _serialize_track(track, cipher=cipher)


@router.get(
    "/portal/tracks/me",
    response_model=list[PortalTrackResponse],
    summary="List relationship tracks visible to the authenticated participant",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Unsupported account role"},
    },
)
def list_tracks(
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[PortalTrackResponse]:
    """Handle list tracks.

    Args:
        request: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    role = current_user.get("role")
    if role == UserRole.THERAPIST.value:
        query = {"professional_user_id": current_user["_id"]}
    elif role == UserRole.CLIENT.value:
        query = {"client_user_id": current_user["_id"]}
    else:
        require_therapist(database, current_user=current_user, request=request)
        query = {}

    tracks = list(database.portal_tracks.find(query).sort("created_at", -1))
    log_audit_event(
        database,
        action="PORTAL_TRACK_LISTED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        resource_type="portal_track",
        request=request,
    )
    cipher: MessageCipher = request.app.state.message_cipher
    return [_serialize_track(track, cipher=cipher) for track in tracks]


@router.post(
    "/portal/entries",
    response_model=PortalEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add an encrypted journal or progress entry to a relationship track",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        404: {"description": "Track was not found or is not accessible"},
        422: {"description": "Request validation failed"},
    },
)
def create_entry(
    payload: PortalEntryCreate,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> PortalEntryResponse:
    """Handle create entry.

    Args:
        payload: Function argument.
        request: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    track = authorize_track_access(
        database,
        track_id=payload.track_id,
        current_user=current_user,
        request=request,
    )
    cipher: MessageCipher = request.app.state.message_cipher
    serialized_payload = json.dumps(
        payload.payload,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    entry: dict[str, Any] = {
        "track_id": track["_id"],
        "author_user_id": current_user["_id"],
        "entry_type": payload.entry_type,
        "ciphertext": cipher.encrypt(serialized_payload),
        "created_at": datetime.now(timezone.utc),
    }
    result = database.portal_entries.insert_one(entry)
    entry["_id"] = result.inserted_id

    log_audit_event(
        database,
        action="PORTAL_ENTRY_CREATED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        subject_user_id=str(track["client_user_id"]),
        resource_type="portal_entry",
        resource_id=str(result.inserted_id),
        request=request,
        metadata={"entry_type": payload.entry_type},
    )
    return _serialize_entry(entry, cipher=cipher)


@router.get(
    "/portal/entries",
    response_model=list[PortalEntryResponse],
    summary="List decrypted entries for an accessible relationship track",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        404: {"description": "Track was not found or is not accessible"},
        422: {"description": "Request validation failed"},
    },
)
def list_entries(
    request: Request,
    track_id: str = Query(..., min_length=1, max_length=64),
    limit: int = Query(100, ge=1, le=500),
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[PortalEntryResponse]:
    """Handle list entries.

    Args:
        request: Function argument.
        track_id: Function argument.
        limit: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    track = authorize_track_access(
        database,
        track_id=track_id,
        current_user=current_user,
        request=request,
    )
    entries = list(
        database.portal_entries.find({"track_id": track["_id"]})
        .sort("created_at", -1)
        .limit(limit)
    )
    log_audit_event(
        database,
        action="PORTAL_ENTRY_LISTED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        subject_user_id=str(track["client_user_id"]),
        resource_type="portal_track",
        resource_id=track_id,
        request=request,
    )
    cipher: MessageCipher = request.app.state.message_cipher
    return [_serialize_entry(entry, cipher=cipher) for entry in entries]
