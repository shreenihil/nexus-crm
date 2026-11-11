# Changelog

All notable changes to Nexus CRM are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-18

### Added

- **Pluggable Storage SPI (`packages/storage-spi`)**:
  - `DatabaseAdapter` interface supporting Tier 1 (PostgreSQL with pgvector) and Tier 2 (SQLite / in-memory).
  - `ObjectStorageAdapter` interface supporting Tier 1 (AWS S3 / MinIO) and Tier 2 (Local filesystem / in-memory).
  - `QueueCacheAdapter` interface supporting Tier 1 (Redis / Valkey) and Tier 2 (In-memory).
  - Granular capability flags matrix (transactions, vectorSearch, fullTextSearch, distributedLocks, timeTravel, streamingReplication).
  - Safe read-only connection probe diagnostics without side effects.
- **Self-Hosting Packaging**:
  - Production `docker-compose.yml` with Caddy reverse proxy, TLS termination, network segmentation, and resource limits.
  - Complete Kubernetes Helm chart under `infra/helm/crm` with HPA, NetworkPolicy, Ingress, and ConfigMap templates.
  - Automated bootstrap script (`./scripts/init` and `./scripts/init.ps1`) with CSPRNG secrets generator.
  - First-Run Setup Wizard (`/setup` and `/v1/setup/*`) with high-entropy startup console token.
  - Diagnostic CLI (`crm doctor`, `crm config:validate`, `crm backup`, `crm restore`, `crm backend:migrate`).
- **Security & Hardening**:
  - Explicit 16-byte GCM authentication tag enforcement in KMS envelope encryption.
  - Prototype pollution guards (`__proto__`, `constructor`, `prototype`) in AST formula evaluator.
  - Strict CORS origin validation, credential rejection on wildcard origins, and Helmet CSP enforcement.
  - Comprehensive SSRF defense blocking RFC1918, loopback, link-local, IPv6 ULA, and metadata endpoints.
  - Automated security regression test suite covering SSRF, prototype pollution, CORS, and multi-tenant IDOR.
- **Onboarding & First-Run Experience**:
  - "Where does your data live?" storage overview card on Welcome Screen.
  - Bilingual onboarding carousel with new slides for self-hosting sovereignty and pluggable backends.
  - Role-based onboarding checklist restricting infrastructure items to instance administrators.
  - Zero sample data in shipped app — clean start with standard canonical objects.

### Changed

- Sanitized `.env.example` with descriptive generator placeholders.
- Resolved all 70 TypeScript compile errors across monorepo packages.
