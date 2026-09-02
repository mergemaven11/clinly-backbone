"""Document this first-party Python module."""
from __future__ import annotations

from app.models.integrations import (
    IntegrationAvailability,
    IntegrationCategory,
    IntegrationDefinition,
    IntegrationEntitlement,
    IntegrationSetupType,
)


INTEGRATION_CATALOG: tuple[IntegrationDefinition, ...] = (
    IntegrationDefinition(
        key="google_calendar",
        display_name="Google Calendar",
        category=IntegrationCategory.CALENDAR,
        description="Sync provider availability and bookings with Google Calendar.",
        capabilities=["calendar_read", "calendar_write", "booking_sync"],
        availability=IntegrationAvailability.PLANNED,
        entitlement=IntegrationEntitlement.PAID_ADDON,
        setup_type=IntegrationSetupType.OAUTH2_PKCE,
    ),
    IntegrationDefinition(
        key="microsoft_outlook",
        display_name="Microsoft Outlook Calendar",
        category=IntegrationCategory.CALENDAR,
        description="Sync provider availability and bookings with Microsoft Outlook.",
        capabilities=["calendar_read", "calendar_write", "booking_sync"],
        availability=IntegrationAvailability.PLANNED,
        entitlement=IntegrationEntitlement.PAID_ADDON,
        setup_type=IntegrationSetupType.OAUTH2_PKCE,
    ),
    IntegrationDefinition(
        key="zoom",
        display_name="Zoom",
        category=IntegrationCategory.VIDEO,
        description="Create provider session rooms from eligible bookings.",
        capabilities=["meeting_create", "meeting_join", "meeting_cancel"],
        availability=IntegrationAvailability.PLANNED,
        entitlement=IntegrationEntitlement.PLAN_GATED,
        setup_type=IntegrationSetupType.OAUTH2,
    ),
    IntegrationDefinition(
        key="stripe",
        display_name="Stripe",
        category=IntegrationCategory.PAYMENTS,
        description="Accept service payments, subscriptions, invoices, and provider payouts.",
        capabilities=["payments", "subscriptions", "invoices", "refunds", "payouts"],
        availability=IntegrationAvailability.PLANNED,
        entitlement=IntegrationEntitlement.INCLUDED,
        setup_type=IntegrationSetupType.MANAGED,
    ),
    IntegrationDefinition(
        key="zapier_webhooks",
        display_name="Zapier & Webhooks",
        category=IntegrationCategory.AUTOMATION,
        description="Send provider-approved workflow events to automation tools and custom systems.",
        capabilities=["outgoing_events", "workflow_automation"],
        availability=IntegrationAvailability.PLANNED,
        entitlement=IntegrationEntitlement.PAID_ADDON,
        setup_type=IntegrationSetupType.WEBHOOK,
    ),
)


def list_integration_definitions() -> list[IntegrationDefinition]:
    """Return the public provider-facing integration catalog without secrets."""
    return list(INTEGRATION_CATALOG)


def integration_keys() -> set[str]:
    """Handle integration keys.

    Returns:
        Function result.
    """
    return {definition.key for definition in INTEGRATION_CATALOG}
