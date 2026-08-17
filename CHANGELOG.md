# Changelog

All notable changes to Clinly Backbone are documented here.

## 1.0.0 — 2026-08-17

First V1 release candidate.

### Identity and access

- Therapist signup with normalized unique email addresses.
- Direct bcrypt password hashing with explicit 72-byte input validation.
- JWT Bearer login, protected current-user lookup, disabled-user denial, and configurable token lifetime.
- Therapist-owned client creation and role enforcement.
- Centralized tenant/ownership authorization with resource-safe denial behavior.
- Application-level login failure throttling with audited HTTP 429 responses.

### Secure messaging

- Unique therapist/client conversations.
- Participant-scoped conversation listing.
- Authenticated message encryption using PyNaCl XChaCha20-Poly1305 AEAD.
- Ciphertext-only MongoDB message persistence.
- Authorization before message retrieval/decryption.
- Cross-tenant, malformed-ID, and ID-guessing security tests.

### Audit evidence

- Append-only application audit writer with allowlisted metadata.
- Audit coverage for account creation, login success/failure, client/conversation creation, messaging, authorization denials, audit queries, and exports.
- Therapist-scoped audit querying by owned client and date range.
- CSV audit export with spreadsheet-formula injection mitigation.

### Production hardening

- Required/masked JWT and message-encryption secrets.
- Production configuration validation for secrets, log level, and CORS.
- CORS disabled by default and exact-origin configuration support.
- Structured JSON request logging with request ID, actor ID, route, status, and latency while excluding PHI-bearing payloads.
- MongoDB-aware readiness response with HTTP 503 on dependency failure.
- Multi-stage non-root production Docker image.
- Local Docker Compose Mongo authentication/configuration fixes.

### Dependency and CI security

- CI lint/test coverage on Python 3.11 and 3.12 with MongoDB 7.
- Locked runtime dependency audit with `pip-audit`.
- Production Docker image build in CI.
- Removed stale Passlib/python-jose/cryptography dependency paths during remediation.
- Migrated JWT handling to PyJWT and message encryption to PyNaCl.
- Upgraded official GitHub Actions runtimes.
- Added deterministic regression tests preventing plaintext message content from entering structured logs.

### Release handoff

- Production configuration guide.
- Backup/restore operations guide.
- Manual QA checklist.
- Explicit OpenAPI summaries, security scheme, and error-response contracts.
- Automated V1 OpenAPI contract test.

### Known release boundary

Repository CI checks exist and are part of the V1 engineering gate, but GitHub issue #26 remains open until required status-check enforcement can be enabled in repository settings for `main`.
