# Clinly Backbone V1 QA Checklist

Use this checklist in a non-production QA environment with synthetic data. Do not use real patient data for routine QA.

Record the build/commit tested, environment, tester, and date in the team's test record. Do not copy passwords, JWTs, message bodies, database URIs, or encryption keys into the test record.

## Environment readiness

- [ ] `APP_ENV` is `dev`/`staging` for QA, not `prod` unless production validation itself is under test.
- [ ] MongoDB is reachable only from intended QA networks.
- [ ] QA uses non-production JWT and message-encryption secrets.
- [ ] `GET /health` returns HTTP 200 with `{"status":"ok"}`.
- [ ] `GET /ready` returns HTTP 200 with `{"status":"ready"}` while MongoDB is available.
- [ ] Simulated Mongo unavailability causes `/ready` to return HTTP 503.
- [ ] Application logs are structured JSON and include request ID, route, status, and latency.

## Therapist signup

- [ ] `POST /auth/signup-therapist` creates a therapist using a valid email/password.
- [ ] Returned role is `THERAPIST`.
- [ ] Password is not returned by the API.
- [ ] Raw MongoDB user document contains a bcrypt hash and not the submitted password.
- [ ] Reusing the same normalized email returns HTTP 409.
- [ ] Passwords longer than bcrypt's supported 72 UTF-8 bytes are rejected as validation errors rather than causing HTTP 500.
- [ ] `USER_CREATED` audit event exists and contains no password/PHI.

## Login and token validation

- [ ] Correct therapist credentials return a Bearer access token.
- [ ] `GET /auth/me` succeeds with a valid token.
- [ ] Missing token returns HTTP 401 on a protected route.
- [ ] Invalid-signature token returns HTTP 401.
- [ ] Expired token returns HTTP 401.
- [ ] Disabled user login returns HTTP 403.
- [ ] Invalid credentials return HTTP 401 without revealing whether the email exists.
- [ ] Successful login creates `LOGIN_SUCCESS` audit event.
- [ ] Failed login creates `LOGIN_FAILURE` audit event.

## Login throttling

- [ ] Repeated failed login attempts eventually return HTTP 429.
- [ ] HTTP 429 contains a `Retry-After` header.
- [ ] Rate-limited attempt is recorded as `LOGIN_FAILURE` with safe metadata.
- [ ] No password, email, JWT, or message content appears in the rate-limit error/log output.
- [ ] For multi-replica QA, confirm edge/shared throttling is configured in addition to the process-local backstop.

## Client ownership

- [ ] Authenticated therapist can call `POST /auth/create-client`.
- [ ] Created user's role is `CLIENT`.
- [ ] Created client's `therapist_id` matches the creating therapist.
- [ ] Client cannot call `POST /auth/create-client` and receives HTTP 403.
- [ ] Duplicate client email returns HTTP 409.
- [ ] `CLIENT_CREATED` audit event identifies actor and subject without PHI.
- [ ] Role denial creates `AUTHZ_DENIED` audit event.

## Conversations

- [ ] Therapist can create a conversation only with a client they own.
- [ ] A second conversation for the same therapist/client pair returns HTTP 409.
- [ ] Therapist cannot create a conversation with another therapist's client.
- [ ] Foreign-client attempt returns the resource-safe denial strategy (HTTP 404) rather than revealing ownership/existence details.
- [ ] `GET /conversations/me` returns only the authenticated therapist's conversations.
- [ ] Client `GET /conversations/me` returns only conversations where that client is the participant.
- [ ] `CONVERSATION_CREATED` audit event exists for successful creation.

## Encrypted messaging

- [ ] Therapist sends a message with `POST /messages` in an owned conversation.
- [ ] Authorized client can retrieve the message with `GET /messages?conversation_id=...`.
- [ ] Authorized client can send a message and therapist can retrieve it.
- [ ] Raw MongoDB message document contains `ciphertext` and does **not** contain `plaintext_body`.
- [ ] Submitted plaintext does not appear as a substring of stored ciphertext.
- [ ] Tampered ciphertext fails closed and is not returned as plaintext.
- [ ] `MESSAGE_SENT` audit event exists.
- [ ] `MESSAGE_LISTED` audit event exists.

