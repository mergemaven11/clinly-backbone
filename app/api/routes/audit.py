from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pymongo.database import Database

from app.api.dependencies import get_current_user, get_database
from app.models.audit import AuditEventResponse
from app.services.audit import log_audit_event
from app.services.authorization import authorize_subject_client_access

router = APIRouter(tags=["audit"])
CSV_FIELDS = (
    "timestamp",
    "actor_user_id",
    "subject_user_id",
    "action",
    "resource_type",
    "resource_id",
    "success",
    "ip_address",
    "user_agent",
)


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _audit_query(
    subject_user_id: str,
    start: datetime | None,
    end: datetime | None,
) -> dict[str, Any]:
    query: dict[str, Any] = {"subject_user_id": subject_user_id}
    timestamp_filter: dict[str, datetime] = {}
    if start is not None:
        timestamp_filter["$gte"] = start
    if end is not None:
        timestamp_filter["$lte"] = end
    if timestamp_filter:
        query["timestamp"] = timestamp_filter
    return query


def _validate_range(start: datetime | None, end: datetime | None) -> None:
    if start is not None and end is not None and start > end:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="from must be before or equal to to",
        )


def _serialize_event(event: dict[str, Any]) -> AuditEventResponse:
    return AuditEventResponse(
        id=str(event["_id"]),
        timestamp=event["timestamp"],
        actor_user_id=event.get("actor_user_id"),
        subject_user_id=event.get("subject_user_id"),
        action=event["action"],
        resource_type=event.get("resource_type"),
        resource_id=event.get("resource_id"),
        success=event["success"],
        ip_address=event.get("ip_address"),
        user_agent=event.get("user_agent"),
        metadata=event.get("metadata") or {},
    )


def _safe_csv_cell(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        normalized = _normalize_datetime(value)
        if normalized is None:  # pragma: no cover - narrowed above
            return ""
        text = normalized.isoformat()
    elif isinstance(value, bool):
        text = "true" if value else "false"
    else:
        text = str(value)

    # Prevent spreadsheet formula execution if an exported metadata field such
    # as User-Agent starts with a formula sigil.
    if text.startswith(("=", "+", "-", "@")):
        return "'" + text
    return text


@router.get("/audit", response_model=list[AuditEventResponse])
def query_audit_events(
    request: Request,
    subject_user_id: str = Query(..., min_length=1, max_length=64),
    start: datetime | None = Query(None, alias="from"),
    end: datetime | None = Query(None, alias="to"),
    limit: int = Query(500, ge=1, le=2000),
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[AuditEventResponse]:
    start = _normalize_datetime(start)
    end = _normalize_datetime(end)
    _validate_range(start, end)
    authorize_subject_client_access(
        database,
        subject_user_id=subject_user_id,
        therapist_user=current_user,
        request=request,
    )

    events = list(
        database.audit_events.find(_audit_query(subject_user_id, start, end))
        .sort("timestamp", 1)
        .limit(limit)
    )
    log_audit_event(
        database,
        action="AUDIT_QUERIED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        subject_user_id=subject_user_id,
        resource_type="audit",
        request=request,
    )
    return [_serialize_event(event) for event in events]


@router.post("/export")
def export_audit_events(
    request: Request,
    subject_user_id: str = Query(..., min_length=1, max_length=64),
    start: datetime | None = Query(None, alias="from"),
    end: datetime | None = Query(None, alias="to"),
    database: Database = Depends(get_database),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Response:
    start = _normalize_datetime(start)
    end = _normalize_datetime(end)
    _validate_range(start, end)
    authorize_subject_client_access(
        database,
        subject_user_id=subject_user_id,
        therapist_user=current_user,
        request=request,
    )

    events = list(
        database.audit_events.find(_audit_query(subject_user_id, start, end)).sort(
            "timestamp", 1
        )
    )

    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=CSV_FIELDS, extrasaction="ignore")
    writer.writeheader()
    for event in events:
        writer.writerow(
            {field: _safe_csv_cell(event.get(field)) for field in CSV_FIELDS}
        )

    log_audit_event(
        database,
        action="EXPORT_GENERATED",
        success=True,
        actor_user_id=str(current_user["_id"]),
        subject_user_id=subject_user_id,
        resource_type="audit_export",
        request=request,
    )

    filename = f"clinly-audit-{subject_user_id}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
