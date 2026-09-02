"""Document this first-party Python module."""
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
from app.services.rate_limit import LoginRateLimiter
from app.services.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


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


def _insert_user(
    database: Database,
    *,
    email: str,
    password: str,
    role: UserRole,
    therapist_id: ObjectId | None = None,
) -> dict[str, Any]:
    """Handle insert user.

    Args:
        database: Function argument.
        email: Function argument.
        password: Function argument.
        role: Function argument.
        therapist_id: Function argument.

    Returns:
        Function result.
    """
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


def _client_ip(request: Request) -> str:
    """Handle client ip.

    Args:
        request: Function argument.

    Returns:
        Function result.
    """
    if request.client is None:
        return "unknown"
    return request.client.host


@router.post(
    "/signup-therapist",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a therapist account",
    responses={
        409: {"description": "Email is already registered"},
        422: {"description": "Request validation failed"},
    },
)
def signup_therapist(
    payload: TherapistSignup,
    request: Request,
    database: Database = Depends(get_database),
) -> UserResponse:
    """Handle signup therapist.

    Args:
        payload: Function argument.
        request: Function argument.
        database: Function argument.

    Returns:
        Function result.
    """
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
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and issue an access token",
    responses={
        401: {"description": "Invalid credentials"},
        403: {"description": "Account is disabled"},
        422: {"description": "Request validation failed"},
        429: {"description": "Too many login attempts"},
    },
)
def login(
    payload: LoginRequest,
    request: Request,
    database: Database = Depends(get_database),
) -> TokenResponse:
    """Handle login.

    Args:
        payload: Function argument.
        request: Function argument.
        database: Function argument.

    Returns:
        Function result.
    """
    limiter: LoginRateLimiter = request.app.state.login_rate_limiter
    ip_address = _client_ip(request)
    decision = limiter.check(email=payload.email, ip_address=ip_address)
    if not decision.allowed:
        log_audit_event(
            database,
            action="LOGIN_FAILURE",
            success=False,
            request=request,
            metadata={"reason": "rate_limited", "route": "/auth/login"},
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts",
            headers={"Retry-After": str(decision.retry_after_seconds)},
        )

    user = database.users.find_one({"email": payload.email})
    if user is None or not verify_password(payload.password, user["password_hash"]):
        limiter.record_failure(email=payload.email, ip_address=ip_address)
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
        limiter.record_failure(email=payload.email, ip_address=ip_address)
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
    access_token = create_access_token(
        subject=user_id,
        role=user["role"],
        secret=settings.jwt_secret.get_secret_value(),
        expires_minutes=settings.jwt_access_token_minutes,
    )
    limiter.reset_identity(email=payload.email)
    request.state.actor_user_id = user_id
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
        expires_in=settings.jwt_access_token_minutes * 60,
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Return the authenticated user",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Account is disabled"},
    },
)
def me(current_user: dict[str, Any] = Depends(get_current_user)) -> UserResponse:
    """Handle me.

    Args:
        current_user: Function argument.

    Returns:
        Function result.
    """
    return _serialize_user(current_user)


@router.post(
    "/create-client",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a client owned by the authenticated therapist",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Therapist role is required"},
        409: {"description": "Email is already registered"},
        422: {"description": "Request validation failed"},
    },
)
def create_client(
    payload: ClientCreate,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> UserResponse:
    """Handle create client.

    Args:
        payload: Function argument.
        request: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
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
