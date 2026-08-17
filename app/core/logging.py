from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any

SAFE_EXTRA_FIELDS = (
    "request_id",
    "actor_user_id",
    "method",
    "route",
    "status_code",
    "latency_ms",
)


class JsonFormatter(logging.Formatter):
    """Render a small allowlisted JSON log envelope.

    Request/response bodies, query parameters, tokens, emails, and message
    content are deliberately not part of the supported log schema.
    """

    def __init__(self, *, app_env: str) -> None:
        super().__init__()
        self._app_env = app_env

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "env": self._app_env,
            "message": record.getMessage(),
        }
        for field in SAFE_EXTRA_FIELDS:
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value
        return json.dumps(payload, separators=(",", ":"), sort_keys=True)


def configure_logging(log_level: str, app_env: str) -> None:
    """Configure container-friendly JSON logging with an allowlisted schema."""
    level = getattr(logging, log_level.upper(), logging.INFO)
    root_logger = logging.getLogger()
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter(app_env=app_env))
    root_logger.addHandler(handler)
    root_logger.setLevel(level)

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("pymongo").setLevel(logging.WARNING)
