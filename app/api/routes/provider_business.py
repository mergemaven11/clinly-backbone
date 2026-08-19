from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pymongo import ReturnDocument
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.api.dependencies import get_current_user, get_database
from app.models.provider_business import (
    ProviderProfileResponse,
    ProviderProfileUpsert,
    PublicProviderPage,
    PublicProviderProfile,
    PublicServiceResponse,
    ServiceCreate,
    ServiceResponse,
    ServiceUpdate,
)
from app.services.audit import log_audit_event
from app.services.authorization import require_provider

router = APIRouter(tags=["provider-business"])


def _credential_document(value: dict[str, Any]) -> dict[str, Any]:
    expires_on = value.get("expires_on")
    if isinstance(expires_on, date):
        value = {**value, "expires_on": expires_on.isoformat()}
    return value


def _profile_write_document(payload: ProviderProfileUpsert) -> dict[str, Any]:
    data = payload.model_dump()
    data["locations"] = [location.model_dump() for location in payload.locations]
    data["credentials"] = [
        _credential_document(credential.model_dump()) for credential in payload.credentials
    ]
    return data


def _serialize_profile(document: dict[str, Any]) -> ProviderProfileResponse:
    return ProviderProfileResponse(
        provider_user_id=str(document["provider_user_id"]),
        display_name=document["display_name"],
        business_name=document.get("business_name"),
        provider_type=document.get("provider_type"),
        headline=document.get("headline"),
        bio=document.get("bio"),
        categories=document.get("categories", []),
        pronouns=document.get("pronouns"),
        timezone=document.get("timezone", "UTC"),
        locale=document.get("locale", "en-US"),
        locations=document.get("locations", []),
        credentials=document.get("credentials", []),
        public_slug=document.get("public_slug"),
        is_public=document.get("is_public", False),
        created_at=document["created_at"],
        updated_at=document["updated_at"],
    )


def _serialize_service(document: dict[str, Any]) -> ServiceResponse:
    return ServiceResponse(
        id=str(document["_id"]),
        provider_user_id=str(document["provider_user_id"]),
        name=document["name"],
        description=document.get("description"),
        duration_minutes=document["duration_minutes"],
        price_minor=document["price_minor"],
        currency=document["currency"],
        delivery_mode=document["delivery_mode"],
        capacity=document.get("capacity", 1),
        location_labels=document.get("location_labels", []),
        intake_required=document.get("intake_required", False),
        is_public=document.get("is_public", False),
        active=document.get("active", True),
        created_at=document["created_at"],
        updated_at=document["updated_at"],
        archived_at=document.get("archived_at"),
    )


def _serialize_public_service(document: dict[str, Any]) -> PublicServiceResponse:
    return PublicServiceResponse(
        id=str(document["_id"]),
        name=document["name"],
        description=document.get("description"),
        duration_minutes=document["duration_minutes"],
        price_minor=document["price_minor"],
        currency=document["currency"],
        delivery_mode=document["delivery_mode"],
        capacity=document.get("capacity", 1),
        location_labels=document.get("location_labels", []),
        intake_required=document.get("intake_required", False),
    )


