# Clinly Backbone Production Configuration

This guide defines the V1 production configuration contract. Production deployments must use `APP_ENV=prod` (or `ENVIRONMENT=prod`) so the application's production-safety validation is enforced.

## Required runtime configuration

| Variable | Required | Production guidance |
|---|---:|---|
| `APP_ENV` / `ENVIRONMENT` | Yes | Set to `prod`. |
| `MONGO_URI` | Yes | Authenticated private MongoDB URI. Use TLS in production. |
| `MONGO_DB_NAME` | Yes | Production application database name. |
| `JWT_SECRET` | Yes | Secret value of at least 32 characters. Store in a secrets manager. |
| `MESSAGE_ENCRYPTION_KEY` | Yes | URL-safe base64 value that decodes to exactly 32 random bytes. Store in a secrets manager. |
| `LOG_LEVEL` | Yes | `INFO`, `WARNING`, `ERROR`, or `CRITICAL`. `DEBUG` is rejected in production. |
| `CORS_ALLOWED_ORIGINS` | When browser clients are used | JSON array of exact HTTPS origins. Wildcards and HTTP origins are rejected in production. |

Optional/tunable settings:

| Variable | Default | Purpose |
|---|---:|---|
| `API_TITLE` | `Clinly Backbone` | OpenAPI service title. |
| `API_VERSION` | application default | OpenAPI/API version label. |
| `MONGO_CONNECT_TIMEOUT_MS` | `3000` | Mongo connection timeout. |
| `MONGO_SERVER_SELECTION_TIMEOUT_MS` | `3000` | Mongo server selection timeout. |
| `JWT_ACCESS_TOKEN_MINUTES` | `60` | Access-token lifetime; accepted range is 5–1440 minutes. |
| `LOGIN_RATE_LIMIT_MAX_ATTEMPTS` | `5` | Failed attempts allowed per normalized identity in the sliding window. |
| `LOGIN_RATE_LIMIT_IP_MAX_ATTEMPTS` | `20` | Failed attempts allowed per source IP in the sliding window. |
| `LOGIN_RATE_LIMIT_WINDOW_SECONDS` | `300` | Login-failure sliding-window duration. |

## Generate secrets

Generate a unique JWT secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Generate a compatible message-encryption key after installing the production dependencies:

```bash
python -c "import base64; from nacl.secret import Aead; from nacl.utils import random; print(base64.urlsafe_b64encode(random(Aead.KEY_SIZE)).decode())"
```

Never reuse the development values from `.env.example` in production.

## Secrets management

`JWT_SECRET`, `MESSAGE_ENCRYPTION_KEY`, MongoDB credentials, TLS private keys, and backup credentials must be injected from the organization's approved secrets system. They must not be:

- committed to Git
- copied into container images
- embedded in Terraform/CloudFormation state without approved secret handling
- printed by CI/CD jobs
- pasted into tickets or chat systems
- included in application logs

Clinly's settings model uses secret types so routine configuration representations do not expose the underlying values.

### Message-encryption key warning

V1 does **not** implement encryption-key rotation or ciphertext re-encryption. Existing message records depend on the exact `MESSAGE_ENCRYPTION_KEY` used to encrypt them. Do not replace the key in production without a tested migration/re-encryption plan and verified backup.

## Transport security

The public API must be served over HTTPS. Terminate TLS at a trusted ingress/load balancer/reverse proxy or at the application platform edge, and redirect or reject plaintext HTTP at that boundary.

MongoDB recommends TLS for client/server and intra-cluster communication, authentication/access control, least-privilege roles, and limiting database network exposure.

References:

- https://www.mongodb.com/docs/manual/administration/security-checklist/
- https://www.mongodb.com/docs/manual/core/tls/

For self-managed MongoDB:

- do not expose port 27017 to the public internet
- enable authentication
- use a dedicated least-privilege application user
- use TLS with CA validation
- restrict firewall/security-group rules to trusted application/admin networks

For a managed MongoDB service, use its private networking/TLS/access-control capabilities and follow the provider's production security guidance.

## CORS

CORS is disabled when `CORS_ALLOWED_ORIGINS` is empty.

For a browser frontend, provide an exact JSON array:

```text
CORS_ALLOWED_ORIGINS=["https://app.clinly.example"]
```

Do not use `*`. Production validation rejects wildcard origins and non-HTTPS origins.

CORS is a browser control, not an authorization boundary. Every protected API route still requires a valid Bearer token and server-side tenant/ownership authorization.

## Login throttling

V1 includes an application-level, in-process sliding-window backstop for login failures. Raw emails and source IPs are not retained as limiter keys; the limiter hashes its identity/IP key material.

For a deployment with more than one API replica, also configure a distributed or edge-layer login rate limit (for example, at an API gateway, ingress, WAF, or shared rate-limit service). Process-local state is not shared between replicas and resets when a process restarts.

## Logging

Production logs are JSON and intentionally allowlist request metadata:

- timestamp
- level/logger/environment
- event message
- request ID
- authenticated actor user ID when available
- HTTP method
- route path
- status code
- latency

Do not add request/response bodies, query strings, authorization headers, JWTs, passwords, decrypted messages, email addresses, or message text to application logs.

Ship production logs to an approved centralized log platform with access controls and retention appropriate to the organization's policy. Monitor, at minimum:

- repeated login failures / HTTP 429 responses
- unusual HTTP 403/404 authorization-denial patterns
- sustained HTTP 5xx or readiness failures
- unusual audit export activity

## MongoDB and readiness

`/health` is process liveness and does not verify MongoDB.

`/ready` verifies MongoDB connectivity. It returns HTTP 503 when MongoDB cannot be reached, allowing a load balancer or orchestrator to remove the instance from ready service.

## Container deployment

The production Docker image:

- uses a multi-stage build
- installs only the main/runtime dependency group in the final image
- runs as a non-root application user
- exposes port 8000
- uses `/ready` as its container health check

Do not use the development Docker Compose file as a production topology. It includes local-development conveniences such as source mounting/reload and example credentials.

## Pre-deployment checklist

Before a production deployment:

- `APP_ENV=prod` starts successfully with production secrets.
- Example/development secrets have been replaced.
- MongoDB authentication, TLS, private networking, backups, and restore testing are configured.
- Public API TLS is enforced.
- CORS contains only the intended HTTPS origins.
- Edge/distributed login throttling is configured for multi-replica deployments.
- CI passes lint, tests on supported Python versions, dependency vulnerability audit, and production image build.
- Central logging is configured and verified not to contain PHI/message bodies.
- Backup and restore procedures in `docs/operations.md` have been exercised.
