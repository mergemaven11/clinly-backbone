"""Document this first-party Python module."""
from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, Field, field_validator, model_validator


class DeliveryMode(StrEnum):
    """Represent DeliveryMode."""
    VIRTUAL = "VIRTUAL"
    IN_PERSON = "IN_PERSON"
    HYBRID = "HYBRID"
    ASYNC = "ASYNC"


class LocationKind(StrEnum):
    """Represent LocationKind."""
    VIRTUAL = "VIRTUAL"
    IN_PERSON = "IN_PERSON"


def _optional_trim(value: object) -> object:
    """Handle optional trim.

    Args:
        value: Function argument.

    Returns:
        Function result.
    """
    if not isinstance(value, str):
        return value
    normalized = value.strip()
    return normalized or None


class ServiceLocation(BaseModel):
    """Represent ServiceLocation."""
    label: str = Field(min_length=2, max_length=120)
    kind: LocationKind
    address: str | None = Field(default=None, max_length=300)
    public: bool = False

    @field_validator("label", mode="before")
    @classmethod
    def normalize_label(cls, value: object) -> object:
        """Handle normalize label.

        Args:
            value: Function argument.

        Returns:
            Function result.
        """
        return value.strip() if isinstance(value, str) else value

    @field_validator("address", mode="before")
    @classmethod
    def normalize_address(cls, value: object) -> object:
        """Handle normalize address.

        Args:
            value: Function argument.

        Returns:
            Function result.
        """
        return _optional_trim(value)


class ProviderCredential(BaseModel):
    """Represent ProviderCredential."""
    name: str = Field(min_length=2, max_length=140)
    issuer: str | None = Field(default=None, max_length=140)
    reference: str | None = Field(default=None, max_length=140)
    expires_on: date | None = None
    public: bool = False

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: object) -> object:
        """Handle normalize name.

        Args:
            value: Function argument.

        Returns:
            Function result.
        """
        return value.strip() if isinstance(value, str) else value

    @field_validator("issuer", "reference", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        """Handle normalize optional text.

        Args:
            value: Function argument.

        Returns:
            Function result.
        """
        return _optional_trim(value)


class ProviderProfileUpsert(BaseModel):
    """Represent ProviderProfileUpsert."""
    display_name: str = Field(min_length=2, max_length=120)
    business_name: str | None = Field(default=None, max_length=160)
    provider_type: str | None = Field(default=None, max_length=100)
    headline: str | None = Field(default=None, max_length=180)
    bio: str | None = Field(default=None, max_length=2500)
    categories: list[str] = Field(default_factory=list, max_length=16)
    pronouns: str | None = Field(default=None, max_length=60)
    timezone: str = Field(default="UTC", min_length=1, max_length=80)
    locale: str = Field(default="en-US", min_length=2, max_length=24)
    locations: list[ServiceLocation] = Field(default_factory=list, max_length=12)
    credentials: list[ProviderCredential] = Field(default_factory=list, max_length=20)
    public_slug: str | None = Field(
        default=None,
        min_length=3,
        max_length=80,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )
    is_public: bool = False

    @field_validator("display_name", mode="before")
    @classmethod
    def normalize_display_name(cls, value: object) -> object:
        """Handle normalize display name.

        Args:
            value: Function argument.

        Returns:
            Function result.
        """
        return value.strip() if isinstance(value, str) else value

    @field_validator(
        "business_name",
        "provider_type",
        "headline",
        "bio",
        "pronouns",
        mode="before",
    )
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        """Handle normalize optional text.

        Args:
            value: Function argument.

        Returns:
            Function result.
        """
        return _optional_trim(value)

    @field_validator("locale", mode="before")
    @classmethod
    def normalize_locale(cls, value: object) -> object:
        """Handle normalize locale.

        Args:
            value: Function argument.

        Returns:
            Function result.
        """
        return value.strip() if isinstance(value, str) else value

    @field_validator("categories")
    @classmethod
    def normalize_categories(cls, values: list[str]) -> list[str]:
        """Handle normalize categories.

        Args:
            values: Function argument.

        Returns:
            Function result.
        """
        normalized: list[str] = []
        seen: set[str] = set()
        for raw in values:
            value = raw.strip()
            if not 2 <= len(value) <= 60:
                raise ValueError("categories must contain 2 to 60 characters")
            key = value.casefold()
            if key in seen:
                continue
            seen.add(key)
            normalized.append(value)
        return normalized

    @field_validator("timezone", mode="before")
    @classmethod
    def normalize_timezone(cls, value: object) -> object:
        """Handle normalize timezone.

        Args:
            value: Function argument.

        Returns:
            Function result.
        """
        return value.strip() if isinstance(value, str) else value

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        """Handle validate timezone.

        Args:
            value: Function argument.

        Returns:
            Function result.
        """
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("timezone must be a valid IANA timezone") from exc
        return value

    @field_validator("public_slug", mode="before")
    @classmethod
    def normalize_slug(cls, value: object) -> object:
        """Handle normalize slug.

        Args:
            value: Function argument.

        Returns:
            Function result.
        """
        if not isinstance(value, str):
            return value
        normalized = value.strip().lower()
        return normalized or None

    @model_validator(mode="after")
    def require_slug_for_public_profile(self) -> ProviderProfileUpsert:
        """Handle require slug for public profile.

        Returns:
            Function result.
        """
        if self.is_public and not self.public_slug:
            raise ValueError("public_slug is required when publishing a profile")
        return self


class ProviderProfileResponse(ProviderProfileUpsert):
    """Represent ProviderProfileResponse."""
    provider_user_id: str
    created_at: datetime
    updated_at: datetime


class PublicProviderProfile(BaseModel):
    """Represent PublicProviderProfile."""
    display_name: str
    business_name: str | None = None
    provider_type: str | None = None
    headline: str | None = None
    bio: str | None = None
    categories: list[str]
    pronouns: str | None = None
    timezone: str
    locale: str
    locations: list[ServiceLocation]
    credentials: list[ProviderCredential]
    public_slug: str


class ServiceCreate(BaseModel):
    """Represent ServiceCreate."""
    name: str = Field(min_length=2, max_length=140)
    description: str | None = Field(default=None, max_length=1800)
    duration_minutes: int = Field(ge=5, le=1440)
    price_minor: int = Field(ge=0, le=100_000_000)
    currency: str = Field(default="USD", min_length=3, max_length=3, pattern=r"^[A-Z]{3}$")
    delivery_mode: DeliveryMode
    capacity: int = Field(default=1, ge=1, le=500)
    location_labels: list[str] = Field(default_factory=list, max_length=12)
    intake_required: bool = False
    is_public: bool = False
    active: bool = True

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: object) -> object:
        """Handle normalize name.

        Args:
            value: Function argument.

        Returns:
            Function result.
        """
        return value.strip() if isinstance(value, str) else value

    @field_validator("description", mode="before")
    @classmethod
    def normalize_description(cls, value: object) -> object:
        """Handle normalize description.

        Args:
            value: Function argument.

        Returns:
            Function result.
        """
        return _optional_trim(value)

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, value: object) -> object:
        """Handle normalize currency.

        Args:
            value: Function argument.

        Returns:
            Function result.
        """
        return value.strip().upper() if isinstance(value, str) else value

    @field_validator("location_labels")
    @classmethod
    def normalize_location_labels(cls, values: list[str]) -> list[str]:
        """Handle normalize location labels.

        Args:
            values: Function argument.

        Returns:
            Function result.
        """
        normalized: list[str] = []
        seen: set[str] = set()
        for raw in values:
            value = raw.strip()
            if not 2 <= len(value) <= 120:
                raise ValueError("location labels must contain 2 to 120 characters")
            key = value.casefold()
            if key in seen:
                continue
            seen.add(key)
            normalized.append(value)
        return normalized


