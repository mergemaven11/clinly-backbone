from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.mongo import MongoConnector

logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifecycle manager.

    Connects to MongoDB at startup and closes cleanly on shutdown.
    Fails fast if Mongo is unreachable to avoid running in a bad state.
    """
    settings = get_settings()
    configure_logging(settings.log_level)

    mongo = MongoConnector(
        uri=settings.mongo_uri,
        db_name=settings.mongo_db_name,
    )

    app.state.settings = settings
    app.state.mongo = mongo

    # =========================
    # Startup
    # =========================
    mongo.connect()
    mongo.ping()
    # mongo.init_indexes()
    logger.info("Startup complete. Mongo ping OK.")

    try:
        yield
    finally:
        # =========================
        # Shutdown
        # =========================
        mongo.close()
        logger.info("Shutdown complete.")


app = FastAPI(
    title="Clinly Backbone",
    version="0.1.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def request_log_middleware(request: Request, call_next):
    """Log method/path/status/latency only (no bodies, no query params)."""
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

    # Always attach request id
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
def health() -> dict:
    """Liveness check: process is up."""
    return {"status": "ok"}


@app.get("/ready")
def ready(request: Request) -> dict:
    """Readiness check: dependencies (Mongo) are reachable."""
    mongo: MongoConnector = request.app.state.mongo
    mongo.ping()
    return {"status": "ready"}