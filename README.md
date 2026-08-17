# Clinly Backbone

Secure FastAPI + MongoDB backend for therapist/client messaging and audit evidence.

**Current release: 1.0.0**

Clinly Backbone V1 provides authenticated therapist/client identity, strict ownership boundaries, encrypted message storage, append-only application audit events, scoped audit export, production-safe configuration, and security-focused CI.

> Clinly is designed to support HIPAA technical safeguards, but application code alone does not make an organization HIPAA compliant. Administrative, contractual, operational, infrastructure, privacy, and security controls remain the responsibility of the deploying organization.

## V1 capabilities

- Therapist signup and bcrypt password hashing
- JWT Bearer authentication
- Therapist-owned client accounts
- Tenant-isolated therapist/client conversations
- Centralized authorization before PHI access or message decryption
- XChaCha20-Poly1305 authenticated message encryption via PyNaCl
- Ciphertext-only message persistence in MongoDB
- Append-only application audit writer
- Therapist-scoped audit queries and CSV export
- Resource-safe denial behavior for foreign/guessed IDs
- Login failure throttling with audited HTTP 429 responses
- PHI-safe structured JSON request logging
- Exact-origin CORS configuration, disabled by default
- Health and dependency-aware readiness endpoints
- Python 3.11/3.12 integration tests against MongoDB
- Locked dependency vulnerability auditing
- Non-root multi-stage production container build
- Operations, QA, and production configuration runbooks

## API

Interactive OpenAPI documentation is available from FastAPI at `/docs` when documentation is exposed by the deployment.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/signup-therapist` | Create therapist account |
| POST | `/auth/login` | Authenticate and issue Bearer token |
| GET | `/auth/me` | Return authenticated user |
| POST | `/auth/create-client` | Therapist creates owned client |
| POST | `/conversations` | Create therapist/client conversation |
| GET | `/conversations/me` | List authenticated participant's conversations |
| POST | `/messages` | Send encrypted message |
| GET | `/messages` | List authorized conversation messages |
| GET | `/audit` | Query audit events for owned client |
| POST | `/export` | Export owned-client audit events as CSV |
| GET | `/health` | Process liveness |
| GET | `/ready` | MongoDB-aware readiness |

Protected endpoints use an HTTP Bearer access token.

## Quick start

Requirements: Docker with Docker Compose.

```bash
cp .env.example .env
docker compose up --build
```

Then:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/ready
```

The values in `.env.example` are local-development examples only. Never reuse them in production.

## Development

```bash
poetry install
poetry run ruff check app tests
poetry run pytest -q
```

CI runs:

- Ruff + pytest on Python 3.11
- Ruff + pytest on Python 3.12
- MongoDB-backed integration/security tests
- locked runtime dependency audit with `pip-audit`
- production Docker image build

## Security model

Core rules:

- Do not log request bodies, passwords, tokens, decrypted messages, or other PHI-bearing payloads.
- Never persist message plaintext; MongoDB message records contain authenticated ciphertext.
- Authorize tenant/participant access before retrieving/decrypting PHI.
- Audit PHI-related actions and authorization denials without putting message content into audit metadata.
- Keep MongoDB authenticated, private, and TLS-protected in production.
- Inject secrets from an approved secrets manager.
- Treat `MESSAGE_ENCRYPTION_KEY` as recovery-critical. V1 does not implement key rotation/re-encryption.

See [SECURITY.md](SECURITY.md) for the security policy.

## Production and operations

- [Production configuration](docs/production-config.md)
- [Backup and restore operations](docs/operations.md)
- [V1 QA checklist](docs/qa-checklist.md)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)

## V1 release gate

A V1 candidate must pass lint, the full test suite on both supported Python versions, the locked dependency security audit, the production image build, and the OpenAPI contract tests.

Repository-level required-check enforcement is tracked separately in GitHub issue #26. The CI checks exist and pass, but branch/ruleset enforcement depends on repository settings available to the GitHub account/plan.

## License / use

Review the repository's licensing and organizational policies before production use. Security and compliance review is required before handling real clinical data.
