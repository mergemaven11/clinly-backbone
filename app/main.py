from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes.audit import router as audit_router
from app.api.routes.auth import router as auth_router
from app.api.routes.conversations import router as conversations_router
from app.api.routes.integrations import router as integrations_router
from app.api.routes.messages import router as messages_router
from app.api.routes.portal import router as portal_router
from app.api.routes.providers import router as providers_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.mongo import MongoConnector
from app.services.encryption import MessageCipher
from app.services.rate_limit import LoginRateLimiter

logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialize required dependencies and fail fast on unsafe configuration."""
    settings = get_settings()
    configure_logging(settings.log_level, settings.app_env)

    mongo = MongoConnector(
        uri=settings.mongo_uri,
        db_name=settings.mongo_db_name,
        connect_timeout_ms=settings.mongo_connect_timeout_ms,
        server_selection_timeout_ms=settings.mongo_server_selection_timeout_ms,
    )
    message_cipher = MessageCipher(settings.message_encryption_key.get_secret_value())
    login_rate_limiter = LoginRateLimiter(
        identity_max_attempts=settings.login_rate_limit_max_attempts,
        ip_max_attempts=settings.login_rate_limit_ip_max_attempts,
        window_seconds=settings.login_rate_limit_window_seconds,
    )

    app.state.settings = settings
    app.state.mongo = mongo
    app.state.message_cipher = message_cipher
    app.state.login_rate_limiter = login_rate_limiter

    mongo.connect()
    mongo.ping()
    mongo.init_indexes()
    logger.info("startup_complete")

    try:
        yield
    finally:
        mongo.close()
        logger.info("shutdown_complete")


settings = get_settings()

app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description=(
        "Provider-platform API for authenticated relationships, encrypted messaging "
        "and progress data, provider operations, and integration-ready services. "
        "Legacy V1 clinical vocabulary remains available for backward compatibility."
    ),
    lifespan=lifespan,
)

if settings.cors_allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )

app.include_router(auth_router)
app.include_router(providers_router)
app.include_router(conversations_router)
app.include_router(messages_router)
app.include_router(portal_router)
app.include_router(integrations_router)
app.include_router(audit_router)


def _request_id(request: Request) -> str:
    supplied = request.headers.get("X-Request-ID", "").strip()
    if supplied and len(supplied) <= 128:
        return supplied
    return str(uuid.uuid4())


@app.middleware("http")
async def request_log_middleware(request: Request, call_next):
    """Log an allowlisted request envelope; never bodies or query parameters."""
    started = time.perf_counter()
    request_id = _request_id(request)
    request.state.request_id = request_id

    try:
        response = await call_next(request)
    except Exception:
        elapsed_ms = round((time.perf_counter() - started) * 1000, 1)
        logger.error(
            "request_failed",
            extra={
                "request_id": request_id,
                "actor_user_id": getattr(request.state, "actor_user_id", None),
                "method": request.method,
                "route": request.url.path,
                "status_code": 500,
                "latency_ms": elapsed_ms,
            },
        )
        response = JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Internal server error",
                }
            },
        )

    response.headers["X-Request-ID"] = request_id
    elapsed_ms = round((time.perf_counter() - started) * 1000, 1)
    logger.info(
        "request_complete",
        extra={
            "request_id": request_id,
            "actor_user_id": getattr(request.state, "actor_user_id", None),
            "method": request.method,
            "route": request.url.path,
            "status_code": response.status_code,
            "latency_ms": elapsed_ms,
        },
    )
    return response


@app.get(
    "/health",
    summary="Liveness check",
    responses={200: {"description": "API process is running"}},
)
def health() -> dict[str, str]:
    """Liveness check: the API process is running."""
    return {"status": "ok"}


@app.get(
    "/ready",
    summary="Dependency readiness check",
    responses={
        200: {"description": "Required dependencies are reachable"},
        503: {"description": "MongoDB is unavailable"},
    },
)
def ready(request: Request) -> dict[str, str]:
    """Readiness check: return 503 while MongoDB is unavailable."""
    mongo: MongoConnector = request.app.state.mongo
    try:
        mongo.ping()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service not ready",
        ) from exc
    return {"status": "ready"}
