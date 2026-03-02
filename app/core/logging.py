import logging
import sys


def configure_logging(log_level: str) -> None:
    """
    Configure application logging.

    - Outputs to stdout (container-friendly)
    - Structured, predictable format
    - Prevents duplicate handlers
    - Does NOT log request bodies
    """

    level = getattr(logging, log_level.upper(), logging.INFO)

    # Remove existing handlers to avoid duplicate logs (important in reload/test)
    root_logger = logging.getLogger()
    if root_logger.handlers:
        for handler in root_logger.handlers:
            root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)

    formatter = logging.Formatter(
        fmt="%(asctime)s %(levelname)s %(name)s env=%(env)s %(message)s"
    )

    handler.setFormatter(formatter)
    root_logger.addHandler(handler)
    root_logger.setLevel(level)

    # Silence noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("pymongo").setLevel(logging.WARNING)

    # Inject environment into log records
    old_factory = logging.getLogRecordFactory()

    def record_factory(*args, **kwargs):
        record = old_factory(*args, **kwargs)
        record.env = "unknown"
        try:
            from app.core.config import get_settings

            record.env = get_settings().app_env
        except Exception:
            pass
        return record

    logging.setLogRecordFactory(record_factory)