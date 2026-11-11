# Nexus CRM API Reference

Nexus CRM provides a fully documented RESTful OpenAPI 3.1 API covering authentication, CRM entities, pipelines, deduplication, workflows, KMS keys, and storage backends.

## Interactive Documentation
When running the API server locally or in production:
- **Swagger UI**: [http://localhost:4000/docs](http://localhost:4000/docs)
- **Raw OpenAPI 3.1 Spec**: [http://localhost:4000/docs/json](http://localhost:4000/docs/json)

## Core API Endpoints

### First-Run Setup (§4.2)
- `GET /v1/setup/status` — Returns instance initialization state (404 once initialized).
- `POST /v1/setup/verify-token` — Validates console startup setup token.
- `POST /v1/setup/complete` — Creates instance owner, seeds canonical objects, and locks setup.

### Authentication & Sessions
- `POST /v1/auth/register` — Register owner and primary workspace.
- `POST /v1/auth/login` — Authenticate and issue secure session cookie.
- `POST /v1/auth/mfa/challenge` — Verify TOTP multi-factor token.
- `POST /v1/auth/logout` — Revoke active session.

### Schema & Polymorphic Records
- `GET /v1/schema/objects` — List custom and standard CRM objects.
- `POST /v1/schema/objects` — Define custom objects and calculated formula attributes.
- `GET /v1/records/:objectId` — Query polymorphic records with filter/sort AST evaluation.
- `POST /v1/records/:objectId` — Insert record with deduplication checks.

### Pipelines & Rotting
- `GET /v1/pipelines` — Retrieve sales pipelines and stage SLA configs.
- `POST /v1/deals/:id/stage` — Advance deal stage and record SLA velocity.

### Pluggable Storage & Platform (§3)
- `GET /v1/platform/backends` — List active storage backends, capability flags, and health status.
- `POST /v1/platform/backends/probe` — Safe read-only connection test probe (`SELECT 1`, `HEAD bucket`, `PING`).
- `POST /v1/platform/kms/rotate` — Zero-downtime master key rotation.
- `GET /v1/platform/export` — 1-click complete tenant export archive with SHA-256 integrity manifest.
- `POST /v1/platform/import` — Restore tenant state from integrity-verified archive.

### Observability & Probes
- `GET /health` — Liveness check.
- `GET /ready` — Readiness probe checking database readiness and memory metrics.
- `GET /metrics` — Prometheus metrics exporter.
