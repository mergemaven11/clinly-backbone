# Provider API V2 compatibility layer

The V2 API uses provider-neutral terminology while preserving the V1 storage contract.

## V2 vocabulary

- `PROVIDER` is the product/API term for the legacy stored role `THERAPIST`.
- `PARTICIPANT` is the product/API term for the legacy stored role `CLIENT`.
- `provider_id` is the V2 response field corresponding to the legacy `therapist_id` ownership field.

## New V2 endpoints

- `POST /auth/signup-provider`
- `GET /account/me`
- `POST /auth/create-participant`
- `GET /participants`

These endpoints return the V2 platform response contract.

## Existing V1 endpoints remain available

- `POST /auth/signup-therapist`
- `GET /auth/me`
- `POST /auth/create-client`
- `GET /clients`

Existing V1 consumers continue to receive the legacy response shape and role values.

## Migration strategy

Do not rewrite existing user role values merely to improve terminology. New authorization helpers understand both vocabularies. A persisted-role migration should happen only if there is a concrete storage-level need and must be handled as a separately tested migration with rollback/compatibility planning.
