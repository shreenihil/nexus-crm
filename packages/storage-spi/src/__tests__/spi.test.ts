import { describe, it, expect } from 'vitest';
import {
  PostgresConfigSchema,
  SqliteConfigSchema,
  StorageBackendConfigSchema,
  StorageManager,
  MemoryDatabaseAdapter,
  PostgresDatabaseAdapter,
  MemoryObjectStorageAdapter,
  MemoryQueueCacheAdapter,
} from '../index.js';

describe('Storage SPI Architecture & Conformance (§3)', () => {
  it('validates Postgres configuration', () => {
    const valid = PostgresConfigSchema.safeParse({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'nexus_db',
      user: 'nexus',
      password: 'password123',
    });
    expect(valid.success).toBe(true);
  });

  it('rejects invalid Postgres configuration missing password', () => {
    const invalid = PostgresConfigSchema.safeParse({
      type: 'postgres',
      host: 'localhost',
      database: 'nexus_db',
      user: 'nexus',
    });
    expect(invalid.success).toBe(false);
  });

  it('validates complete Tier 1 StorageBackend configuration', () => {
    const valid = StorageBackendConfigSchema.safeParse({
      database: {
        type: 'postgres',
        host: 'localhost',
        database: 'nexus_db',
        user: 'nexus',
        password: 'password123',
      },
      objectStorage: {
        type: 's3',
        bucket: 'attachments',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      },
      queueCache: {
        type: 'redis',
        host: 'localhost',
      },
    });
    expect(valid.success).toBe(true);
  });

  it('StorageManager returns overview with capability flags and health metrics', async () => {
    const manager = new StorageManager(
      new MemoryDatabaseAdapter(),
      new MemoryObjectStorageAdapter(),
      new MemoryQueueCacheAdapter()
    );

    const overview = await manager.getOverview();
    expect(overview.database.name).toBe('in-memory-sqlite');
    expect(overview.database.tier).toBe(2);
    expect(overview.database.capabilities.transactions).toBe(true);
    expect(overview.database.health.status).toBeDefined();

    expect(overview.objectStorage.name).toBe('memory-object-storage');
    expect(overview.queueCache.name).toBe('in-memory-queue-cache');
  });

  it('performs safe read-only test connection probes', async () => {
    const manager = new StorageManager(
      new MemoryDatabaseAdapter(),
      new MemoryObjectStorageAdapter(),
      new MemoryQueueCacheAdapter()
    );

    const dbProbe = await manager.probeConnection('database');
    expect(dbProbe.latencyMs).toBeGreaterThanOrEqual(0);

    const objProbe = await manager.probeConnection('objectStorage');
    expect(objProbe.status).toBe('healthy');

    const queueProbe = await manager.probeConnection('queueCache');
    expect(queueProbe.status).toBe('healthy');
  });

  it('streams database migration between adapters with checksum verification', async () => {
    const source = new MemoryDatabaseAdapter();
    const target = new MemoryDatabaseAdapter();
    await source.connect();
    await target.connect();

    // Populate source
    await source.importBatch('workspaces', [
      { id: 'ws-1', name: 'Alpha Workspace' },
      { id: 'ws-2', name: 'Beta Workspace' },
    ]);

    const manager = new StorageManager(source);

    // Dry-run first
    const dryRun = await manager.migrateDatabase(source, target, ['workspaces'], { dryRun: true });
    expect(dryRun.totalRows).toBe(2);
    const targetPreCheck = await target.exportStream('workspaces');
    expect(targetPreCheck.rows.length).toBe(0);

    // Real migration
    const realRun = await manager.migrateDatabase(source, target, ['workspaces'], { dryRun: false });
    expect(realRun.totalRows).toBe(2);
    expect(realRun.verified).toBe(true);

    const targetPostCheck = await target.exportStream('workspaces');
    expect(targetPostCheck.rows.length).toBe(2);
    expect(targetPostCheck.rows[0].name).toBe('Alpha Workspace');
  });
});