## Cross-tenant and ID-guessing checks

Create two independent therapist/client pairs.

- [ ] Therapist A cannot read Therapist B's conversation messages.
- [ ] Client A cannot read Client B's conversation messages.
- [ ] A valid but nonexistent Mongo ObjectId for `conversation_id` returns HTTP 404.
- [ ] A malformed conversation ID returns the same safe resource-denial strategy.
- [ ] Unauthorized request never returns another tenant's message, user, or conversation data.
- [ ] Each denied PHI access creates `AUTHZ_DENIED`.
- [ ] Confirm authorization denial occurs before message decryption by automated test (`tests/test_messaging.py`).

## Audit query

- [ ] Therapist can query `GET /audit` for an owned client.
- [ ] `from`/`to` filters include only events in the requested range.
- [ ] Invalid date range returns HTTP 422.
- [ ] Client cannot query audit data and receives HTTP 403.
- [ ] Foreign therapist cannot query another therapist's client and receives HTTP 404.
- [ ] Successful query creates `AUDIT_QUERIED`.

## Audit CSV export

- [ ] Therapist can `POST /export` for an owned client.
- [ ] Response content type is CSV.
- [ ] CSV contains the documented audit columns and only the owned client's requested date range.
- [ ] Client cannot export and receives HTTP 403.
- [ ] Foreign therapist cannot export another therapist's client and receives HTTP 404.
- [ ] Cells beginning with spreadsheet formula sigils (`=`, `+`, `-`, `@`) are neutralized in the export.
- [ ] Successful export creates `EXPORT_GENERATED`.

## PHI/logging checks

Use a unique synthetic marker such as `QA-PLAINTEXT-MARKER-<random>` as a test message.

- [ ] Send and retrieve the marker through the message API.
- [ ] Search application logs for the marker; it must not appear.
- [ ] Search logs for submitted passwords; they must not appear.
- [ ] Search logs for Bearer tokens; they must not appear.
- [ ] Request logging contains path only, not query parameters or request bodies.
- [ ] Authenticated request log contains actor ID when available.
- [ ] `X-Request-ID` response header is present and corresponds to the request log.

## CORS

- [ ] With `CORS_ALLOWED_ORIGINS=[]`, no configured browser origin receives permissive CORS headers.
- [ ] With an allowed QA origin configured, that exact origin receives expected CORS headers.
- [ ] An unlisted origin does not receive access permission.
- [ ] Production settings validation rejects `*`.
- [ ] Production settings validation rejects non-HTTPS origins.

## Production configuration validation

Run configuration-only startup tests with synthetic secrets.

- [ ] Missing `MONGO_URI` fails configuration.
- [ ] Missing/short `JWT_SECRET` fails configuration.
- [ ] Invalid `MESSAGE_ENCRYPTION_KEY` fails startup.
- [ ] `APP_ENV=prod` + `LOG_LEVEL=DEBUG` fails configuration.
- [ ] `APP_ENV=prod` + development/example secrets fails configuration.
- [ ] `APP_ENV=prod` + wildcard/non-HTTPS CORS fails configuration.

## CI/release gate

- [ ] Ruff passes.
- [ ] Pytest passes on Python 3.11.
- [ ] Pytest passes on Python 3.12.
- [ ] Locked runtime dependency audit passes with no unsuppressed known vulnerabilities.
- [ ] Production Docker image builds.
- [ ] Docker runtime user is non-root.
- [ ] OpenAPI contract test passes and includes all V1 endpoints/security scheme.
- [ ] Backup/restore runbook has been reviewed and a restore drill is scheduled or completed before production go-live.

## QA sign-off

A V1 candidate is QA-approved only when every applicable item above passes or has a documented, reviewed exception outside this repository. Security/privacy exceptions must not be hidden by weakening tests or suppressing audit findings without review.