class ServiceUpdate(BaseModel):
    """Represent ServiceUpdate."""
    name: str | None = Field(default=None, min_length=2, max_length=140)
    description: str | None = Field(default=None, max_length=1800)
    duration_minutes: int | None = Field(default=None, ge=5, le=1440)
    price_minor: int | None = Field(default=None, ge=0, le=100_000_000)
    currency: str | None = Field(default=None, min_length=3, max_length=3, pattern=r"^[A-Z]{3}$")
    delivery_mode: DeliveryMode | None = None
    capacity: int | None = Field(default=None, ge=1, le=500)
    location_labels: list[str] | None = Field(default=None, max_length=12)
    intake_required: bool | None = None
    is_public: bool | None = None
    active: bool | None = None

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: object) -> object:
        """Handle normalize name.

        Args:
            value: Function argument.

        Returns:
            Function result.
        """
        return _optional_trim(value)

    @field_validator("description", mode="before")
    @classmethod
    def normalize_description(cls, value: object) -> object:
        """Handle normalize description.

        Args:
            value: Function argument.

        Returns:
            Function result.
        """
        return _optional_trim(value)

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, value: object) -> object:
        """Handle normalize currency.

        Args:
            value: Function argument.

        Returns:
            Function result.
        """
        if not isinstance(value, str):
            return value
        normalized = value.strip().upper()
        return normalized or None

    @field_validator("location_labels")
    @classmethod
    def normalize_location_labels(cls, values: list[str] | None) -> list[str] | None:
        """Handle normalize location labels.

        Args:
            values: Function argument.

        Returns:
            Function result.
        """
        if values is None:
            return None
        normalized: list[str] = []
        seen: set[str] = set()
        for raw in values:
            value = raw.strip()
            if not 2 <= len(value) <= 120:
                raise ValueError("location labels must contain 2 to 120 characters")
            key = value.casefold()
            if key in seen:
                continue
            seen.add(key)
            normalized.append(value)
        return normalized


class ServiceResponse(ServiceCreate):
    """Represent ServiceResponse."""
    id: str
    provider_user_id: str
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None = None


class PublicServiceResponse(BaseModel):
    """Represent PublicServiceResponse."""
    id: str
    name: str
    description: str | None = None
    duration_minutes: int
    price_minor: int
    currency: str
    delivery_mode: DeliveryMode
    capacity: int
    location_labels: list[str]
    intake_required: bool


class PublicProviderPage(BaseModel):
    """Represent PublicProviderPage."""
    profile: PublicProviderProfile
    services: list[PublicServiceResponse]
