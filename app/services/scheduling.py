"""Document this first-party Python module."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.models.scheduling import (
    AvailabilityExceptionKind,
    AvailabilityResponse,
    AvailabilitySlot,
    BookingResponse,
    BookingStatus,
    ProviderScheduleResponse,
    ProviderScheduleUpsert,
    SchedulePolicy,
)

UTC = timezone.utc


def _utc(value: datetime) -> datetime:
    """Handle utc.

    Args:
        value: Function argument.

    Returns:
        Function result.
    """
    return value.astimezone(UTC)


def provider_timezone(database: Database, provider_user_id: ObjectId) -> str:
    """Handle provider timezone.

    Args:
        database: Function argument.
        provider_user_id: Function argument.

    Returns:
        Function result.
    """
    profile = database.provider_profiles.find_one(
        {"provider_user_id": provider_user_id},
        {"timezone": 1},
    )
    return profile.get("timezone", "UTC") if profile else "UTC"


def load_schedule_payload(
    database: Database,
    provider_user_id: ObjectId,
) -> ProviderScheduleUpsert:
    """Handle load schedule payload.

    Args:
        database: Function argument.
        provider_user_id: Function argument.

    Returns:
        Function result.
    """
    document = database.provider_schedules.find_one(
        {"provider_user_id": provider_user_id}
    )
    if document is None:
        return ProviderScheduleUpsert()
    return ProviderScheduleUpsert.model_validate(
        {
            "policy": document.get("policy", {}),
            "weekly_rules": document.get("weekly_rules", []),
            "exceptions": document.get("exceptions", []),
        }
    )


def serialize_schedule(
    database: Database,
    document: dict[str, Any],
) -> ProviderScheduleResponse:
    """Handle serialize schedule.

    Args:
        database: Function argument.
        document: Function argument.

    Returns:
        Function result.
    """
    payload = ProviderScheduleUpsert.model_validate(
        {
            "policy": document.get("policy", {}),
            "weekly_rules": document.get("weekly_rules", []),
            "exceptions": document.get("exceptions", []),
        }
    )
    return ProviderScheduleResponse(
        **payload.model_dump(),
        provider_user_id=str(document["provider_user_id"]),
        timezone=provider_timezone(database, document["provider_user_id"]),
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


def _applies_to_service(service_id: str, service_ids: list[str]) -> bool:
    """Handle applies to service.

    Args:
        service_id: Function argument.
        service_ids: Function argument.

    Returns:
        Function result.
    """
    return not service_ids or service_id in service_ids


def _local_datetime(day: date, local_time: time, tz: ZoneInfo) -> datetime:
    """Handle local datetime.

    Args:
        day: Function argument.
        local_time: Function argument.
        tz: Function argument.

    Returns:
        Function result.
    """
    return datetime.combine(day, local_time, tzinfo=tz)


def _subtract_interval(
    intervals: list[tuple[datetime, datetime]],
    blocked_start: datetime,
    blocked_end: datetime,
) -> list[tuple[datetime, datetime]]:
    """Handle subtract interval.

    Args:
        intervals: Function argument.
        blocked_start: Function argument.
        blocked_end: Function argument.

    Returns:
        Function result.
    """
    result: list[tuple[datetime, datetime]] = []
    for start, end in intervals:
        if blocked_end <= start or blocked_start >= end:
            result.append((start, end))
            continue
        if blocked_start > start:
            result.append((start, min(blocked_start, end)))
        if blocked_end < end:
            result.append((max(blocked_end, start), end))
    return [(start, end) for start, end in result if end > start]


def _available_intervals(
    schedule: ProviderScheduleUpsert,
    *,
    day: date,
    service_id: str,
    tz: ZoneInfo,
) -> list[tuple[datetime, datetime]]:
    """Handle available intervals.

    Args:
        schedule: Function argument.
        day: Function argument.
        service_id: Function argument.
        tz: Function argument.

    Returns:
        Function result.
    """
    intervals = [
        (
            _local_datetime(day, rule.start_local, tz),
            _local_datetime(day, rule.end_local, tz),
        )
        for rule in schedule.weekly_rules
        if rule.weekday == day.weekday()
        and _applies_to_service(service_id, rule.service_ids)
    ]

    for exception in schedule.exceptions:
        if exception.date_local != day:
            continue
        if not _applies_to_service(service_id, exception.service_ids):
            continue
        if exception.kind == AvailabilityExceptionKind.AVAILABLE:
            assert exception.start_local is not None and exception.end_local is not None
            intervals.append(
                (
                    _local_datetime(day, exception.start_local, tz),
                    _local_datetime(day, exception.end_local, tz),
                )
            )

    for exception in schedule.exceptions:
        if exception.date_local != day:
            continue
        if exception.kind != AvailabilityExceptionKind.UNAVAILABLE:
            continue
        if not _applies_to_service(service_id, exception.service_ids):
            continue
        if exception.start_local is None:
            blocked_start = datetime.combine(day, time.min, tzinfo=tz)
            blocked_end = datetime.combine(day + timedelta(days=1), time.min, tzinfo=tz)
        else:
            assert exception.end_local is not None
            blocked_start = _local_datetime(day, exception.start_local, tz)
            blocked_end = _local_datetime(day, exception.end_local, tz)
        intervals = _subtract_interval(intervals, blocked_start, blocked_end)

    return sorted(set(intervals), key=lambda item: item[0])


def _reservations_by_day(
    database: Database,
    *,
    provider_user_id: ObjectId,
    date_from: date,
    date_to: date,
) -> dict[str, list[dict[str, Any]]]:
    """Handle reservations by day.

    Args:
        database: Function argument.
        provider_user_id: Function argument.
        date_from: Function argument.
        date_to: Function argument.

    Returns:
        Function result.
    """
    documents = database.booking_calendars.find(
        {
            "provider_user_id": provider_user_id,
            "local_date": {
                "$gte": date_from.isoformat(),
                "$lte": date_to.isoformat(),
            },
        },
        {"local_date": 1, "reservations": 1},
    )
    return {
        document["local_date"]: document.get("reservations", [])
        for document in documents
    }


def _overlaps(
    reservations: list[dict[str, Any]],
    block_start: datetime,
    block_end: datetime,
    *,
    ignore_booking_id: ObjectId | None = None,
) -> bool:
    """Handle overlaps.

    Args:
        reservations: Function argument.
        block_start: Function argument.
        block_end: Function argument.
        ignore_booking_id: Function argument.

    Returns:
        Function result.
    """
    for reservation in reservations:
        if ignore_booking_id is not None and reservation.get("booking_id") == ignore_booking_id:
            continue
        if reservation["block_start"] < block_end and reservation["block_end"] > block_start:
            return True
    return False


def generate_availability(
    database: Database,
    *,
    service: dict[str, Any],
    date_from: date,
    date_to: date,
    now: datetime | None = None,
    ignore_booking_id: ObjectId | None = None,
) -> AvailabilityResponse:
    """Handle generate availability.

    Args:
        database: Function argument.
        service: Function argument.
        date_from: Function argument.
        date_to: Function argument.
        now: Function argument.
        ignore_booking_id: Function argument.

    Returns:
        Function result.
    """
    provider_user_id: ObjectId = service["provider_user_id"]
    timezone_name = provider_timezone(database, provider_user_id)

    # The current reservation primitive models one participant occupying provider
    # time. Group/capacity-aware seat inventory is a separate scheduling mode and
    # must not silently reuse 1:1 availability.
    if service.get("capacity", 1) != 1:
        return AvailabilityResponse(
            service_id=str(service["_id"]),
            provider_user_id=str(provider_user_id),
            provider_timezone=timezone_name,
            date_from=date_from,
            date_to=date_to,
            slots=[],
        )

    schedule = load_schedule_payload(database, provider_user_id)
    policy = schedule.policy
    tz = ZoneInfo(timezone_name)
    current = _utc(now or datetime.now(UTC))
    local_today = current.astimezone(tz).date()
    horizon_end = local_today + timedelta(days=policy.booking_horizon_days)
    effective_from = max(date_from, local_today)
    effective_to = min(date_to, horizon_end)
    if effective_to < effective_from:
        return AvailabilityResponse(
            service_id=str(service["_id"]),
            provider_user_id=str(provider_user_id),
            provider_timezone=timezone_name,
            date_from=date_from,
            date_to=date_to,
            slots=[],
        )

    reservations = _reservations_by_day(
        database,
        provider_user_id=provider_user_id,
        date_from=effective_from,
        date_to=effective_to,
    )
    duration = timedelta(minutes=service["duration_minutes"])
    before = timedelta(minutes=policy.buffer_before_minutes)
    after = timedelta(minutes=policy.buffer_after_minutes)
    step = timedelta(minutes=policy.slot_interval_minutes)
    notice_cutoff = current + timedelta(minutes=policy.minimum_notice_minutes)
    slots: list[AvailabilitySlot] = []
    seen_starts: set[datetime] = set()

    day = effective_from
    while day <= effective_to:
        day_reservations = reservations.get(day.isoformat(), [])
        for interval_start, interval_end in _available_intervals(
            schedule,
            day=day,
            service_id=str(service["_id"]),
            tz=tz,
        ):
            candidate = interval_start + before
            while candidate + duration + after <= interval_end:
                starts_at = _utc(candidate)
                ends_at = starts_at + duration
                block_start = starts_at - before
                block_end = ends_at + after
                if starts_at >= notice_cutoff and starts_at not in seen_starts:
                    if not _overlaps(
                        day_reservations,
                        block_start,
                        block_end,
                        ignore_booking_id=ignore_booking_id,
                    ):
                        seen_starts.add(starts_at)
                        slots.append(
                            AvailabilitySlot(
                                starts_at=starts_at,
                                ends_at=ends_at,
                                provider_timezone=timezone_name,
                                local_date=day,
                            )
                        )
                candidate += step
        day += timedelta(days=1)

    return AvailabilityResponse(
        service_id=str(service["_id"]),
        provider_user_id=str(provider_user_id),
        provider_timezone=timezone_name,
        date_from=date_from,
        date_to=date_to,
        slots=sorted(slots, key=lambda slot: slot.starts_at),
    )


def booking_block(
    database: Database,
    *,
    provider_user_id: ObjectId,
    starts_at: datetime,
    ends_at: datetime,
) -> tuple[datetime, datetime, str]:
    """Handle booking block.

    Args:
        database: Function argument.
        provider_user_id: Function argument.
        starts_at: Function argument.
        ends_at: Function argument.

    Returns:
        Function result.
    """
    schedule = load_schedule_payload(database, provider_user_id)
    timezone_name = provider_timezone(database, provider_user_id)
    tz = ZoneInfo(timezone_name)
    starts_utc = _utc(starts_at)
    ends_utc = _utc(ends_at)
    block_start = starts_utc - timedelta(minutes=schedule.policy.buffer_before_minutes)
    block_end = ends_utc + timedelta(minutes=schedule.policy.buffer_after_minutes)
    local_date = starts_utc.astimezone(tz).date().isoformat()
    return block_start, block_end, local_date


def _reservation_document(
    *,
    booking_id: ObjectId,
    participant_user_id: ObjectId,
    service_id: ObjectId,
    starts_at: datetime,
    ends_at: datetime,
    block_start: datetime,
    block_end: datetime,
) -> dict[str, Any]:
    """Handle reservation document.

    Args:
        booking_id: Function argument.
        participant_user_id: Function argument.
        service_id: Function argument.
        starts_at: Function argument.
        ends_at: Function argument.
        block_start: Function argument.
        block_end: Function argument.

    Returns:
        Function result.
    """
    return {
        "booking_id": booking_id,
        "participant_user_id": participant_user_id,
        "service_id": service_id,
        "starts_at": _utc(starts_at),
        "ends_at": _utc(ends_at),
        "block_start": _utc(block_start),
        "block_end": _utc(block_end),
    }


def reserve_interval(
    database: Database,
    *,
    provider_user_id: ObjectId,
    local_date: str,
    reservation: dict[str, Any],
) -> bool:
    """Handle reserve interval.

    Args:
        database: Function argument.
        provider_user_id: Function argument.
        local_date: Function argument.
        reservation: Function argument.

    Returns:
        Function result.
    """
    now = datetime.now(UTC)
    query = {
        "provider_user_id": provider_user_id,
        "local_date": local_date,
        "reservations": {
            "$not": {
                "$elemMatch": {
                    "block_start": {"$lt": reservation["block_end"]},
                    "block_end": {"$gt": reservation["block_start"]},
                }
            }
        },
    }
    update = {
        "$setOnInsert": {
            "provider_user_id": provider_user_id,
            "local_date": local_date,
            "created_at": now,
        },
        "$set": {"updated_at": now},
        "$push": {"reservations": reservation},
    }
    try:
        document = database.booking_calendars.find_one_and_update(
            query,
            update,
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
    except DuplicateKeyError:
        document = database.booking_calendars.find_one_and_update(
            query,
            update,
            upsert=False,
            return_document=ReturnDocument.AFTER,
        )
    return document is not None


def release_interval(
    database: Database,
    *,
    provider_user_id: ObjectId,
    local_date: str,
    booking_id: ObjectId,
) -> None:
    """Handle release interval.

    Args:
        database: Function argument.
        provider_user_id: Function argument.
        local_date: Function argument.
        booking_id: Function argument.
    """
    database.booking_calendars.update_one(
        {"provider_user_id": provider_user_id, "local_date": local_date},
        {
            "$pull": {"reservations": {"booking_id": booking_id}},
            "$set": {"updated_at": datetime.now(UTC)},
        },
    )


def move_interval_same_day(
    database: Database,
    *,
    provider_user_id: ObjectId,
    local_date: str,
    booking_id: ObjectId,
    reservation: dict[str, Any],
) -> bool:
    """Handle move interval same day.

    Args:
        database: Function argument.
        provider_user_id: Function argument.
        local_date: Function argument.
        booking_id: Function argument.
        reservation: Function argument.

    Returns:
        Function result.
    """
    query = {
        "provider_user_id": provider_user_id,
        "local_date": local_date,
        "reservations": {
            "$not": {
                "$elemMatch": {
                    "booking_id": {"$ne": booking_id},
                    "block_start": {"$lt": reservation["block_end"]},
                    "block_end": {"$gt": reservation["block_start"]},
                }
            }
        },
    }
    update = [
        {
            "$set": {
                "reservations": {
                    "$concatArrays": [
                        {
                            "$filter": {
                                "input": {"$ifNull": ["$reservations", []]},
                                "as": "reservation",
                                "cond": {"$ne": ["$$reservation.booking_id", booking_id]},
                            }
                        },
                        [reservation],
                    ]
                },
                "updated_at": datetime.now(UTC),
            }
        }
    ]
    document = database.booking_calendars.find_one_and_update(
        query,
        update,
        return_document=ReturnDocument.AFTER,
    )
    return document is not None


def build_reservation(
    database: Database,
    *,
    booking_id: ObjectId,
    provider_user_id: ObjectId,
    participant_user_id: ObjectId,
    service_id: ObjectId,
    starts_at: datetime,
    ends_at: datetime,
) -> tuple[dict[str, Any], str]:
    """Handle build reservation.

    Args:
        database: Function argument.
        booking_id: Function argument.
        provider_user_id: Function argument.
        participant_user_id: Function argument.
        service_id: Function argument.
        starts_at: Function argument.
        ends_at: Function argument.

    Returns:
        Function result.
    """
    block_start, block_end, local_date = booking_block(
        database,
        provider_user_id=provider_user_id,
        starts_at=starts_at,
        ends_at=ends_at,
    )
    return (
        _reservation_document(
            booking_id=booking_id,
            participant_user_id=participant_user_id,
            service_id=service_id,
            starts_at=starts_at,
            ends_at=ends_at,
            block_start=block_start,
            block_end=block_end,
        ),
        local_date,
    )


def is_exact_available_start(
    database: Database,
    *,
    service: dict[str, Any],
    starts_at: datetime,
    ignore_booking_id: ObjectId | None = None,
) -> bool:
    """Handle is exact available start.

    Args:
        database: Function argument.
        service: Function argument.
        starts_at: Function argument.
        ignore_booking_id: Function argument.

    Returns:
        Function result.
    """
    timezone_name = provider_timezone(database, service["provider_user_id"])
    local_date = _utc(starts_at).astimezone(ZoneInfo(timezone_name)).date()
    availability = generate_availability(
        database,
        service=service,
        date_from=local_date,
        date_to=local_date,
        ignore_booking_id=ignore_booking_id,
    )
    target = _utc(starts_at)
    return any(_utc(slot.starts_at) == target for slot in availability.slots)


def serialize_booking(
    database: Database,
    booking: dict[str, Any],
) -> BookingResponse:
    """Handle serialize booking.

    Args:
        database: Function argument.
        booking: Function argument.

    Returns:
        Function result.
    """
    service = database.provider_services.find_one({"_id": booking["service_id"]})
    profile = database.provider_profiles.find_one(
        {"provider_user_id": booking["provider_user_id"]},
        {"display_name": 1},
    )
    return BookingResponse(
        id=str(booking["_id"]),
        provider_user_id=str(booking["provider_user_id"]),
        participant_user_id=str(booking["participant_user_id"]),
        service_id=str(booking["service_id"]),
        service_name=service.get("name", "Archived service") if service else "Archived service",
        provider_display_name=profile.get("display_name") if profile else None,
        starts_at=booking["starts_at"],
        ends_at=booking["ends_at"],
        provider_timezone=booking["provider_timezone"],
        status=BookingStatus(booking["status"]),
        created_by_user_id=str(booking["created_by_user_id"]),
        created_at=booking["created_at"],
        updated_at=booking["updated_at"],
        cancelled_at=booking.get("cancelled_at"),
    )


def schedule_policy(
    database: Database,
    provider_user_id: ObjectId,
) -> SchedulePolicy:
    """Handle schedule policy.

    Args:
        database: Function argument.
        provider_user_id: Function argument.

    Returns:
        Function result.
    """
    return load_schedule_payload(database, provider_user_id).policy
