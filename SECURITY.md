# SECURITY.md

# Clinly Backbone – Security Policy

## Overview

Clinly Backbone is designed as a HIPAA-ready secure messaging and audit infrastructure.  
Security is a foundational requirement of this project.

This document defines:

- Security posture
- Reporting process
- Secure development expectations
- Production hardening requirements

---

# Supported Versions

| Version | Supported |
|----------|------------|
| 0.1.x    | ✅ Yes     |
| <0.1.0   | ❌ No      |

Only the latest minor release of the current major version is supported.

---

# Reporting a Vulnerability

If you discover a security vulnerability:

1. **Do not open a public issue**
2. Email: tobiascodes12@gmail.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Impact assessment (if known)
   - Suggested mitigation (optional)

We aim to acknowledge reports within **72 hours**.

---

# Security Architecture Principles

Clinly Backbone follows these core security rules:

## 1. No Plaintext PHI at Rest
- Message bodies must be encrypted before storage.
- Decrypted content must never be logged.
- MongoDB must never store plaintext message bodies.

## 2. Strict Authorization Enforcement
Every PHI access must pass:
- Role-based authorization
- Ownership (tenant isolation) checks

Cross-tenant access must never be possible.

## 3. Append-Only Audit Logging
Audit events:
- Must never be updated
- Must never be deleted
- Must log all PHI access and authorization denials

## 4. No PHI in Logs
Application logs must never include:
- Message bodies
- Decrypted content
- Sensitive request payloads

Only metadata (method, path, status, latency) is logged.

---

# Production Security Requirements

The following must be enforced in production:

## Transport Security
- HTTPS only
- TLS termination at load balancer or reverse proxy
- HSTS recommended

## Secrets Management
- JWT_SECRET must be stored in a secrets manager
- MESSAGE_ENCRYPTION_KEY must not be stored in repo
- No secrets committed to version control

## Database Security
- MongoDB must not be publicly exposed
- Access restricted to internal network/VPC
- Authentication required
- Regular backups enabled

## Container Security
- Containers run as non-root
- Minimal base image
- No dev dependencies in production image

## Monitoring
- Structured logs shipped to centralized logging
- Monitor login failures
- Monitor excessive 403 responses
- Monitor unusual export activity

---

# Threat Model (MVP)

Primary threats mitigated:

- Cross-tenant data exposure
- ID guessing attacks
- Unauthorized audit access
- Plaintext data leakage
- Brute-force login attempts

Out-of-scope (future hardening phases):

- Key rotation
- Automated intrusion detection
- Advanced anomaly detection

---

# Secure Development Guidelines

Contributors must:

- Never log request bodies for PHI routes
- Never include message content in audit metadata
- Always use centralized authorization helpers
- Write tests for:
  - Tenant isolation
  - Encryption-at-rest verification
  - Authorization denials
  - Audit coverage

---

# Responsible Disclosure

All security fixes will be:

- Privately patched
- Reviewed
- Released in a minor or patch version
- Documented in release notes

---

# Disclaimer

Clinly Backbone is architected to support HIPAA technical safeguards.  
Organizational and administrative compliance controls must be implemented separately.