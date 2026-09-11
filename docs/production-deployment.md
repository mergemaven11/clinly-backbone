# Clinly Production Deployment Runbook

This runbook turns the repository's production-safety contract into a repeatable deployment for the API and web gateway.

It is intentionally provider-neutral. The same application images can later be deployed to a managed container platform or Kubernetes. `docker-compose.production.yml` is the reference topology for validating the production shape and for a hardened single-host deployment behind a trusted HTTPS edge.

## Production topology

```text
Internet
   |
   v
HTTPS edge / load balancer / reverse proxy
   |
   v
127.0.0.1:${CLINLY_HTTP_PORT:-8080}
   |
   v
Clinly web gateway (nginx)
   |
   +---- static React application
   |
   +---- /api/* ----> private Clinly API :8000
                         |
                         v
                managed/private MongoDB
```

The API is not published on the host by the production Compose file. Browser traffic reaches it only through the web gateway. MongoDB is not started by the production topology; use an authenticated, TLS-protected production database with backups and restore testing.

## 1. Prepare secrets and configuration

Start from `.env.production.example`, but do not commit the resulting values.

Generate a JWT secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Generate the message encryption key from an environment where PyNaCl is installed:

```bash
python -c "import base64; from nacl.secret import Aead; from nacl.utils import random; print(base64.urlsafe_b64encode(random(Aead.KEY_SIZE)).decode())"
```

Required production secrets/configuration:

- `MONGO_URI`
- `JWT_SECRET`
- `MESSAGE_ENCRYPTION_KEY`
- exact HTTPS `CORS_ALLOWED_ORIGINS`

Do not rotate `MESSAGE_ENCRYPTION_KEY` after real encrypted messages exist unless a tested ciphertext migration is performed first.

## 2. Validate the deployment definition

Load the production environment into your shell or deployment platform, then validate without starting containers:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
```

The command must fail when a required secret or Mongo URI is missing.

## 3. Build immutable application images

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build --pull
```

The API image is the repository's non-root runtime stage. The web image is a compiled Vite build served by nginx.

For a real release, record the Git commit SHA that produced the images. Do not deploy from an uncommitted working tree.

## 4. Start the release candidate

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

Inspect state:

```bash
docker compose -f docker-compose.production.yml ps
```

The API must become healthy before the web gateway is considered ready.

## 5. Verify health through the web gateway

From the deployment host:

```bash
curl --fail http://127.0.0.1:${CLINLY_HTTP_PORT:-8080}/
curl --fail http://127.0.0.1:${CLINLY_HTTP_PORT:-8080}/api/health
curl --fail http://127.0.0.1:${CLINLY_HTTP_PORT:-8080}/api/ready
```

Expected API responses:

```json
{"status":"ok"}
```

and:

```json
{"status":"ready"}
```

`/ready` must return HTTP 503 when MongoDB is unavailable.

## 6. Put HTTPS in front of Clinly

The reference Compose topology binds the web service to loopback only. A trusted ingress, load balancer, platform edge, or reverse proxy should terminate TLS and forward to the loopback port.

Production requirements:

- HTTPS only for public traffic
- HTTP redirected or rejected at the edge
- only intended Clinly hostnames routed to the service
- request/body size limits appropriate for the API
- connection and upstream timeouts configured explicitly
- edge/WAF login throttling for multi-replica deployments
- centralized access/application logging without request bodies or credentials

Do not publish MongoDB or the API container directly to the public internet.

## 7. Release smoke test

Before promoting a release, exercise at least:

1. Web application loads through HTTPS.
2. `/api/health` returns 200.
3. `/api/ready` returns 200 with MongoDB reachable.
4. Provider login succeeds with a known test account.
5. Invalid logins are throttled as expected.
6. Tenant boundaries reject access to foreign provider/member resources.
7. Encrypted messaging round-trips without plaintext appearing in logs.
8. Provider scheduling can create, move, and cancel a test booking without double-booking.
9. Audit export is restricted to authorized actors.
10. A database backup exists and the restore procedure has been exercised outside production.

Use `docs/qa-checklist.md` for broader application-level validation.

## 8. Rollback

A production release must have an immediately identifiable previous image/commit.

If the new release fails smoke testing or health checks:

```bash
# Re-deploy the previous known-good image/tag or checked-out commit.
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

Application rollback does not automatically roll back database data. Avoid destructive schema/data migrations without a separate forward/rollback plan and verified backup.

## Remaining scale-up work

The current application-level login limiter is process-local. Before running multiple API replicas, move/enforce the shared IP/identity limit at an edge gateway or shared rate-limit store.

For a managed production platform, the next deployment step is to map these same contracts to the chosen provider: secrets, private Mongo connectivity, TLS ingress, health probes, centralized logs, backups, and image-based rollback.
