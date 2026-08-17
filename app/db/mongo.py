from __future__ import annotations

import logging

from pymongo import ASCENDING, MongoClient
from pymongo.database import Database
from pymongo.errors import PyMongoError

logger = logging.getLogger(__name__)


class MongoConnector:
    """MongoDB connector used by the Clinly application lifecycle.

    The connector owns the client, verifies connectivity, and initializes the
    idempotent indexes required by the application foundation.
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
        """Create the MongoDB client (the network connection remains lazy)."""
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

    def init_indexes(self) -> None:
        """Create the idempotent indexes required by the user model.

        A unique normalized email is the database-level backstop against
        duplicate accounts. ``therapist_id`` supports ownership lookups for
        client accounts without imposing uniqueness.
        """
        database = self.db()
        database.users.create_index(
            [("email", ASCENDING)],
            unique=True,
            name="uq_users_email",
        )
        database.users.create_index(
            [("therapist_id", ASCENDING)],
            name="ix_users_therapist_id",
        )
        logger.info("Mongo indexes initialized.")

    def close(self) -> None:
        """Close the Mongo client."""
        if self._client is not None:
            self._client.close()
            self._client = None
