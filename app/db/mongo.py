from __future__ import annotations

import logging

from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import PyMongoError

logger = logging.getLogger(__name__)


class MongoConnector:
    """Minimal Mongo connector for MVP bootstrap (Issue #1).

    Goals:
    - Create a client
    - Ping Mongo to verify connectivity
    - Do not log secrets or request bodies
    """

    def __init__(
        self,
        uri: str,
        db_name: str,
        *,
        connect_timeout_ms: int = 3000,
        server_selection_timeout_ms: int = 3000,
    ) -> None:
        self._uri = uri
        self._db_name = db_name
        self._connect_timeout_ms = connect_timeout_ms
        self._server_selection_timeout_ms = server_selection_timeout_ms
        self._client: MongoClient | None = None

    def connect(self) -> None:
        """Create the MongoDB client (lazy connection)."""
        self._client = MongoClient(
            self._uri,
            connectTimeoutMS=self._connect_timeout_ms,
            serverSelectionTimeoutMS=self._server_selection_timeout_ms,
        )

    def ping(self) -> bool:
        """Force server selection and verify connectivity."""
        if self._client is None:
            raise RuntimeError("Mongo client not initialized. Call connect() first.")
        try:
            self._client.admin.command("ping")
            return True
        except PyMongoError as exc:
            logger.exception("Mongo ping failed.")
            raise RuntimeError("Mongo unreachable or misconfigured.") from exc

    def db(self) -> Database:
        """Return the configured database handle."""
        if self._client is None:
            raise RuntimeError("Mongo client not initialized. Call connect() first.")
        return self._client[self._db_name]

    def close(self) -> None:
        """Close the Mongo client."""
        if self._client is not None:
            self._client.close()
            self._client = None