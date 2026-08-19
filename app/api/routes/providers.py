from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request, status
from pymongo.database import Database

from app.api.dependencies import get_current_user, get_database
from app.api.routes.auth import _insert_user, _serialize_user
from app.models.users import (
    ParticipantCreate,
    ProviderSignup,
    UserResponse,
    UserRole,
)
from app.services.audit import log_audit_event
from app.services.authorization import require_provider

router = APIRouter(tags=["providers"])


@router.post(
    "/auth/signup-provider",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a provider account",
    responses={
        409: {"description": "Email is already registered"},
        422: {"description": "Request validation failed"},
    },
)
def signup_provider(
    payload: ProviderSignup,
    request: Request,
    database: Database = Depends(get_database),
) -> UserResponse:
    """V2 provider vocabulary backed by the legacy THERAPIST storage role."""
    user = _insert_user(
        database,
        email=payload.email,
        password=payload.password,
        role=UserRole.THERAPIST,
    )
    user_id = str(user["_id"])
    log_audit_event(
        database,
        action="USER_CREATED",
        success=True,
        actor_user_id=user_id,
        subject_user_id=user_id,
        resource_type="user",
        resource_id=user_id,
        request=request,
    )
    return _serialize_user(user)


@router.post(
    "/auth/create-participant",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a participant owned by the authenticated provider",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Provider role is required"},
        409: {"description": "Email is already registered"},
        422: {"description": "Request validation failed"},
    },
)
def create_participant(
    payload: ParticipantCreate,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> UserResponse:
    require_provider(database, current_user=current_user, request=request)
    participant = _insert_user(
        database,
        email=payload.email,
        password=payload.password,
        role=UserRole.CLIENT,
        therapist_id=current_user["_id"],
    )
    participant_id = str(participant["_id"])
    log_audit_event(
        database,
        action="PARTICIPANT_CREATED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        subject_user_id=participant_id,
        resource_type="user",
        resource_id=participant_id,
        request=request,
    )
    return _serialize_user(participant)


@router.get(
    "/participants",
    response_model=list[UserResponse],
    summary="List active participants owned by the authenticated provider",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Provider role is required"},
    },
)
def list_participants(
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[UserResponse]:
    require_provider(database, current_user=current_user, request=request)
    participants = list(
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
        action="PARTICIPANT_LISTED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        resource_type="user",
        request=request,
    )
    return [_serialize_user(participant) for participant in participants]
