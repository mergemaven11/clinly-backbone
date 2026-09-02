"""Document this first-party Python module."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pymongo.database import Database

from app.api.dependencies import get_current_user, get_database
from app.models.scheduling import BookableServiceResponse
from app.services.audit import log_audit_event
from app.services.authorization import is_participant_role, is_provider_role

router = APIRouter(tags=["scheduling"])


def _serialize_bookable_service(
    service: dict[str, Any],
    *,
    provider_display_name: str | None,
) -> BookableServiceResponse:
    """Handle serialize bookable service.

    Args:
        service: Function argument.
        provider_display_name: Function argument.

    Returns:
        Function result.
    """
    return BookableServiceResponse(
        id=str(service["_id"]),
        name=service["name"],
        description=service.get("description"),
        duration_minutes=service["duration_minutes"],
        price_minor=service["price_minor"],
        currency=service["currency"],
        delivery_mode=service["delivery_mode"],
        capacity=service.get("capacity", 1),
        location_labels=service.get("location_labels", []),
        intake_required=service.get("intake_required", False),
        provider_user_id=str(service["provider_user_id"]),
        provider_display_name=provider_display_name,
    )


@router.get(
    "/booking-services",
    response_model=list[BookableServiceResponse],
    summary="List active services the authenticated account may book",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Unsupported account role"},
    },
)
def list_bookable_services(
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[BookableServiceResponse]:
    """Handle list bookable services.

    Args:
        request: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    role = current_user.get("role")
    if is_provider_role(role):
        provider_user_id = current_user["_id"]
        visibility_filter: dict[str, Any] = {}
    elif is_participant_role(role) and current_user.get("therapist_id") is not None:
        provider_user_id = current_user["therapist_id"]
        visibility_filter = {"is_public": True}
    else:
        raise HTTPException(status_code=403, detail="Unsupported account role")

    profile = database.provider_profiles.find_one(
        {"provider_user_id": provider_user_id},
        {"display_name": 1},
    )
    provider_display_name = profile.get("display_name") if profile else None
    services = database.provider_services.find(
        {
            "provider_user_id": provider_user_id,
            "active": True,
            "archived_at": {"$exists": False},
            **visibility_filter,
        }
    ).sort("name", 1)
    results = [
        _serialize_bookable_service(
            service,
            provider_display_name=provider_display_name,
        )
        for service in services
    ]
    log_audit_event(
        database,
        action="BOOKING_SERVICES_LISTED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        resource_type="provider_service",
        request=request,
    )
    return results
