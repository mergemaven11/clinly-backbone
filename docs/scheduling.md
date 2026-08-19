# Scheduling architecture

The scheduling layer turns provider services into bookable time while keeping service definitions, provider ownership, and timezone configuration in their existing source-of-truth modules.

## Core invariants

1. **Services remain the source of truth.** Scheduling references service IDs for duration, provider ownership, delivery mode, and capacity. It does not copy a second service catalog into the booking module.
2. **Booking timestamps are canonical UTC.** Recurring availability rules and exceptions are entered in the provider profile's IANA timezone, then converted to UTC appointment timestamps.
3. **Displayed availability is not a reservation.** A booking must revalidate the requested start and win the atomic reservation write before it is confirmed.
4. **Provider time cannot overlap.** The provider/day booking-calendar document is the contention boundary for 1:1 appointments.
5. **Participants only book inside their provider relationship.** A participant cannot use a service or booking owned by another provider.
6. **Public visibility does not imply authorization.** Public service/slot endpoints expose only published service availability; creating or changing a booking still requires an authenticated participant/provider relationship.

## Availability model

A provider schedule contains:

- weekly local-time availability windows
- optional service restrictions per window
- date-specific available or unavailable exceptions
- slot interval
- minimum notice
- booking horizon
- before/after buffers
- participant cancellation/reschedule policy

The provider timezone comes from the provider business profile. A Monday 09:00 rule therefore means 09:00 in that provider's configured IANA timezone, including daylight-saving transitions handled by the timezone database.

Unavailable exceptions are subtracted from recurring availability. Special-hours exceptions add one-off available windows.

## Atomic provider-day reservations

Confirmed 1:1 provider time is represented inside one `booking_calendars` document per provider and provider-local calendar date.

The unique index on `(provider_user_id, local_date)` guarantees that only one calendar document can exist for that provider/day.

A reservation contains the booking ID, participant ID, service ID, appointment start/end, and the buffered block start/end.

Reservation acquisition uses a conditional Mongo update whose filter rejects any existing reservation where:

- existing block start is before the requested block end, and
- existing block end is after the requested block start.

The overlap predicate and reservation push therefore occur against one Mongo document atomically. Two concurrent requests cannot both claim overlapping provider time.

The API still checks generated availability before this write for a useful user-facing result, but the atomic write is the final authority.

## Booking lifecycle

Foundation statuses:

- `CONFIRMED`
- `CANCELLED`
- `COMPLETED`
- `NO_SHOW`

A participant may book themselves with their assigned provider. A provider may book an owned participant.

Cancellation releases the provider-day reservation. Rescheduling validates the new slot and replaces/moves the reservation. Provider completion/no-show closes the appointment and releases the reservation because the historical booking document remains the source of record.

## Public booking

Published provider profiles expose published active services at `/p/{slug}`. A 1:1 service links to `/book/{slug}/{service_id}` where a visitor can inspect live availability.

Booking confirmation requires a participant account that belongs to that provider. Public slot discovery alone never creates or reserves an appointment.

## Current capacity boundary

The foundation scheduler is a **1:1 appointment engine**. Provider services may already declare `capacity > 1`, but group-capacity session inventory is a separate scheduling model and must not be represented as repeated 1:1 bookings.

Group scheduling needs a session/seat model where one provider time block can own multiple participant reservations up to capacity. Until that expansion lands, group-capacity services must not be presented as ordinary 1:1 booking options.

## Follow-on scheduling work

The next scheduling expansion should add:

- recurring booking series with per-occurrence lifecycle
- group sessions and capacity/seat inventory
- waitlist entries and cancellation-fill offers
- booking-series exceptions
- calendar sync via the integration adapter layer
- reminder events via the notification center
- scheduling utilization/no-show analytics

These features should extend the same provider/service/booking ownership model rather than introducing parallel scheduling data models.
