# Provider business and service catalog

The provider business layer keeps the platform vertical-neutral. A provider can describe the business they operate, publish selected profile information, and define services that later scheduling and billing features can reference.

## Provider profile

A provider profile supports:

- display and business names
- provider type
- headline and bio
- categories used as future discovery/matching metadata
- optional pronouns
- IANA timezone and locale
- service locations
- provider-supplied credentials/certifications
- public slug
- explicit publish state

Profiles are private by default. Publishing requires a unique public slug.

Locations and credentials each have their own public flag. The public API filters these collections before serialization so private addresses, credential references, and internal items do not leak into public pages.

Credential data is provider-supplied. The product must not imply that displaying a credential means the platform independently verified it unless a separate verification system is introduced later.

## Service catalog

Services are provider-owned and include:

- name and description
- duration in minutes
- price as integer minor units plus ISO-style three-letter currency code
- delivery mode: virtual, in person, hybrid, or async
- capacity
- location labels
- intake-required flag
- public/private visibility
- active state

Money is never stored as floating-point currency. For example, USD 75.00 is stored as `price_minor=7500` and `currency=USD`.

Services are archived instead of hard-deleted. This allows future bookings, invoices, receipts, analytics, and audit records to continue referencing the historical service definition.

## Public provider page

`GET /public/providers/{slug}` requires no authentication but only returns a profile when `is_public=true`. The response contains:

- public profile fields
- only locations marked public
- only credentials marked public
- only active, public, non-archived services

It deliberately omits the account email and internal provider user ID.

The web app renders the same data at `/p/{slug}`. Booking UI remains disabled until the scheduling engine exists; the public profile must not imply that a booking has been accepted when no booking workflow exists.

## Future dependencies

This model is intended to become the source of truth for:

- scheduling and availability (#39)
- payments/packages/subscriptions (#43)
- provider discovery and matching (#47)
- analytics (#49)
- organizations/teams (#48)

Those features should reference service IDs and provider ownership rather than duplicating price, duration, delivery, or business identity logic in their own modules.
