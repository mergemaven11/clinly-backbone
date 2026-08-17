# Clinly Backbone Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 1.0.x | ✅ Yes |
| 0.x | ❌ No |

Only the latest patch of the supported V1 line receives security fixes.

## Reporting a vulnerability

Do **not** open a public issue for a suspected vulnerability.

Email: tobiascodes12@gmail.com

Include a description, reproduction steps, impact assessment if known, and suggested mitigation if available. Do not include real PHI, passwords, JWTs, private keys, or production database credentials in the report.

We aim to acknowledge reports within 72 hours.

## Security architecture

### No plaintext message PHI at rest

- Message bodies are authenticated-encrypted before MongoDB persistence.
- Message records store ciphertext and never a `plaintext_body` field.
- Authorization occurs before message retrieval/decryption.
- Decrypted message content must never be logged.

V1 uses PyNaCl authenticated encryption (XChaCha20-Poly1305 AEAD) with a deployment-provided 32-byte secret key encoded as URL-safe base64.

### Strict authorization and tenant isolation

Every protected PHI access requires authentication plus role/ownership checks. Central authorization helpers use resource-safe denial behavior so foreign or guessed identifiers do not disclose another tenant's resources. Authorization denials are audited.

### Append-only application audit trail

The application exposes insert-only audit writing; it contains no update/delete path for audit events. Events record actor/subject/resource metadata and success state without message bodies, passwords, or tokens.

Database/administrator privileges are still capable of modifying underlying data, so production access control, database auditing, backups, and organizational controls remain required.

### PHI-safe application logging

Structured JSON request logs use an allowlist including request ID, actor user ID when available, method, route path, status, and latency. Request bodies, response bodies, query strings, authorization headers, passwords, JWTs, email addresses, and message content must not be added to application logs.

## Production requirements

### Transport and network

- Public API traffic must use HTTPS.
- MongoDB must use authentication and TLS in production.
- MongoDB must not be publicly internet-addressable.
- Firewall/security-group rules must restrict database access to trusted application and administration paths.

### Secrets

- Store `JWT_SECRET`, `MESSAGE_ENCRYPTION_KEY`, MongoDB credentials, TLS keys, and backup credentials in an approved secrets manager.
- Never commit production secrets or bake them into container images.
- `APP_ENV=prod` enables validation that rejects DEBUG logging, example secrets, wildcard CORS, and non-HTTPS browser origins.
- V1 does not implement message-key rotation/re-encryption. Do not change `MESSAGE_ENCRYPTION_KEY` without a tested migration plan.

### Login protection

The application provides a process-local sliding-window limiter for failed login attempts and audits rate-limited attempts. Multi-replica production deployments must also enforce a distributed/edge login rate limit because process-local state is not shared across replicas.

### Container

- Multi-stage production image
- Runtime dependencies only
- Non-root application user
- `/ready` health check

### Monitoring

Monitor centralized logs/audit signals for repeated login failures/429s, unusual authorization denials, sustained 5xx/readiness failures, and unusual audit exports. Do not add PHI to monitoring dimensions or alerts.

## Dependency vulnerability remediation

CI exports the locked runtime dependency graph and scans it with `pip-audit`.

When the audit fails:

1. Identify the vulnerable direct or transitive dependency and fixed versions.
2. Prefer upgrading/replacing the dependency and refreshing `poetry.lock`.
3. Run the full Python 3.11/3.12 test suite, dependency audit, and production image build.
4. Do not silence/ignore an advisory merely to make CI green.
5. If no fixed dependency exists and temporary acceptance is unavoidable, require a documented security review, impact analysis, compensating controls, owner, and expiry date outside the codebase before introducing a narrowly scoped exception.
6. Remove temporary exceptions as soon as a safe remediation is available.

V1's release hardening followed this process: stale JWT/crypto transitive dependencies were removed rather than suppressed.

## Secure development requirements

Contributors must:

- use centralized authorization helpers for PHI-bearing routes
- authorize before decryption
- never log request bodies or message content
- keep audit metadata allowlisted
- test tenant isolation, ID guessing, encryption at rest, denial auditing, and negative JWT paths
- keep OpenAPI endpoint/security/error contracts covered by tests
- keep dependency scanning and the production image build green

## Backup and recovery

Follow [`docs/operations.md`](docs/operations.md). Backups must be encrypted and access-controlled, and recovery planning must include preservation of the correct message-encryption key.

## Known V1 boundaries

Out of scope for V1:

- message encryption key rotation/re-encryption
- centralized/distributed application rate-limit state
- automated anomaly detection/IDS
- organizational HIPAA policies, BAAs, workforce controls, risk analysis, and other administrative/physical safeguards

## Disclaimer

Clinly Backbone is engineered to support security and HIPAA technical-safeguard goals. Software architecture alone does not establish HIPAA compliance; deploying organizations must implement and validate the required administrative, physical, contractual, infrastructure, and operational controls.
