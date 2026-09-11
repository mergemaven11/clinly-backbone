"""FastAPI dependencies shared across authenticated routes."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from pymongo.database import Database

from app.core.config import get_settings
from app.services.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_database(request: Request) -> Database:
    """Return the request-scoped application database handle."""
    return request.app.state.mongo.db()


def _unauthorized(detail: str = "Invalid or expired token") -> HTTPException:
    """Build the uniform bearer-token authentication failure response."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    database: Database = Depends(get_database),
) -> dict[str, Any]:
    """Authenticate a bearer token and require an active server-side session."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized("Not authenticated")

    secret = get_settings().jwt_secret.get_secret_value()
    try:
        payload = decode_access_token(credentials.credentials, secret=secret)
        user_id = payload["sub"]
        session_id = payload["jti"]
        if not ObjectId.is_valid(user_id) or not isinstance(session_id, str):
            raise InvalidTokenError("invalid token claims")
    except InvalidTokenError as exc:
        raise _unauthorized() from exc

    object_user_id = ObjectId(user_id)
    now = datetime.now(timezone.utc)
    session = database.auth_sessions.find_one(
        {
            "_id": session_id,
            "user_id": object_user_id,
            "revoked_at": None,
            "expires_at": {"$gt": now},
        }
    )
    if session is None:
        raise _unauthorized()

    user = database.users.find_one({"_id": object_user_id})
    if user is None:
        raise _unauthorized()
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled",
        )

    request.state.actor_user_id = user_id
    request.state.auth_session_id = session_id
    return user
