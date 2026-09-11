# Clinly HIPAA Production Readiness

> **Status:** Engineering and operational readiness checklist. This document is not a legal opinion, certification, or attestation that Clinly or any organization using it is HIPAA compliant.

Clinly must not process real protected health information (PHI/ePHI) in production until the applicable launch gates below are completed, evidenced, and accepted by the organization responsible for HIPAA compliance.

This checklist is organized around the HIPAA Security Rule currently in effect. The January 2025 Security Rule cybersecurity changes remain proposed as of September 2026; future-proofing controls are listed separately so proposed requirements are not represented as current law.

Official references:

- HHS Summary of the HIPAA Security Rule: https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html
- HHS Risk Analysis Guidance: https://www.hhs.gov/hipaa/for-professionals/security/guidance/guidance-risk-analysis/index.html
- HHS Security Rule: https://www.hhs.gov/hipaa/for-professionals/security/index.html
- HHS Security Rule NPRM factsheet: https://www.hhs.gov/hipaa/for-professionals/security/hipaa-security-rule-nprm/factsheet/index.html

## Launch status legend

- **Implemented** — control exists in Clinly and has automated or documented evidence.
- **Partial** — Clinly has a foundation but additional technical or operational work is required.
- **External gate** — requires organizational policy, vendor agreement, infrastructure configuration, or human process outside this repository.
- **Blocked for PHI** — real PHI must not be enabled until completed.

## Technical safeguard map

| Control area | Status | Clinly evidence | Launch requirement |
|---|---|---|---|
| Unique user identification | Implemented | Mongo-backed users and per-user authorization | Preserve unique accounts; prohibit shared production accounts |
| Authentication | Partial | bcrypt password hashing, login throttling, signed access tokens, server-backed sessions | Add provider/admin MFA and secure recovery before PHI launch |
| Session termination | Implemented | Revocable `auth_sessions`, audited `/auth/logout`, browser logout revokes server session | Verify on production topology |
| Automatic logoff | Implemented | Web inactivity guard defaults to 15 minutes and revokes the server session | Validate timeout behavior in release smoke test |
| Access control / least privilege | Partial | Provider/participant authorization boundaries and ownership checks | Complete role/access review and document minimum-necessary decisions |
| Audit controls | Partial | Application audit events cover authentication, authorization denials, messaging, scheduling, provider/business operations, exports, and other sensitive actions | Define retention, review cadence, alerting, and tamper-resistant centralized storage |
| Integrity | Partial | Authenticated encryption for message bodies, database constraints/indexes, application authorization | Document integrity monitoring, backup verification, and change-management controls |
| Transmission security | Implemented in application contract | Production settings reject unencrypted MongoDB transport; public deployment requires HTTPS | Prove HTTPS/TLS at the production edge and private/TLS database connectivity |
| Encryption at rest | Partial / infrastructure | Message bodies use authenticated application-layer encryption | Enable and document infrastructure encryption for databases, backups, logs, disks, and secrets |
| Emergency access | External gate | No hidden break-glass bypass is built into Clinly | Define risk-based emergency-access procedure without creating an unaudited backdoor |

## Administrative safeguard launch gates

### 1. Security risk analysis — BLOCKED FOR PHI

The responsible organization must complete and retain a documented risk analysis covering all ePHI Clinly creates, receives, maintains, or transmits, including:

- production application services
- MongoDB
- backups
- logs and monitoring systems
- administrator workstations and support workflows
- integrations and subprocessors
- authentication/recovery channels
- deployment and CI/CD systems that can affect production

The output must identify threats, vulnerabilities, likelihood, impact, risk level, and corrective actions. Risk analysis is an ongoing process and must be updated when material architecture, vendor, threat, or workflow changes occur.

### 2. Risk-management plan — BLOCKED FOR PHI

Every material risk from the risk analysis needs an owner, mitigation decision, target date, evidence, and acceptance/closure record. High-risk findings must not be silently accepted by engineering.

### 3. Security responsibility — EXTERNAL GATE

Designate the person responsible for the organization's HIPAA security program and document responsibilities/escalation paths.

### 4. Workforce access lifecycle — EXTERNAL GATE

Document and exercise:

- access approval
- least-privilege assignment
- onboarding
- role changes
- termination/offboarding
- periodic access review
- sanctions for policy violations

Production access must use individual identities; shared administrator credentials are prohibited.

### 5. Security awareness and training — EXTERNAL GATE

Establish initial and recurring workforce security/privacy training, phishing/security awareness, and documented completion records.

### 6. Security incident procedure — BLOCKED FOR PHI

Document detection, triage, containment, evidence preservation, eradication, recovery, internal escalation, legal/privacy review, and post-incident corrective action.

The plan must connect to the organization's HIPAA Breach Notification Rule process rather than assuming every security event is automatically a reportable breach.

### 7. Contingency planning — BLOCKED FOR PHI

Document and test:

- encrypted backups
- backup frequency and retention
- restore procedure
- disaster recovery
- emergency operations mode
- criticality analysis
- recovery objectives appropriate to the business

A backup is not considered production-ready until a restore has been successfully tested and evidenced outside the production dataset.

### 8. Periodic evaluation — EXTERNAL GATE

