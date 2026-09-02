"""Document this first-party Python module."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pymongo import ReturnDocument
from pymongo.database import Database

from app.api.dependencies import get_current_user, get_database
from app.models.scheduling import (
    AvailabilityResponse,
    BookingCreate,
    BookingResponse,
    BookingReschedule,
    BookingStatus,
    BookingStatusUpdate,
    ProviderScheduleResponse,
    ProviderScheduleUpsert,
)
from app.services.audit import log_audit_event
from app.services.authorization import (
    authorize_subject_participant_access,
    is_participant_role,
    is_provider_role,
    require_provider,
)
from app.services.scheduling import (
    build_reservation,
    generate_availability,
    is_exact_available_start,
    move_interval_same_day,
    provider_timezone,
    release_interval,
    reserve_interval,
    schedule_policy,
    serialize_booking,
    serialize_schedule,
)

UTC = timezone.utc
router = APIRouter(tags=["scheduling"])


def _service_or_404(database: Database, service_id: str) -> dict[str, Any]:
    """Handle service or 404.

    Args:
        database: Function argument.
        service_id: Function argument.

    Returns:
        Function result.
    """
    if not ObjectId.is_valid(service_id):
        raise HTTPException(status_code=404, detail="Service not found")
    service = database.provider_services.find_one(
        {"_id": ObjectId(service_id), "archived_at": {"$exists": False}}
    )
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


def _authorize_service_access(
    database: Database,
    *,
    service: dict[str, Any],
    current_user: dict[str, Any],
) -> None:
    """Handle authorize service access.

    Args:
        database: Function argument.
        service: Function argument.
        current_user: Function argument.
    """
    role = current_user.get("role")
    if is_provider_role(role) and service["provider_user_id"] == current_user["_id"]:
        return
    if is_participant_role(role) and current_user.get("therapist_id") == service["provider_user_id"]:
        return
    raise HTTPException(status_code=404, detail="Service not found")


def _validate_date_range(date_from: date, date_to: date) -> None:
    """Handle validate date range.

    Args:
        date_from: Function argument.
        date_to: Function argument.
    """
    if date_to < date_from:
        raise HTTPException(status_code=422, detail="date_to must be on or after date_from")
    if (date_to - date_from).days > 31:
        raise HTTPException(status_code=422, detail="availability range cannot exceed 32 days")


def _booking_for_user_or_404(
    database: Database,
    *,
    booking_id: str,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    """Handle booking for user or 404.

    Args:
        database: Function argument.
        booking_id: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    if not ObjectId.is_valid(booking_id):
        raise HTTPException(status_code=404, detail="Booking not found")
    booking = database.bookings.find_one({"_id": ObjectId(booking_id)})
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    role = current_user.get("role")
    authorized = (
        is_provider_role(role)
        and booking["provider_user_id"] == current_user["_id"]
    ) or (
        is_participant_role(role)
        and booking["participant_user_id"] == current_user["_id"]
    )
    if not authorized:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


def _validate_schedule_service_ids(
    database: Database,
    *,
    provider_user_id: ObjectId,
    payload: ProviderScheduleUpsert,
) -> None:
    """Handle validate schedule service ids.

    Args:
        database: Function argument.
        provider_user_id: Function argument.
        payload: Function argument.
    """
    referenced = {
        service_id
        for item in [*payload.weekly_rules, *payload.exceptions]
        for service_id in item.service_ids
    }
    if not referenced:
        return
    object_ids = [ObjectId(value) for value in referenced if ObjectId.is_valid(value)]
    if len(object_ids) != len(referenced):
        raise HTTPException(status_code=422, detail="schedule references an invalid service")
    owned = database.provider_services.count_documents(
        {
            "_id": {"$in": object_ids},
            "provider_user_id": provider_user_id,
            "archived_at": {"$exists": False},
        }
    )
    if owned != len(referenced):
        raise HTTPException(status_code=422, detail="schedule references an unavailable service")


