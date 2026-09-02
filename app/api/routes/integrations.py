"""Document this first-party Python module."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request
from pymongo.database import Database

from app.api.dependencies import get_current_user, get_database
from app.models.integrations import (
    IntegrationConnectionResponse,
    IntegrationConnectionState,
    IntegrationDefinition,
)
from app.services.audit import log_audit_event
from app.services.authorization import require_provider
from app.services.integrations import list_integration_definitions

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get(
    "/catalog",
    response_model=list[IntegrationDefinition],
    summary="List provider integrations and commercial availability",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Provider role is required"},
    },
)
def integration_catalog(
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[IntegrationDefinition]:
    """Handle integration catalog.

    Args:
        request: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    require_provider(database, current_user=current_user, request=request)
    log_audit_event(
        database,
        action="INTEGRATION_CATALOG_LISTED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        resource_type="integration_catalog",
        request=request,
    )
    return list_integration_definitions()


@router.get(
    "/connections",
    response_model=list[IntegrationConnectionResponse],
    summary="List integration connection health for the authenticated provider",
    responses={
        401: {"description": "Missing, invalid, or expired access token"},
        403: {"description": "Provider role is required"},
    },
)
def integration_connections(
    request: Request,
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[IntegrationConnectionResponse]:
    """Handle integration connections.

    Args:
        request: Function argument.
        database: Function argument.
        current_user: Function argument.

    Returns:
        Function result.
    """
    require_provider(database, current_user=current_user, request=request)
    records = database.integration_connections.find(
        {"provider_user_id": current_user["_id"]},
        {
            "integration_key": 1,
            "state": 1,
            "connected_at": 1,
            "updated_at": 1,
            "last_sync_at": 1,
        },
    ).sort("integration_key", 1)

    responses = [
        IntegrationConnectionResponse(
            integration_key=record["integration_key"],
            state=IntegrationConnectionState(record.get("state", "AVAILABLE")),
            connected_at=record.get("connected_at"),
            updated_at=record.get("updated_at"),
            last_sync_at=record.get("last_sync_at"),
        )
        for record in records
    ]
    log_audit_event(
        database,
        action="INTEGRATION_CONNECTIONS_LISTED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        resource_type="integration_connection",
        request=request,
    )
    return responses
