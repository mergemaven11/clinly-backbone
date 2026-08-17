from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.api.dependencies import get_current_user, get_database
from app.core.config import get_settings
from app.models.users import (
    ClientCreate,
    LoginRequest,
    TherapistSignup,
    TokenResponse,
    UserResponse,
    UserRole,
)
from app.services.audit import log_audit_event
from app.services.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
ACCESS_TOKEN_MINUTES = 60


def _serialize_user(user: dict[str, Any]) -> UserResponse:
    therapist_id = user.get("therapist_id")
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        role=UserRole(user["role"]),
        therapist_id=str(therapist_id) if therapist_id else None,
        is_active=user.get("is_active", True),
    )


def _insert_user(
    database: Database,
    *,
    email: str,
    password: str,
    role: UserRole,
    therapist_id: ObjectId | None = None,
) -> dict[str, Any]:
    document: dict[str, Any] = {
        "email": email,
        "password_hash": hash_password(password),
        "role": role.value,
        "therapist_id": therapist_id,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }
    try:
        result = database.users.insert_one(document)
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        ) from exc

    document["_id"] = result.inserted_id
    return document


@router.post(
    "/signup-therapist",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def signup_therapist(
    payload: TherapistSignup,
    request: Request,
    database: Database = Depends(get_database),
) -> UserResponse:
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


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    database: Database = Depends(get_database),
) -> TokenResponse:
    user = database.users.find_one({"email": payload.email})
    if user is None or not verify_password(payload.password, user["password_hash"]):
        log_audit_event(
            database,
            action="LOGIN_FAILURE",
            success=False,
            request=request,
            metadata={"reason": "invalid_credentials", "route": "/auth/login"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    user_id = str(user["_id"])
    if not user.get("is_active", True):
        log_audit_event(
            database,
            action="LOGIN_FAILURE",
            success=False,
            actor_user_id=user_id,
            request=request,
            metadata={"reason": "disabled_account", "route": "/auth/login"},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled",
        )

    settings = get_settings()
    if not settings.jwt_secret:
        raise RuntimeError("JWT_SECRET must be configured before authentication is used")

    access_token = create_access_token(
        subject=user_id,
        role=user["role"],
        secret=settings.jwt_secret,
        expires_minutes=ACCESS_TOKEN_MINUTES,
    )
    log_audit_event(
        database,
        action="LOGIN_SUCCESS",
        success=True,
        actor_user_id=user_id,
        resource_type="user",
        resource_id=user_id,
        request=request,
    )
    return TokenResponse(
        access_token=access_token,
        expires_in=ACCESS_TOKEN_MINUTES * 60,
    )


@router.get("/me", response_model=UserResponse)
def me(current_user: dict[str, Any] = Depends(get_current_user)) -> UserResponse:
    return _serialize_user(current_user)


@router.post(
    "/create-client",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_client(
    payload: ClientCreate,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> UserResponse:
    actor_id = str(current_user["_id"])
    if current_user["role"] != UserRole.THERAPIST.value:
        log_audit_event(
            database,
            action="AUTHZ_DENIED",
            success=False,
            actor_user_id=actor_id,
            resource_type="user",
            request=request,
            metadata={
                "reason": "therapist_required",
                "route": "/auth/create-client",
            },
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Therapist role required",
        )

    client = _insert_user(
        database,
        email=payload.email,
        password=payload.password,
        role=UserRole.CLIENT,
        therapist_id=current_user["_id"],
    )
    client_id = str(client["_id"])
    log_audit_event(
        database,
        action="CLIENT_CREATED",
        success=True,
        actor_user_id=actor_id,
        subject_user_id=client_id,
        resource_type="user",
        resource_id=client_id,
        request=request,
    )
    return _serialize_user(client)
