# Clinly Backbone

Secure FastAPI + MongoDB backend foundation for Clinly.

> **Release status:** pre-V1. The repository currently provides the runtime,
> configuration, Mongo connectivity, health/readiness checks, PHI-safe request
> metadata logging, containerization, and core user indexes. Authentication,
> authorization, encrypted messaging, and append-only audit APIs are the next
> V1 milestones and are tracked in GitHub issues.

## V1 goal

Clinly Backbone V1 will provide:

- Therapist and client accounts with strict ownership boundaries
- JWT authentication and centralized authorization
- Therapist-client conversations
- Authenticated encryption for message bodies at rest
- Append-only audit events for PHI access and authorization denials
- Therapist-scoped audit querying and export
- Security-critical integration tests and production deployment guidance

## Quick start

Requirements: Docker with Docker Compose.

```bash
cp .env.example .env
docker compose up --build
```

The local example credentials are development-only and must never be reused in
production.

### Health

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{"status":"ok"}
```

### Readiness

```bash
curl http://localhost:8000/ready
```

Expected response while MongoDB is reachable:

```json
{"status":"ready"}
```

## Development checks

```bash
poetry install
poetry run ruff check app tests
poetry run pytest -q
```

The CI workflow runs lint and integration tests on Python 3.11 and 3.12 and
also verifies that the production Docker image builds.

## Security principles

- Never log request bodies or decrypted PHI
- Never store plaintext message bodies once messaging lands
- Enforce tenant/ownership authorization before PHI access or decryption
- Record PHI access and authorization denials in append-only audit events
- Keep MongoDB private in production and require authentication
- Keep application secrets out of source control

See [SECURITY.md](SECURITY.md) for the security model and production
requirements.

## Version

Current development version: **0.1.0**.

The version will move to **1.0.0** only after the V1 authentication,
authorization, encrypted messaging, audit, security-test, and release gates are
implemented and passing.
