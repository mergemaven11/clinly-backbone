from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.routes.audit import router as audit_router
from app.api.routes.auth import router as auth_router
from app.api.routes.conversations import router as conversations_router
from app.api.routes.messages import router as messages_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.mongo import MongoConnector
from app.services.encryption import MessageCipher

logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialize required dependencies and fail fast on unsafe configuration."""
    settings = get_settings()
    configure_logging(settings.log_level)

    mongo = MongoConnector(
        uri=settings.mongo_uri,
        db_name=settings.mongo_db_name,
        connect_timeout_ms=settings.mongo_connect_timeout_ms,
        server_selection_timeout_ms=settings.mongo_server_selection_timeout_ms,
    )
    message_cipher = MessageCipher(settings.message_encryption_key)

    app.state.settings = settings
    app.state.mongo = mongo
    app.state.message_cipher = message_cipher

    mongo.connect()
    mongo.ping()
    mongo.init_indexes()
    logger.info("Startup complete. Dependencies and encryption configuration OK.")

    try:
        yield
    finally:
        mongo.close()
        logger.info("Shutdown complete.")


settings = get_settings()

app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    lifespan=lifespan,
)
app.include_router(auth_router)
app.include_router(conversations_router)
app.include_router(messages_router)
app.include_router(audit_router)


@app.middleware("http")
async def request_log_middleware(request: Request, call_next):
    """Log method/path/status/latency only; never log bodies or query params."""
    start = time.perf_counter()
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())

    try:
        response = await call_next(request)
    except Exception:
        logger.exception(
            "Unhandled error request_id=%s method=%s path=%s",
            request_id,
            request.method,
            request.url.path,
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
    elapsed_ms = (time.perf_counter() - start) * 1000

    logger.info(
        "%s %s -> %s (%.1fms) request_id=%s",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        request_id,
    )

    return response


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check: the API process is running."""
    return {"status": "ok"}


@app.get("/ready")
def ready(request: Request) -> dict[str, str]:
    """Readiness check: required dependencies are reachable."""
    mongo: MongoConnector = request.app.state.mongo
    mongo.ping()
    return {"status": "ready"}
