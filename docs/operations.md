# Clinly Backbone Operations Guide

This document defines the V1 operational baseline for backup, restore, and recovery of Clinly Backbone MongoDB data.

> This is an engineering runbook, not a substitute for an organization's HIPAA risk analysis, business-continuity plan, retention policy, or legal/compliance review.

## Recovery objectives

Production owners must set recovery objectives that match their clinical and business risk. Until a stricter organizational policy is defined, use these V1 minimums:

- **Backup frequency:** at least every 24 hours, and before schema/index migrations or high-risk deployment work.
- **Restore drill:** at least monthly in an isolated non-production environment.
- **Retention:** retain at least 30 days of recoverable backups unless an approved policy requires a different period.
- **Encryption:** backup artifacts must be encrypted in transit and at rest.
- **Separation:** backup credentials and application credentials must be separate and least-privileged.

For a production system where a 24-hour recovery point is unacceptable, use a managed/snapshot solution with point-in-time recovery rather than increasing reliance on ad-hoc dumps.

MongoDB's current guidance describes `mongodump`/`mongorestore` as suitable for smaller deployments and recommends managed or snapshot-based approaches for more resilient, non-disruptive backups.

References:

- https://www.mongodb.com/docs/manual/core/backups/
- https://www.mongodb.com/docs/manual/tutorial/backup-and-restore-tools/
- https://www.mongodb.com/docs/database-tools/mongorestore/

## What must be recoverable

Back up the complete Clinly application database, including:

- `users`
- `conversations`
- `messages`
- `audit_events`
- collection indexes and metadata captured by the selected backup method

The message encryption key is **not** stored in MongoDB. A database backup without the corresponding `MESSAGE_ENCRYPTION_KEY` cannot decrypt stored message ciphertext.

Store encryption keys and other runtime secrets in the organization's approved secrets manager and include that secrets system in disaster-recovery planning. Do not place secrets inside the database dump or source repository.

## Small-deployment backup with MongoDB Database Tools

Use a dedicated MongoDB backup identity. Do not put the connection string directly into shell history, CI logs, tickets, or documentation.

Example using an environment-provided URI and an archive file:

```bash
export MONGO_BACKUP_URI='mongodb://<backup-user>:<password>@<host>:27017/clinly?authSource=admin&tls=true'
mkdir -p ./backups
mongodump \
  --uri="$MONGO_BACKUP_URI" \
  --db=clinly \
  --archive="./backups/clinly-$(date -u +%Y%m%dT%H%M%SZ).archive" \
  --gzip
```

Immediately move the resulting archive into approved encrypted backup storage. Do not leave production backups on an engineer workstation or application host.

## Restore procedure

Always rehearse restores outside production first.

1. Provision an isolated MongoDB deployment compatible with the source backup.
2. Restrict network access and enable authentication/TLS before loading PHI-bearing data.
3. Retrieve the selected encrypted backup from approved storage and verify its integrity.
4. Restore into an empty recovery database.
5. Start a Clinly instance against the recovery database using a copy of the correct message-encryption key from the approved secrets system.
6. Run the post-restore validation checklist below.
7. Only after validation, execute the organization's approved production cutover procedure.

Example restore:

```bash
export MONGO_RESTORE_URI='mongodb://<restore-user>:<password>@<host>:27017/clinly_recovery?authSource=admin&tls=true'
mongorestore \
  --uri="$MONGO_RESTORE_URI" \
  --archive="./clinly-backup.archive" \
  --gzip \
  --drop
```

`--drop` is destructive to collections in the target database. Use it only against the intended recovery target after confirming the target URI.

## Post-restore validation

Before declaring a restore successful:

- `/health` returns `200`.
- `/ready` returns `200` and MongoDB is reachable.
- Required Mongo indexes exist and application startup completes without index errors.
- A known test therapist can authenticate in the recovery environment.
- Owned client/conversation access remains tenant-isolated.
- At least one representative encrypted message can be decrypted by an authorized participant.
- Raw MongoDB message documents contain ciphertext and no `plaintext_body` field.
- Audit events are queryable for an owned client.
- Unauthorized/foreign resource access remains denied.
- No message plaintext appears in application logs during validation.

Never use live patient credentials for a routine restore drill if representative test data can satisfy the exercise.

## Restore drill record

Record each drill in the organization's operations system with:

- backup timestamp and source environment
- restore timestamp and target environment
- operator/reviewer
- backup integrity result
- application smoke-test result
- message decryption validation result
- tenant-isolation validation result
- measured recovery time
- defects or follow-up actions

Do not put PHI, passwords, JWTs, database URIs, or encryption keys into the drill record.

## Production database security baseline

MongoDB recommends authentication/access control, least-privilege roles, TLS for connections, encrypted/protected data storage, and limiting MongoDB to trusted network paths. Clinly production deployments must follow those controls.

Reference: https://www.mongodb.com/docs/manual/administration/security-checklist/

At minimum:

- MongoDB must not be internet-addressable.
- Require MongoDB authentication.
- Use a dedicated least-privilege database user for Clinly.
- Use TLS between the application and MongoDB.
- Restrict inbound MongoDB traffic to trusted application/administration networks.
- Encrypt backup storage.
- Patch MongoDB and the host operating system on an approved cadence.
- Periodically review database users and network rules.

## Incident recovery

If a backup, encryption key, or database credential may be exposed:

1. Treat it as a security incident under the organization's incident-response plan.
2. Preserve relevant non-PHI audit/security evidence.
3. Revoke/rotate affected database credentials.
4. Do not rotate `MESSAGE_ENCRYPTION_KEY` blindly: V1 does not yet implement message key rotation or re-encryption, so changing the key without a migration will make existing ciphertext unreadable.
5. Determine whether backup copies also require revocation, destruction, or re-encryption under the organization's policy.
6. Validate recovery from a known-good backup before returning the service to normal operation if integrity is in doubt.