Schedule periodic technical and nontechnical evaluation of safeguards and repeat evaluations when material environmental or operational changes occur.

## Production infrastructure gates

Real PHI must remain disabled until all vendors that create, receive, maintain, or transmit PHI are approved for the intended use and required Business Associate Agreements (BAAs) are executed.

At minimum, production evidence must cover:

- application hosting provider and applicable BAA/service tier
- MongoDB hosting and applicable BAA/service tier
- DNS/TLS/edge provider if it can access PHI
- logging, monitoring, alerting, and error-reporting systems
- backup provider/storage
- email/SMS vendors if messages or metadata contain PHI
- customer-support tooling if support staff or systems may access PHI
- every enabled third-party integration

Do not infer HIPAA eligibility from a vendor's general security marketing. Record the exact product/service tier, contract/BAA, configuration, data flow, and subprocessors relevant to Clinly.

## Clinly-specific engineering blockers

The following are the next technical controls to complete before the PHI launch gate can be considered ready:

1. **Provider/admin MFA** — require a second factor for privileged accounts. Treat this as strong current risk mitigation and future-proofing; do not misstate the proposed 2025 rule as final law.
2. **Verified account recovery** — email verification, secure password reset, short-lived one-time reset tokens, and session revocation after password/security changes.
3. **Trusted proxy/client-IP correctness** — ensure login throttling receives the real source IP only through a defined trusted proxy boundary; never blindly trust spoofable forwarding headers on a public API.
4. **Distributed/edge rate limiting before horizontal scale** — the current application limiter is process-local.
5. **Revoke-all-sessions capability** — account disablement, password/security changes, and administrator response need a one-operation session kill switch.
6. **Centralized security monitoring** — alert on repeated authentication failures/429s, authorization-denial spikes, sustained 5xx/readiness failures, unusual audit-export activity, and other risk-analysis-driven events.
7. **Audit retention/integrity controls** — define retention, prevent routine application users from altering audit history, and export/ship audit records to appropriately protected storage.
8. **Backup/restore automation and evidence** — infrastructure implementation plus scheduled restore exercises.
9. **Production secret lifecycle** — secrets manager, documented rotation for rotatable secrets, emergency revocation, and a tested special migration plan before any message-encryption-key change.
10. **Dependency/vulnerability operations** — CI auditing already exists; production needs a remediation SLA and monitoring for newly disclosed vulnerabilities between releases.

## Existing Clinly security evidence

Clinly already includes substantial controls that should be preserved and tested:

- bcrypt password hashing
- login-failure throttling
- signed access tokens
- server-backed revocable authentication sessions
- audited server-side logout
- 15-minute browser inactivity logoff by default
- active-account checks on authenticated requests
- provider/participant ownership authorization boundaries
- authorization-denial audit events
- authenticated encryption of message bodies
- production MongoDB TLS enforcement
- production CORS restrictions
- structured allowlisted application logs that exclude bodies, credentials, message text, and emails
- request IDs
- `/health` liveness and `/ready` dependency readiness
- non-root hardened API container
- private API topology behind the web gateway in the reference production deployment
- frontend and backend automated tests
- dependency vulnerability audits
- production container builds
- full-stack CI smoke testing

## PHI launch gate

Clinly may move from demo/synthetic data to real PHI only after the responsible organization has documented evidence for all applicable items below:

- [ ] HIPAA Security Rule risk analysis completed
- [ ] Risk-management remediation plan approved
- [ ] Security responsibility assigned
- [ ] Workforce access/onboarding/offboarding procedure approved
- [ ] Security/privacy training process established
- [ ] Incident-response and breach-assessment procedures approved
- [ ] Contingency, backup, and disaster-recovery plan approved
- [ ] Successful backup restore test evidenced
- [ ] Production data-flow / asset inventory completed
- [ ] Vendor/subprocessor inventory completed
- [ ] Required BAAs executed for the exact production services/tiers
- [ ] Production TLS verified externally
- [ ] Production MongoDB private/TLS connectivity verified
- [ ] Provider/admin MFA enabled
- [ ] Account verification and secure recovery enabled
- [ ] Session revocation and inactivity logoff verified
- [ ] Revoke-all-sessions response path verified
- [ ] Centralized audit/log retention configured
- [ ] Security monitoring and alert routing tested
- [ ] Vulnerability/dependency remediation process documented
- [ ] Production access review completed
- [ ] Release/rollback and incident escalation drill completed
- [ ] Final compliance/legal review completed for the organization's actual role and workflows

Until those gates are satisfied, keep the public Clinly environment on synthetic/demo data only.

## Documentation retention

HIPAA Security Rule documentation has retention requirements. The organization must establish a records-retention process that meets the applicable HIPAA requirements; HHS's current Security Rule summary states required documentation must be retained for six years from creation or the date it last was in effect, whichever is later.

## Future-proofing against the proposed stronger Security Rule

The January 2025 Security Rule NPRM remains a proposal as of September 2026. Clinly should nevertheless design toward stronger controls where practical, including:

- MFA
- stronger asset/network mapping
- more prescriptive incident response and contingency testing
- stronger encryption expectations
- more formal vulnerability management
- segmentation and recovery planning

These are engineering targets, not claims that the proposal is currently binding law.
