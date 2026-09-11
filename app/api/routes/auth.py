"""Authentication and legacy account routes."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.api.dependencies import get_current_user, get_database
from app.core.config import Settings, get_settings
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
    """Serialize a stored user to the legacy public response model."""
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
    """Insert one user with a freshly hashed password."""
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
    """Return the source address visible to the application server."""
    if request.client is None:
        return "unknown"
    return request.client.host


def _issue_session(
    database: Database,
    *,
    user: dict[str, Any],
    settings: Settings,
) -> str:
    """Create a server-side session record and its signed bearer token."""
    created_at = datetime.now(timezone.utc)
    expires_at = created_at + timedelta(minutes=settings.jwt_access_token_minutes)
    session_id = str(uuid4())
    access_token = create_access_token(
        subject=str(user["_id"]),
        role=user["role"],
        secret=settings.jwt_secret.get_secret_value(),
        expires_minutes=settings.jwt_access_token_minutes,
        session_id=session_id,
    )
    database.auth_sessions.insert_one(
        {
            "_id": session_id,
            "user_id": user["_id"],
            "created_at": created_at,
            "expires_at": expires_at,
            "revoked_at": None,
        }
    )
    return access_token


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
    """Create a legacy therapist account."""
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
    """Authenticate credentials and create a revocable server-side session."""
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
    access_token = _issue_session(database, user=user, settings=settings)
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


@router.post(
    "/logout",
    summary="Revoke the current authenticated session",
    responses={401: {"description": "Missing, invalid, expired, or revoked token"}},
)
def logout(
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    """Immediately revoke the caller's active bearer-token session."""
    session_id = request.state.auth_session_id
    revoked_at = datetime.now(timezone.utc)
    database.auth_sessions.update_one(
        {"_id": session_id, "user_id": current_user["_id"], "revoked_at": None},
        {"$set": {"revoked_at": revoked_at}},
    )
    actor_id = str(current_user["_id"])
    log_audit_event(
        database,
        action="LOGOUT",
        success=True,
        actor_user_id=actor_id,
        subject_user_id=actor_id,
        resource_type="auth_session",
        resource_id=session_id,
        request=request,
    )
    return {"status": "signed_out"}


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Return the authenticated user",
    responses={
        401: {"description": "Missing, invalid, expired, or revoked access token"},
        403: {"description": "Account is disabled"},
    },
)
def me(current_user: dict[str, Any] = Depends(get_current_user)) -> UserResponse:
    """Return the authenticated legacy user."""
    return _serialize_user(current_user)


@router.post(
    "/create-client",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a client owned by the authenticated therapist",
    responses={
        401: {"description": "Missing, invalid, expired, or revoked access token"},
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
    """Create a client owned by the authenticated therapist."""
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
