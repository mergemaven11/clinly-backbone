from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient

from app.main import app
from app.services.scheduling import reserve_interval

PASSWORD = "StrongPass123!"
UTC = timezone.utc
PROVIDER_TZ = ZoneInfo("America/New_York")


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        database = app.state.mongo.db()
        collections = (
            "users",
            "provider_profiles",
            "provider_services",
            "provider_schedules",
            "booking_calendars",
            "bookings",
            "audit_events",
        )
        for collection in collections:
            database[collection].delete_many({})
        yield test_client
        for collection in collections:
            database[collection].delete_many({})


def _signup_provider(client: TestClient, email: str) -> dict:
    response = client.post(
        "/auth/signup-provider",
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 201
    return response.json()


def _login(client: TestClient, email: str) -> str:
    response = client.post(
        "/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _future_local_day(days: int = 3):
    return datetime.now(PROVIDER_TZ).date() + timedelta(days=days)


def _create_provider_profile(
    client: TestClient,
    token: str,
    *,
    display_name: str = "Schedule Provider",
    slug: str = "schedule-provider",
    public: bool = True,
) -> dict:
    response = client.put(
        "/provider/profile",
        headers=_auth(token),
        json={
            "display_name": display_name,
            "timezone": "America/New_York",
            "locale": "en-US",
            "public_slug": slug if public else None,
            "is_public": public,
        },
    )
    assert response.status_code == 200
    return response.json()


def _create_service(
    client: TestClient,
    token: str,
    *,
    name: str = "Strategy session",
    duration: int = 60,
    public: bool = True,
) -> dict:
    response = client.post(
        "/provider/services",
        headers=_auth(token),
        json={
            "name": name,
            "duration_minutes": duration,
            "price_minor": 7500,
            "currency": "USD",
            "delivery_mode": "VIRTUAL",
            "capacity": 1,
            "is_public": public,
            "active": True,
        },
    )
    assert response.status_code == 201
    return response.json()


def _put_schedule(
    client: TestClient,
    token: str,
    *,
    target_day,
    service_id: str,
    exceptions: list[dict] | None = None,
    policy: dict | None = None,
) -> dict:
    schedule_policy = {
        "slot_interval_minutes": 60,
        "minimum_notice_minutes": 0,
        "booking_horizon_days": 30,
        "buffer_before_minutes": 0,
        "buffer_after_minutes": 0,
        "cancellation_notice_minutes": 0,
        "participant_reschedule_enabled": True,
        "participant_cancel_enabled": True,
    }
    if policy:
        schedule_policy.update(policy)
    response = client.put(
        "/provider/schedule",
        headers=_auth(token),
        json={
            "policy": schedule_policy,
            "weekly_rules": [
                {
                    "weekday": target_day.weekday(),
                    "start_local": "09:00",
                    "end_local": "12:00",
                    "service_ids": [service_id],
                }
            ],
            "exceptions": exceptions or [],
        },
    )
    assert response.status_code == 200
    return response.json()


def _create_participant(client: TestClient, provider_token: str, email: str) -> dict:
    response = client.post(
        "/auth/create-participant",
        headers=_auth(provider_token),
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 201
    return response.json()


def _public_slots(client: TestClient, slug: str, service_id: str, target_day) -> list[dict]:
    response = client.get(
        f"/public/providers/{slug}/services/{service_id}/slots",
        params={"date_from": target_day.isoformat(), "date_to": target_day.isoformat()},
    )
    assert response.status_code == 200
    return response.json()["slots"]


def test_public_slots_follow_provider_timezone_service_duration_and_exception(
    client: TestClient,
) -> None:
    _signup_provider(client, "provider@example.com")
    token = _login(client, "provider@example.com")
    _create_provider_profile(client, token)
    service = _create_service(client, token)
    target = _future_local_day()
    _put_schedule(
        client,
        token,
        target_day=target,
        service_id=service["id"],
        exceptions=[
            {
                "date_local": target.isoformat(),
                "kind": "UNAVAILABLE",
                "start_local": "10:00",
                "end_local": "11:00",
                "service_ids": [service["id"]],
            }
        ],
    )

    schedule = client.get("/provider/schedule", headers=_auth(token))
    assert schedule.status_code == 200
    assert schedule.json()["timezone"] == "America/New_York"

    slots = _public_slots(client, "schedule-provider", service["id"], target)
    assert len(slots) == 2
    local_times = [
        datetime.fromisoformat(slot["starts_at"].replace("Z", "+00:00"))
        .astimezone(PROVIDER_TZ)
        .strftime("%H:%M")
        for slot in slots
    ]
    assert local_times == ["09:00", "11:00"]
    assert all(slot["provider_timezone"] == "America/New_York" for slot in slots)


def test_public_slots_hide_private_service(client: TestClient) -> None:
    _signup_provider(client, "provider@example.com")
    token = _login(client, "provider@example.com")
    _create_provider_profile(client, token)
    service = _create_service(client, token, public=False)
    target = _future_local_day()
    _put_schedule(client, token, target_day=target, service_id=service["id"])

    response = client.get(
        f"/public/providers/schedule-provider/services/{service['id']}/slots",
        params={"date_from": target.isoformat(), "date_to": target.isoformat()},
    )
    assert response.status_code == 404


def test_atomic_provider_day_reservation_rejects_overlapping_interval(
    client: TestClient,
) -> None:
    database = app.state.mongo.db()
    provider_id = ObjectId()
    participant_one = ObjectId()
    participant_two = ObjectId()
    service_id = ObjectId()
    first_booking = ObjectId()
    second_booking = ObjectId()
    start = datetime.now(UTC) + timedelta(days=2)
    end = start + timedelta(hours=1)

    first = {
        "booking_id": first_booking,
        "participant_user_id": participant_one,
        "service_id": service_id,
        "starts_at": start,
        "ends_at": end,
        "block_start": start,
        "block_end": end,
    }
    overlapping = {
        "booking_id": second_booking,
        "participant_user_id": participant_two,
        "service_id": service_id,
        "starts_at": start + timedelta(minutes=30),
        "ends_at": end + timedelta(minutes=30),
        "block_start": start + timedelta(minutes=30),
        "block_end": end + timedelta(minutes=30),
    }

    assert reserve_interval(
        database,
        provider_user_id=provider_id,
        local_date="2099-01-01",
        reservation=first,
    ) is True
    assert reserve_interval(
        database,
        provider_user_id=provider_id,
        local_date="2099-01-01",
        reservation=overlapping,
    ) is False
    calendar = database.booking_calendars.find_one({"provider_user_id": provider_id})
    assert calendar is not None
    assert len(calendar["reservations"]) == 1
    assert calendar["reservations"][0]["booking_id"] == first_booking


def test_participant_booking_reschedule_cancel_releases_slots(client: TestClient) -> None:
    _signup_provider(client, "provider@example.com")
    provider_token = _login(client, "provider@example.com")
    _create_provider_profile(client, provider_token)
    service = _create_service(client, provider_token)
    target = _future_local_day()
    _put_schedule(client, provider_token, target_day=target, service_id=service["id"])
    _create_participant(client, provider_token, "member@example.com")
    participant_token = _login(client, "member@example.com")

    initial_slots = _public_slots(client, "schedule-provider", service["id"], target)
    assert len(initial_slots) == 3
    first_start = initial_slots[0]["starts_at"]
    second_start = initial_slots[1]["starts_at"]

    booked = client.post(
        "/bookings",
        headers=_auth(participant_token),
        json={"service_id": service["id"], "starts_at": first_start},
    )
    assert booked.status_code == 201
    booking = booked.json()
    assert booking["status"] == "CONFIRMED"
    assert booking["service_name"] == "Strategy session"

    taken_slots = _public_slots(client, "schedule-provider", service["id"], target)
    assert first_start not in {slot["starts_at"] for slot in taken_slots}

    moved = client.patch(
        f"/bookings/{booking['id']}/reschedule",
        headers=_auth(participant_token),
        json={"starts_at": second_start},
    )
    assert moved.status_code == 200
    assert moved.json()["starts_at"] == second_start

    after_move = _public_slots(client, "schedule-provider", service["id"], target)
    starts_after_move = {slot["starts_at"] for slot in after_move}
    assert first_start in starts_after_move
    assert second_start not in starts_after_move

    cancelled = client.post(
        f"/bookings/{booking['id']}/cancel",
        headers=_auth(participant_token),
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "CANCELLED"

    after_cancel = _public_slots(client, "schedule-provider", service["id"], target)
    starts_after_cancel = {slot["starts_at"] for slot in after_cancel}
    assert first_start in starts_after_cancel
    assert second_start in starts_after_cancel

    mine = client.get("/bookings/me", headers=_auth(participant_token))
    assert mine.status_code == 200
    assert [item["id"] for item in mine.json()] == [booking["id"]]
    assert mine.json()[0]["status"] == "CANCELLED"


def test_second_participant_cannot_claim_reserved_slot(client: TestClient) -> None:
    _signup_provider(client, "provider@example.com")
    provider_token = _login(client, "provider@example.com")
    _create_provider_profile(client, provider_token)
    service = _create_service(client, provider_token)
    target = _future_local_day()
    _put_schedule(client, provider_token, target_day=target, service_id=service["id"])
    _create_participant(client, provider_token, "one@example.com")
    _create_participant(client, provider_token, "two@example.com")
    one_token = _login(client, "one@example.com")
    two_token = _login(client, "two@example.com")
    slot = _public_slots(client, "schedule-provider", service["id"], target)[0]

    first = client.post(
        "/bookings",
        headers=_auth(one_token),
        json={"service_id": service["id"], "starts_at": slot["starts_at"]},
    )
    assert first.status_code == 201
    second = client.post(
        "/bookings",
        headers=_auth(two_token),
        json={"service_id": service["id"], "starts_at": slot["starts_at"]},
    )
    assert second.status_code == 409
    assert app.state.mongo.db().bookings.count_documents({}) == 1


def test_provider_can_book_owned_participant_but_not_foreign_participant(
    client: TestClient,
) -> None:
    _signup_provider(client, "owner@example.com")
    owner_token = _login(client, "owner@example.com")
    _create_provider_profile(client, owner_token, slug="owner")
    service = _create_service(client, owner_token)
    target = _future_local_day()
    _put_schedule(client, owner_token, target_day=target, service_id=service["id"])
    owned = _create_participant(client, owner_token, "owned@example.com")

    slot = _public_slots(client, "owner", service["id"], target)[0]
    created = client.post(
        "/bookings",
        headers=_auth(owner_token),
        json={
            "service_id": service["id"],
            "starts_at": slot["starts_at"],
            "participant_id": owned["id"],
        },
    )
    assert created.status_code == 201

    _signup_provider(client, "foreign@example.com")
    foreign_token = _login(client, "foreign@example.com")
    foreign_participant = _create_participant(client, foreign_token, "foreign-member@example.com")
    another_slot = _public_slots(client, "owner", service["id"], target)[0]
    denied = client.post(
        "/bookings",
        headers=_auth(owner_token),
        json={
            "service_id": service["id"],
            "starts_at": another_slot["starts_at"],
            "participant_id": foreign_participant["id"],
        },
    )
    assert denied.status_code == 404


def test_participant_cannot_access_foreign_provider_availability(client: TestClient) -> None:
    _signup_provider(client, "one@example.com")
    one_token = _login(client, "one@example.com")
    _create_provider_profile(client, one_token, slug="one")
    _create_participant(client, one_token, "member@example.com")
    member_token = _login(client, "member@example.com")

    _signup_provider(client, "two@example.com")
    two_token = _login(client, "two@example.com")
    _create_provider_profile(client, two_token, slug="two")
    service = _create_service(client, two_token)
    target = _future_local_day()
    _put_schedule(client, two_token, target_day=target, service_id=service["id"])

    response = client.get(
        "/availability",
        headers=_auth(member_token),
        params={
            "service_id": service["id"],
            "date_from": target.isoformat(),
            "date_to": target.isoformat(),
        },
    )
    assert response.status_code == 404


def test_participant_policy_can_disable_cancel_and_reschedule(client: TestClient) -> None:
    _signup_provider(client, "provider@example.com")
    provider_token = _login(client, "provider@example.com")
    _create_provider_profile(client, provider_token)
    service = _create_service(client, provider_token)
    target = _future_local_day()
    _put_schedule(
        client,
        provider_token,
        target_day=target,
        service_id=service["id"],
        policy={
            "participant_cancel_enabled": False,
            "participant_reschedule_enabled": False,
        },
    )
    _create_participant(client, provider_token, "member@example.com")
    participant_token = _login(client, "member@example.com")
    slots = _public_slots(client, "schedule-provider", service["id"], target)
    booking = client.post(
        "/bookings",
        headers=_auth(participant_token),
        json={"service_id": service["id"], "starts_at": slots[0]["starts_at"]},
    ).json()

    cancelled = client.post(
        f"/bookings/{booking['id']}/cancel",
        headers=_auth(participant_token),
    )
    rescheduled = client.patch(
        f"/bookings/{booking['id']}/reschedule",
        headers=_auth(participant_token),
        json={"starts_at": slots[1]["starts_at"]},
    )
    assert cancelled.status_code == 409
    assert rescheduled.status_code == 409


def test_schedule_rejects_foreign_service_reference(client: TestClient) -> None:
    _signup_provider(client, "one@example.com")
    one_token = _login(client, "one@example.com")
    _create_provider_profile(client, one_token, slug="one")

    _signup_provider(client, "two@example.com")
    two_token = _login(client, "two@example.com")
    _create_provider_profile(client, two_token, slug="two")
    foreign_service = _create_service(client, two_token)
    target = _future_local_day()

    response = client.put(
        "/provider/schedule",
        headers=_auth(one_token),
        json={
            "policy": {"minimum_notice_minutes": 0},
            "weekly_rules": [
                {
                    "weekday": target.weekday(),
                    "start_local": "09:00",
                    "end_local": "12:00",
                    "service_ids": [foreign_service["id"]],
                }
            ],
            "exceptions": [],
        },
    )
    assert response.status_code == 422