@router.get(
    "/provider/schedule",
    response_model=ProviderScheduleResponse | None,
    summary="Return the authenticated provider scheduling configuration",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Provider role is required"},
    },
)
def get_provider_schedule(
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ProviderScheduleResponse | None:
    """Handle get provider schedule.

    Args:
        request: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    require_provider(database, current_user=current_user, request=request)
    document = database.provider_schedules.find_one(
        {"provider_user_id": current_user["_id"]}
    )
    return serialize_schedule(database, document) if document else None


@router.put(
    "/provider/schedule",
    response_model=ProviderScheduleResponse,
    summary="Create or replace provider availability rules and scheduling policy",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Provider role is required"},
        422: {"description": "Request validation failed"},
    },
)
def put_provider_schedule(
    payload: ProviderScheduleUpsert,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ProviderScheduleResponse:
    """Handle put provider schedule.

    Args:
        payload: Function argument.
        request: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    require_provider(database, current_user=current_user, request=request)
    _validate_schedule_service_ids(
        database,
        provider_user_id=current_user["_id"],
        payload=payload,
    )
    now = datetime.now(UTC)
    values = payload.model_dump(mode="json")
    document = database.provider_schedules.find_one_and_update(
        {"provider_user_id": current_user["_id"]},
        {
            "$set": {**values, "updated_at": now},
            "$setOnInsert": {
                "provider_user_id": current_user["_id"],
                "created_at": now,
            },
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    if document is None:
        raise HTTPException(status_code=500, detail="Schedule update failed")
    log_audit_event(
        database,
        action="PROVIDER_SCHEDULE_UPDATED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        resource_type="provider_schedule",
        resource_id=str(current_user["_id"]),
        request=request,
    )
    return serialize_schedule(database, document)


@router.get(
    "/availability",
    response_model=AvailabilityResponse,
    summary="List bookable service slots for an authorized provider relationship",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        404: {"description": "Service was not found or is not accessible"},
        422: {"description": "Invalid availability range"},
    },
)
def protected_availability(
    service_id: str = Query(..., min_length=1, max_length=64),
    date_from: date = Query(...),
    date_to: date = Query(...),
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> AvailabilityResponse:
    """Handle protected availability.

    Args:
        service_id: Function argument.
        date_from: Function argument.
        date_to: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    _validate_date_range(date_from, date_to)
    service = _service_or_404(database, service_id)
    _authorize_service_access(database, service=service, current_user=current_user)
    if not service.get("active", True):
        raise HTTPException(status_code=404, detail="Service not found")
    return generate_availability(
        database,
        service=service,
        date_from=date_from,
        date_to=date_to,
    )


@router.get(
    "/public/providers/{slug}/services/{service_id}/slots",
    response_model=AvailabilityResponse,
    summary="List public bookable slots for a published provider service",
    responses={
        404: {"description": "Published provider or public service was not found"},
        422: {"description": "Invalid availability range"},
    },
)
def public_availability(
    slug: str,
    service_id: str,
    date_from: date = Query(...),
    date_to: date = Query(...),
    database: Database = Depends(get_database),
) -> AvailabilityResponse:
    """Handle public availability.

    Args:
        slug: Function argument.
        service_id: Function argument.
        date_from: Function argument.
        date_to: Function argument.
        database: Function argument.

    Returns:
        Function result.
    """
    _validate_date_range(date_from, date_to)
    profile = database.provider_profiles.find_one(
        {"public_slug": slug.lower(), "is_public": True}
    )
    if profile is None or not ObjectId.is_valid(service_id):
        raise HTTPException(status_code=404, detail="Public service not found")
    service = database.provider_services.find_one(
        {
            "_id": ObjectId(service_id),
            "provider_user_id": profile["provider_user_id"],
            "active": True,
            "is_public": True,
            "archived_at": {"$exists": False},
        }
    )
    if service is None:
        raise HTTPException(status_code=404, detail="Public service not found")
    return generate_availability(
        database,
        service=service,
        date_from=date_from,
        date_to=date_to,
    )


@router.post(
    "/bookings",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Book an available provider service slot",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Booking is not permitted for this account"},
        404: {"description": "Service or participant was not found"},
        409: {"description": "Slot is no longer available"},
        422: {"description": "Request validation failed"},
    },
)
def create_booking(
    payload: BookingCreate,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> BookingResponse:
    """Handle create booking.

    Args:
        payload: Function argument.
        request: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    service = _service_or_404(database, payload.service_id)
    if not service.get("active", True):
        raise HTTPException(status_code=404, detail="Service not found")

    role = current_user.get("role")
    if is_provider_role(role):
        if service["provider_user_id"] != current_user["_id"]:
            raise HTTPException(status_code=404, detail="Service not found")
        if payload.participant_id is None:
            raise HTTPException(status_code=422, detail="participant_id is required for provider-created bookings")
        participant = authorize_subject_participant_access(
            database,
            subject_user_id=payload.participant_id,
            provider_user=current_user,
            request=request,
        )
    elif is_participant_role(role):
        if current_user.get("therapist_id") != service["provider_user_id"]:
            raise HTTPException(status_code=404, detail="Service not found")
        if payload.participant_id not in {None, str(current_user["_id"])}:
            raise HTTPException(status_code=403, detail="Cannot book for another participant")
        participant = current_user
    else:
        raise HTTPException(status_code=403, detail="Booking is not permitted")

    starts_at = payload.starts_at.astimezone(UTC)
    if not is_exact_available_start(database, service=service, starts_at=starts_at):
        raise HTTPException(status_code=409, detail="Slot is no longer available")
    ends_at = starts_at + timedelta(minutes=service["duration_minutes"])
    booking_id = ObjectId()
    reservation, local_date = build_reservation(
        database,
        booking_id=booking_id,
        provider_user_id=service["provider_user_id"],
        participant_user_id=participant["_id"],
        service_id=service["_id"],
        starts_at=starts_at,
        ends_at=ends_at,
    )
    if not reserve_interval(
        database,
        provider_user_id=service["provider_user_id"],
        local_date=local_date,
        reservation=reservation,
    ):
        raise HTTPException(status_code=409, detail="Slot is no longer available")

    now = datetime.now(UTC)
    booking: dict[str, Any] = {
        "_id": booking_id,
        "provider_user_id": service["provider_user_id"],
        "participant_user_id": participant["_id"],
        "service_id": service["_id"],
        "starts_at": starts_at,
        "ends_at": ends_at,
        "provider_timezone": provider_timezone(database, service["provider_user_id"]),
        "calendar_local_date": local_date,
        "status": BookingStatus.CONFIRMED.value,
        "created_by_user_id": current_user["_id"],
        "created_at": now,
        "updated_at": now,
    }
    try:
        database.bookings.insert_one(booking)
    except Exception:
        release_interval(
            database,
            provider_user_id=service["provider_user_id"],
            local_date=local_date,
            booking_id=booking_id,
        )
        raise

    log_audit_event(
        database,
        action="BOOKING_CREATED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        subject_user_id=str(participant["_id"]),
        resource_type="booking",
        resource_id=str(booking_id),
        request=request,
    )
    return serialize_booking(database, booking)


@router.get(
    "/bookings/me",
    response_model=list[BookingResponse],
    summary="List bookings visible to the authenticated provider or participant",
    responses={401: {"description": "Missing, invalid, or expired access token"}},
)
def list_my_bookings(
    booking_status: BookingStatus | None = Query(default=None, alias="status"),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[BookingResponse]:
    """Handle list my bookings.

    Args:
        booking_status: Function argument.
        date_from: Function argument.
        date_to: Function argument.
        limit: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    role = current_user.get("role")
    if is_provider_role(role):
        query: dict[str, Any] = {"provider_user_id": current_user["_id"]}
    elif is_participant_role(role):
        query = {"participant_user_id": current_user["_id"]}
    else:
        raise HTTPException(status_code=403, detail="Unsupported account role")
    if booking_status is not None:
        query["status"] = booking_status.value
    if date_from is not None or date_to is not None:
        starts: dict[str, datetime] = {}
        if date_from is not None:
            if date_from.tzinfo is None:
                raise HTTPException(status_code=422, detail="date_from must include timezone")
            starts["$gte"] = date_from.astimezone(UTC)
        if date_to is not None:
            if date_to.tzinfo is None:
                raise HTTPException(status_code=422, detail="date_to must include timezone")
            starts["$lte"] = date_to.astimezone(UTC)
        query["starts_at"] = starts
    documents = database.bookings.find(query).sort("starts_at", 1).limit(limit)
    return [serialize_booking(database, booking) for booking in documents]


@router.patch(
    "/bookings/{booking_id}/reschedule",
    response_model=BookingResponse,
    summary="Move a confirmed booking to another available slot",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        404: {"description": "Booking was not found or is not accessible"},
        409: {"description": "Booking cannot be moved or slot is unavailable"},
        422: {"description": "Request validation failed"},
    },
)
def reschedule_booking(
    booking_id: str,
    payload: BookingReschedule,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> BookingResponse:
    """Handle reschedule booking.

    Args:
        booking_id: Function argument.
        payload: Function argument.
        request: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    booking = _booking_for_user_or_404(
        database,
        booking_id=booking_id,
        current_user=current_user,
    )
    if booking["status"] != BookingStatus.CONFIRMED.value:
        raise HTTPException(status_code=409, detail="Only confirmed bookings can be rescheduled")
    policy = schedule_policy(database, booking["provider_user_id"])
    if is_participant_role(current_user.get("role")):
        if not policy.participant_reschedule_enabled:
            raise HTTPException(status_code=409, detail="Participant rescheduling is disabled")
        cutoff = booking["starts_at"] - timedelta(minutes=policy.cancellation_notice_minutes)
        if datetime.now(UTC) > cutoff:
            raise HTTPException(status_code=409, detail="Reschedule window has closed")

    service = _service_or_404(database, str(booking["service_id"]))
    starts_at = payload.starts_at.astimezone(UTC)
    if not is_exact_available_start(
        database,
        service=service,
        starts_at=starts_at,
        ignore_booking_id=booking["_id"],
    ):
        raise HTTPException(status_code=409, detail="Slot is no longer available")
    ends_at = starts_at + timedelta(minutes=service["duration_minutes"])
    reservation, new_local_date = build_reservation(
        database,
        booking_id=booking["_id"],
        provider_user_id=booking["provider_user_id"],
        participant_user_id=booking["participant_user_id"],
        service_id=booking["service_id"],
        starts_at=starts_at,
        ends_at=ends_at,
    )
    old_local_date = booking["calendar_local_date"]

    if new_local_date == old_local_date:
        moved = move_interval_same_day(
            database,
            provider_user_id=booking["provider_user_id"],
            local_date=old_local_date,
            booking_id=booking["_id"],
            reservation=reservation,
        )
        if not moved:
            raise HTTPException(status_code=409, detail="Slot is no longer available")
    else:
        if not reserve_interval(
            database,
            provider_user_id=booking["provider_user_id"],
            local_date=new_local_date,
            reservation=reservation,
        ):
            raise HTTPException(status_code=409, detail="Slot is no longer available")

    now = datetime.now(UTC)
    updated = database.bookings.find_one_and_update(
        {"_id": booking["_id"], "status": BookingStatus.CONFIRMED.value},
        {
            "$set": {
                "starts_at": starts_at,
                "ends_at": ends_at,
                "calendar_local_date": new_local_date,
                "updated_at": now,
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        if new_local_date != old_local_date:
            release_interval(
                database,
                provider_user_id=booking["provider_user_id"],
                local_date=new_local_date,
                booking_id=booking["_id"],
            )
        raise HTTPException(status_code=409, detail="Booking changed before reschedule completed")
    if new_local_date != old_local_date:
        release_interval(
            database,
            provider_user_id=booking["provider_user_id"],
            local_date=old_local_date,
            booking_id=booking["_id"],
        )

    log_audit_event(
        database,
        action="BOOKING_RESCHEDULED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        subject_user_id=str(booking["participant_user_id"]),
        resource_type="booking",
        resource_id=booking_id,
        request=request,
    )
    return serialize_booking(database, updated)


@router.post(
    "/bookings/{booking_id}/cancel",
    response_model=BookingResponse,
    summary="Cancel a confirmed booking and release its reserved provider time",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        404: {"description": "Booking was not found or is not accessible"},
        409: {"description": "Booking cannot be cancelled"},
    },
)
def cancel_booking(
    booking_id: str,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> BookingResponse:
    """Handle cancel booking.

    Args:
        booking_id: Function argument.
        request: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    booking = _booking_for_user_or_404(
        database,
        booking_id=booking_id,
        current_user=current_user,
    )
    if booking["status"] != BookingStatus.CONFIRMED.value:
        raise HTTPException(status_code=409, detail="Only confirmed bookings can be cancelled")
    policy = schedule_policy(database, booking["provider_user_id"])
    if is_participant_role(current_user.get("role")):
        if not policy.participant_cancel_enabled:
            raise HTTPException(status_code=409, detail="Participant cancellation is disabled")
        cutoff = booking["starts_at"] - timedelta(minutes=policy.cancellation_notice_minutes)
        if datetime.now(UTC) > cutoff:
            raise HTTPException(status_code=409, detail="Cancellation window has closed")

    now = datetime.now(UTC)
    updated = database.bookings.find_one_and_update(
        {"_id": booking["_id"], "status": BookingStatus.CONFIRMED.value},
        {
            "$set": {
                "status": BookingStatus.CANCELLED.value,
                "cancelled_at": now,
                "updated_at": now,
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        raise HTTPException(status_code=409, detail="Booking changed before cancellation completed")
    release_interval(
        database,
        provider_user_id=booking["provider_user_id"],
        local_date=booking["calendar_local_date"],
        booking_id=booking["_id"],
    )
    log_audit_event(
        database,
        action="BOOKING_CANCELLED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        subject_user_id=str(booking["participant_user_id"]),
        resource_type="booking",
        resource_id=booking_id,
        request=request,
    )
    return serialize_booking(database, updated)


@router.patch(
    "/bookings/{booking_id}/status",
    response_model=BookingResponse,
    summary="Mark a provider booking completed or no-show",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Provider role is required"},
        404: {"description": "Booking was not found or is not owned"},
        409: {"description": "Booking cannot transition"},
        422: {"description": "Request validation failed"},
    },
)
def update_booking_status(
    booking_id: str,
    payload: BookingStatusUpdate,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> BookingResponse:
    """Handle update booking status.

    Args:
        booking_id: Function argument.
        payload: Function argument.
        request: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    require_provider(database, current_user=current_user, request=request)
    booking = _booking_for_user_or_404(
        database,
        booking_id=booking_id,
        current_user=current_user,
    )
    if booking["status"] != BookingStatus.CONFIRMED.value:
        raise HTTPException(status_code=409, detail="Only confirmed bookings can transition")
    if datetime.now(UTC) < booking["starts_at"]:
        raise HTTPException(status_code=409, detail="Booking has not started yet")
    now = datetime.now(UTC)
    updated = database.bookings.find_one_and_update(
        {"_id": booking["_id"], "status": BookingStatus.CONFIRMED.value},
        {"$set": {"status": payload.status.value, "updated_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    if updated is None:
        raise HTTPException(status_code=409, detail="Booking changed before status update completed")
    release_interval(
        database,
        provider_user_id=booking["provider_user_id"],
        local_date=booking["calendar_local_date"],
        booking_id=booking["_id"],
    )
    log_audit_event(
        database,
        action="BOOKING_STATUS_UPDATED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        subject_user_id=str(booking["participant_user_id"]),
        resource_type="booking",
        resource_id=booking_id,
        request=request,
    )
    return serialize_booking(database, updated)
