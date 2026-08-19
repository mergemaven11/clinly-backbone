from __future__ import annotations

import os
import uuid

import pytest
from bson import ObjectId
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

    database = mongo_connector.db()
    user_indexes = database.users.index_information()
    track_indexes = database.portal_tracks.index_information()
    entry_indexes = database.portal_entries.index_information()
    integration_indexes = database.integration_connections.index_information()

    assert user_indexes["uq_users_email"]["unique"] is True
    assert user_indexes["uq_users_email"]["key"] == [("email", 1)]
    assert user_indexes["ix_users_therapist_id"]["key"] == [("therapist_id", 1)]
    assert track_indexes["ix_portal_tracks_professional_created_at"]["key"] == [
        ("professional_user_id", 1),
        ("created_at", 1),
    ]
    assert track_indexes["ix_portal_tracks_client_created_at"]["key"] == [
        ("client_user_id", 1),
        ("created_at", 1),
    ]
    assert entry_indexes["ix_portal_entries_track_created_at"]["key"] == [
        ("track_id", 1),
        ("created_at", 1),
    ]
    connection_index = integration_indexes[
        "uq_integration_connections_provider_key"
    ]
    assert connection_index["unique"] is True
    assert connection_index["key"] == [
        ("provider_user_id", 1),
        ("integration_key", 1),
    ]


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


def test_provider_can_have_only_one_connection_per_integration(
    mongo_connector: MongoConnector,
) -> None:
    mongo_connector.init_indexes()
    connections = mongo_connector.db().integration_connections
    provider_id = ObjectId()
    connections.insert_one(
        {
            "provider_user_id": provider_id,
            "integration_key": "google_calendar",
            "state": "CONNECTED",
        }
    )

    with pytest.raises(DuplicateKeyError):
        connections.insert_one(
            {
                "provider_user_id": provider_id,
                "integration_key": "google_calendar",
                "state": "SETUP_REQUIRED",
            }
        )