def _owned_service_or_404(
    database: Database,
    *,
    service_id: str,
    provider_user_id: ObjectId,
) -> dict[str, Any]:
    if not ObjectId.is_valid(service_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    document = database.provider_services.find_one(
        {"_id": ObjectId(service_id), "provider_user_id": provider_user_id}
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    return document


@router.get(
    "/provider/profile",
    response_model=ProviderProfileResponse | None,
    summary="Return the authenticated provider business profile",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Provider role is required"},
    },
)
def get_provider_profile(
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ProviderProfileResponse | None:
    require_provider(database, current_user=current_user, request=request)
    document = database.provider_profiles.find_one(
        {"provider_user_id": current_user["_id"]}
    )
    return _serialize_profile(document) if document else None


@router.put(
    "/provider/profile",
    response_model=ProviderProfileResponse,
    summary="Create or update the authenticated provider business profile",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Provider role is required"},
        409: {"description": "Public profile slug is already in use"},
        422: {"description": "Request validation failed"},
    },
)
def upsert_provider_profile(
    payload: ProviderProfileUpsert,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ProviderProfileResponse:
    require_provider(database, current_user=current_user, request=request)
    now = datetime.now(timezone.utc)
    values = _profile_write_document(payload)
    public_slug = values.pop("public_slug", None)
    set_values = {**values, "updated_at": now}
    if public_slug:
        set_values["public_slug"] = public_slug

    update: dict[str, Any] = {
        "$set": set_values,
        "$setOnInsert": {
            "provider_user_id": current_user["_id"],
            "created_at": now,
        },
    }
    if not public_slug:
        update["$unset"] = {"public_slug": ""}

    try:
        document = database.provider_profiles.find_one_and_update(
            {"provider_user_id": current_user["_id"]},
            update,
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Public profile slug is already in use",
        ) from exc

    if document is None:
        raise HTTPException(status_code=500, detail="Profile update failed")
    log_audit_event(
        database,
        action="PROVIDER_PROFILE_UPDATED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        resource_type="provider_profile",
        resource_id=str(current_user["_id"]),
        request=request,
    )
    return _serialize_profile(document)


@router.get(
    "/provider/services",
    response_model=list[ServiceResponse],
    summary="List services owned by the authenticated provider",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Provider role is required"},
    },
)
def list_provider_services(
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[ServiceResponse]:
    require_provider(database, current_user=current_user, request=request)
    documents = database.provider_services.find(
        {
            "provider_user_id": current_user["_id"],
            "archived_at": {"$exists": False},
        }
    ).sort("name", 1)
    return [_serialize_service(document) for document in documents]


@router.post(
    "/provider/services",
    response_model=ServiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a provider service",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Provider role is required"},
        422: {"description": "Request validation failed"},
    },
)
def create_provider_service(
    payload: ServiceCreate,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ServiceResponse:
    require_provider(database, current_user=current_user, request=request)
    now = datetime.now(timezone.utc)
    document: dict[str, Any] = {
        **payload.model_dump(mode="json"),
        "provider_user_id": current_user["_id"],
        "created_at": now,
        "updated_at": now,
    }
    result = database.provider_services.insert_one(document)
    document["_id"] = result.inserted_id
    log_audit_event(
        database,
        action="PROVIDER_SERVICE_CREATED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        resource_type="provider_service",
        resource_id=str(result.inserted_id),
        request=request,
    )
    return _serialize_service(document)


@router.patch(
    "/provider/services/{service_id}",
    response_model=ServiceResponse,
    summary="Update an owned provider service",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Provider role is required"},
        404: {"description": "Service was not found or is not owned"},
        422: {"description": "Request validation failed"},
    },
)
def update_provider_service(
    service_id: str,
    payload: ServiceUpdate,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ServiceResponse:
    require_provider(database, current_user=current_user, request=request)
    current = _owned_service_or_404(
        database,
        service_id=service_id,
        provider_user_id=current_user["_id"],
    )
    values = payload.model_dump(exclude_unset=True, mode="json")
    if not values:
        return _serialize_service(current)
    values["updated_at"] = datetime.now(timezone.utc)
    document = database.provider_services.find_one_and_update(
        {"_id": current["_id"], "provider_user_id": current_user["_id"]},
        {"$set": values},
        return_document=ReturnDocument.AFTER,
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    log_audit_event(
        database,
        action="PROVIDER_SERVICE_UPDATED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        resource_type="provider_service",
        resource_id=service_id,
        request=request,
    )
    return _serialize_service(document)


@router.delete(
    "/provider/services/{service_id}",
    response_model=ServiceResponse,
    summary="Archive an owned provider service",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Provider role is required"},
        404: {"description": "Service was not found or is not owned"},
    },
)
def archive_provider_service(
    service_id: str,
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ServiceResponse:
    require_provider(database, current_user=current_user, request=request)
    current = _owned_service_or_404(
        database,
        service_id=service_id,
        provider_user_id=current_user["_id"],
    )
    now = datetime.now(timezone.utc)
    document = database.provider_services.find_one_and_update(
        {"_id": current["_id"], "provider_user_id": current_user["_id"]},
        {"$set": {"active": False, "archived_at": now, "updated_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    log_audit_event(
        database,
        action="PROVIDER_SERVICE_ARCHIVED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        resource_type="provider_service",
        resource_id=service_id,
        request=request,
    )
    return _serialize_service(document)


@router.get(
    "/public/providers/{slug}",
    response_model=PublicProviderPage,
    summary="Return a published provider profile and public active services",
    responses={404: {"description": "Published provider profile was not found"}},
)
def public_provider_page(
    slug: str,
    database: Database = Depends(get_database),
) -> PublicProviderPage:
    profile = database.provider_profiles.find_one(
        {"public_slug": slug.lower(), "is_public": True}
    )
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider profile not found",
        )

    public_locations = [
        location for location in profile.get("locations", []) if location.get("public", False)
    ]
    public_credentials = [
        credential
        for credential in profile.get("credentials", [])
        if credential.get("public", False)
    ]
    public_profile = PublicProviderProfile(
        display_name=profile["display_name"],
        business_name=profile.get("business_name"),
        provider_type=profile.get("provider_type"),
        headline=profile.get("headline"),
        bio=profile.get("bio"),
        categories=profile.get("categories", []),
        pronouns=profile.get("pronouns"),
        timezone=profile.get("timezone", "UTC"),
        locale=profile.get("locale", "en-US"),
        locations=public_locations,
        credentials=public_credentials,
        public_slug=profile["public_slug"],
    )

    services = database.provider_services.find(
        {
            "provider_user_id": profile["provider_user_id"],
            "active": True,
            "is_public": True,
            "archived_at": {"$exists": False},
        }
    ).sort("name", 1)
    return PublicProviderPage(
        profile=public_profile,
        services=[_serialize_public_service(service) for service in services],
    )
