# Provider integration architecture

This document defines the V2 integration boundary for the provider platform.

## Product goal

Integrations are first-class provider capabilities and a future commercial surface. The core platform owns the catalog, connection state, entitlement metadata, authorization, auditing, and sync contracts. Vendor-specific adapters live behind those contracts.

## Current foundation

The provider-facing catalog includes planned adapters for:

- Google Calendar
- Microsoft Outlook Calendar
- Zoom
- Stripe
- Zapier / outgoing webhooks

Each definition declares:

- category
- provider-facing description
- capabilities
- setup type
- availability
- entitlement (`INCLUDED`, `PLAN_GATED`, or `PAID_ADDON`)

The API currently exposes catalog metadata and provider-scoped connection health only. It intentionally does **not** expose token or credential fields.

## Connection security boundary

Future connection creation must follow these rules:

1. OAuth authorization code + PKCE where the vendor supports it.
2. OAuth state and redirect URI validation are mandatory.
3. Provider secrets and tokens are encrypted server-side and never returned to the browser.
4. Refresh/access tokens are stored separately from provider-visible connection metadata.
5. Disconnect/revoke flows remove or invalidate credentials and leave an auditable lifecycle event.
6. Webhook handlers verify signatures and implement replay/idempotency protection.
7. Sync workers use retry/backoff and checkpoint state rather than request-thread retries.
8. Logs and audit metadata never include credential values or sensitive vendor payloads.

## Adapter contract direction

A vendor adapter should eventually implement a narrow capability-oriented interface rather than being called directly from booking, billing, or session business logic. Examples include:

- calendar availability read/write
- booking create/update/delete sync
- meeting room provisioning
- payment/customer/account operations
- outgoing automation event delivery

Core features should publish intent/events to the integration layer instead of importing vendor SDKs directly.

## Commercial model

Integration definitions carry entitlement metadata so billing can later treat an adapter as:

- included in the base product
- available only on a plan
- a separately priced add-on

The catalog does not itself enforce payment. Entitlement enforcement will be connected to the billing service when the billing foundation lands.

## Compatibility

V2 presents `PROVIDER` / `PARTICIPANT` vocabulary while existing database role values remain `THERAPIST` / `CLIENT`. This avoids a flag-day data migration and keeps V1 tokens and endpoints valid during the transition.
