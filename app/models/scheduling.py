from __future__ import annotations

from datetime import date, datetime, time
from enum import StrEnum

from pydantic import BaseModel, Field, field_validator, model_validator


class AvailabilityExceptionKind(StrEnum):
    AVAILABLE = "AVAILABLE"
    UNAVAILABLE = "UNAVAILABLE"


class BookingStatus(StrEnum):
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    NO_SHOW = "NO_SHOW"


class SchedulePolicy(BaseModel):
    slot_interval_minutes: int = Field(default=15, ge=5, le=120)
    minimum_notice_minutes: int = Field(default=120, ge=0, le=43_200)
    booking_horizon_days: int = Field(default=60, ge=1, le=365)
    buffer_before_minutes: int = Field(default=0, ge=0, le=240)
    buffer_after_minutes: int = Field(default=0, ge=0, le=240)
    cancellation_notice_minutes: int = Field(default=0, ge=0, le=43_200)
    participant_reschedule_enabled: bool = True
    participant_cancel_enabled: bool = True


class AvailabilityRule(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start_local: time
    end_local: time
    service_ids: list[str] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def validate_window(self) -> AvailabilityRule:
        if self.end_local <= self.start_local:
            raise ValueError("end_local must be later than start_local")
        return self

    @field_validator("service_ids")
    @classmethod
    def normalize_service_ids(cls, values: list[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for raw in values:
            value = raw.strip()
            if not value:
                continue
            if value in seen:
                continue
            seen.add(value)
            normalized.append(value)
        return normalized


class AvailabilityException(BaseModel):
    date_local: date
    kind: AvailabilityExceptionKind
    start_local: time | None = None
    end_local: time | None = None
    service_ids: list[str] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def validate_window(self) -> AvailabilityException:
        has_start = self.start_local is not None
        has_end = self.end_local is not None
        if has_start != has_end:
            raise ValueError("start_local and end_local must be supplied together")
        if has_start and self.end_local <= self.start_local:
            raise ValueError("end_local must be later than start_local")
        if self.kind == AvailabilityExceptionKind.AVAILABLE and not has_start:
            raise ValueError("AVAILABLE exceptions require a time window")
        return self

    @field_validator("service_ids")
    @classmethod
    def normalize_service_ids(cls, values: list[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for raw in values:
            value = raw.strip()
            if not value or value in seen:
                continue
            seen.add(value)
            normalized.append(value)
        return normalized


class ProviderScheduleUpsert(BaseModel):
    policy: SchedulePolicy = Field(default_factory=SchedulePolicy)
    weekly_rules: list[AvailabilityRule] = Field(default_factory=list, max_length=100)
    exceptions: list[AvailabilityException] = Field(default_factory=list, max_length=366)


class ProviderScheduleResponse(ProviderScheduleUpsert):
    provider_user_id: str
    timezone: str
    created_at: datetime
    updated_at: datetime


class AvailabilitySlot(BaseModel):
    starts_at: datetime
    ends_at: datetime
    provider_timezone: str
    local_date: date


class AvailabilityResponse(BaseModel):
    service_id: str
    provider_user_id: str
    provider_timezone: str
    date_from: date
    date_to: date
    slots: list[AvailabilitySlot]


class BookingCreate(BaseModel):
    service_id: str = Field(min_length=1, max_length=64)
    starts_at: datetime
    participant_id: str | None = Field(default=None, min_length=1, max_length=64)

    @field_validator("starts_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("starts_at must include a timezone offset")
        return value


class BookingReschedule(BaseModel):
    starts_at: datetime

    @field_validator("starts_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("starts_at must include a timezone offset")
        return value


class BookingResponse(BaseModel):
    id: str
    provider_user_id: str
    participant_user_id: str
    service_id: str
    service_name: str
    provider_display_name: str | None = None
    starts_at: datetime
    ends_at: datetime
    provider_timezone: str
    status: BookingStatus
    created_by_user_id: str
    created_at: datetime
    updated_at: datetime
    cancelled_at: datetime | None = None
