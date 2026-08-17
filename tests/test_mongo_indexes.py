from __future__ import annotations

import os
import uuid

import pytest
from pymongo.errors import DuplicateKeyError

from app.db.mongo import MongoConnector


@pytest.fixture
def mongo_connector() -> MongoConnector:
    """Provide an isolated Mongo database for integration tests."""
    uri = os.getenv("TEST_MONGO_URI", "mongodb://localhost:27017")
    db_name = f"clinly_test_{uuid.uuid4().hex}"
    connector = MongoConnector(uri=uri, db_name=db_name)
    connector.connect()

    try:
        connector.ping()
    except RuntimeError:
        connector.close()
        pytest.skip("MongoDB is not available for integration tests")

    try:
        yield connector
    finally:
        database = connector.db()
        database.client.drop_database(db_name)
        connector.close()


def test_init_indexes_is_idempotent(mongo_connector: MongoConnector) -> None:
    mongo_connector.init_indexes()
    mongo_connector.init_indexes()

    index_info = mongo_connector.db().users.index_information()

    assert index_info["uq_users_email"]["unique"] is True
    assert index_info["uq_users_email"]["key"] == [("email", 1)]
    assert index_info["ix_users_therapist_id"]["key"] == [("therapist_id", 1)]


def test_duplicate_email_is_rejected(mongo_connector: MongoConnector) -> None:
    mongo_connector.init_indexes()
    users = mongo_connector.db().users

    users.insert_one(
        {
            "email": "therapist@example.com",
            "role": "THERAPIST",
            "password_hash": "not-a-real-hash",
        }
    )

    with pytest.raises(DuplicateKeyError):
        users.insert_one(
            {
                "email": "therapist@example.com",
                "role": "THERAPIST",
                "password_hash": "also-not-a-real-hash",
            }
        )
