# Pluggable Storage-Backend Guide

Nexus CRM implements a **Pluggable Storage Service Provider Interface (SPI)** located in `packages/storage-spi`. This architecture allows operators to deploy Nexus anywhere—from an air-gapped single-binary edge device using SQLite to a planetary enterprise cluster powered by PostgreSQL, S3, and Redis.

## Storage Tiers Overview

| Storage Component       | Tier 1: Production Enterprise    | Tier 2: Embedded / Edge      |
| :---------------------- | :------------------------------- | :--------------------------- |
| **Relational Database** | PostgreSQL >= 14 with `pgvector` | SQLite / LibSQL / In-Memory  |
| **Object Storage**      | AWS S3 / MinIO / Cloudflare R2   | Local Filesystem / In-Memory |
| **Queue & Cache**       | Redis >= 7 / Valkey              | In-Memory (Node.js Map)      |

---

## Architecture: The SPI Pattern

All storage operations flow through three typed abstract adapters:

1. `DatabaseAdapter`: Relational persistence, transactions, migrations, and cursor pagination.
2. `ObjectStorageAdapter`: Binary uploads, presigned URLs, and asset streaming.
3. `QueueCacheAdapter`: Distributed locks, async job queues, and pub/sub notifications.

Each adapter reports its `CapabilityFlags`:

```typescript
export interface DatabaseCapabilityFlags {
  transactions: boolean;
  vectorSearch: boolean;
  fullTextSearch: boolean;
  timeTravel: boolean;
  streamingReplication: boolean;
  savepoints: boolean;
}
```

---

## Writing a Custom Storage Adapter

To implement a new storage backend (e.g. DynamoDB, Azure Blob Storage, or RabbitMQ), implement the corresponding SPI interface.

### Example: Custom Object Storage Adapter

```typescript
import type {
  ObjectStorageAdapter,
  PutObjectResult,
  GetObjectResult,
  AdapterHealth,
} from "@nexus/storage-spi";

export class AzureBlobStorageAdapter implements ObjectStorageAdapter {
  readonly name = "azure-blob-storage";
  readonly tier = 1 as const;

  getCapabilities() {
    return {
      presignedUrls: true,
      multipartUpload: true,
      bucketLifecycle: true,
      serverSideEncryption: true,
    };
  }

  async healthCheck(): Promise<AdapterHealth> {
    const start = performance.now();
    // Execute non-mutating ping
    return {
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
      checkedAt: new Date().toISOString(),
    };
  }

  async putObject(
    key: string,
    data: Buffer | Uint8Array,
    contentType?: string,
  ): Promise<PutObjectResult> {
    // Implement upload logic
    return { key, size: data.length, etag: "mock-etag" };
  }

  async getObject(key: string): Promise<GetObjectResult> {
    // Implement download logic
    return { data: Buffer.from(""), size: 0 };
  }

  async deleteObject(key: string): Promise<void> {
    // Implement delete logic
  }

  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    return `https://azure.example.com/${key}`;
  }

  async listObjects(prefix = "", cursor?: string, limit = 100) {
    return { keys: [] };
  }
}
```

---

## Live Data Migration: `crm backend:migrate`

When upgrading from an embedded SQLite instance to PostgreSQL:

### Step 1: Run Dry-Run Verification

Validates schema compatibility and calculates row counts without writing:

```bash
pnpm crm backend:migrate \
  --from sqlite://./nexus.db \
  --to postgres://nexus:pass@localhost:5432/nexus_db \
  --dry-run
```

### Step 2: Execute Live Migration

Streams records with cursor batching and SHA-256 checksum verification:

```bash
pnpm crm backend:migrate \
  --from sqlite://./nexus.db \
  --to postgres://nexus:pass@localhost:5432/nexus_db \
  --batch-size 500
```
