# ADR-001: Pluggable Storage-Backend Service Provider Interface (SPI)

## Status
Accepted

## Context
Nexus CRM is designed as a sovereign, self-hostable, multi-tenant open-source CRM. Deployments range from:
1. **Single-node lightweight installations**: Edge appliances, developers, small offices running with zero external dependencies (SQLite/embedded storage, local filesystem object store, in-memory queues).
2. **High-scale enterprise installations**: Kubernetes clusters running distributed PostgreSQL (>= 14) with pgvector, Amazon S3 or Cloudflare R2 object storage, and Redis/Valkey cluster for high-throughput job queues and distributed locking.

Coupling the application directly to a single database driver (e.g. pg-promise or raw SQLite) or cloud vendor creates vendor lock-in, increases operational barrier to entry, and impedes open-source adoption. Conversely, relying solely on an ORM abstraction without capability awareness leaks database-specific features (e.g. vector similarity search, distributed advisory locks, CDC streaming) or forces a lowest-common-denominator compromise.

## Options Considered

### Option 1: Direct Driver Coupling (PostgreSQL only)
- *Pros*: Simple, full utilization of Postgres features.
- *Cons*: Prevents embedded zero-dependency deployments; forces developers to run heavy Docker containers locally; blocks edge use cases.

### Option 2: Generic ORM Abstraction (Prisma / TypeORM)
- *Pros*: Broad database support out of the box.
- *Cons*: Heavy runtime overhead; rigid schema migration pipelines that conflict with polymorphic custom fields and dynamic attributes; poor support for non-relational storage tiers (S3, Redis) under a unified interface.

### Option 3: Service Provider Interface (SPI) with Capability Flags (Selected)
- *Pros*:
  - Clear separation between application domain logic and storage engines.
  - Granular `CapabilityFlags` (e.g. `vectorSearch`, `distributedLocks`, `timeTravel`) allow high-level services to gracefully degrade or enable advanced features.
  - Supports Tier 1 (PostgreSQL + S3 + Redis) and Tier 2 (SQLite + Local FS + In-Memory) seamlessly.
  - Safe, streaming data migration tooling (`crm backend:migrate`) enabled via standard cursor pagination and checksum verification.
- *Cons*: Requires maintaining unified interface definitions and adapter conformance test suites.

## Decision
We implement a typed **Storage Service Provider Interface (`packages/storage-spi`)** consisting of three primary adapter contracts:
1. `DatabaseAdapter`: Relational persistence, transactions, migrations, health probes, and capability negotiation.
2. `ObjectStorageAdapter`: Binary asset storage, presigned URLs, streaming upload/download, and health probes.
3. `QueueCacheAdapter`: Cache key-value operations, pub/sub messaging, distributed locking, and health probes.

Every adapter exposes:
- `getCapabilities()`: Returns boolean flags for supported operations.
- `healthCheck()`: Returns latency, connectivity state, and metadata without side effects.
- Unified cursor-based export/import primitives for cross-backend data migration.

## Consequences
- **Positive**:
  - Single codebase effortlessly powers both single-binary edge deployments and planet-scale cloud deployments.
  - Administrators can probe and hot-switch backends via the Backend Connection Manager.
  - 100% compliance with open-source sovereignty and self-hosting portability guidelines.
- **Negative**:
  - All new storage engines must pass the comprehensive SPI conformance test suite.
