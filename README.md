# Clinly Backbone

Secure Messaging & Audit Backbone (HIPAA-Ready MVP)

Clinly Backbone is a FastAPI + MongoDB backend providing encrypted
therapist--client messaging and immutable audit logging.

## Quick Start

``` bash
cp .env.example .env
docker compose up --build
```

Health check:

``` bash
curl http://localhost:8000/health
```

Readiness check:

``` bash
curl http://localhost:8000/ready
```

## Security Principles

-   No plaintext PHI stored in Mongo
-   No request bodies logged
-   All PHI access audited
-   Strict tenant isolation

## Version

0.1.0 (MVP Foundation)
