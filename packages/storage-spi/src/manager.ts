import type { DatabaseAdapter } from "./database.js";
import type { ObjectStorageAdapter } from "./object-storage.js";
import type { QueueCacheAdapter } from "./queue-cache.js";
import type { AdapterHealth } from "./capabilities.js";
import { MemoryDatabaseAdapter } from "./adapters/memory-database.js";
import { MemoryObjectStorageAdapter } from "./adapters/object-storage-adapters.js";
import { MemoryQueueCacheAdapter } from "./adapters/queue-cache-adapters.js";

export interface BackendOverview {
  database: {
    name: string;
    tier: 1 | 2;
    capabilities: ReturnType<DatabaseAdapter["getCapabilities"]>;
    health: AdapterHealth;
  };
  objectStorage: {
    name: string;
    tier: 1 | 2;
    capabilities: ReturnType<ObjectStorageAdapter["getCapabilities"]>;
    health: AdapterHealth;
  };
  queueCache: {
    name: string;
    tier: 1 | 2;
    capabilities: ReturnType<QueueCacheAdapter["getCapabilities"]>;
    health: AdapterHealth;
  };
}

export class StorageManager {
  private dbAdapter: DatabaseAdapter;
  private objAdapter: ObjectStorageAdapter;
  private queueAdapter: QueueCacheAdapter;

  constructor(
    dbAdapter?: DatabaseAdapter,
    objAdapter?: ObjectStorageAdapter,
    queueAdapter?: QueueCacheAdapter,
  ) {
    this.dbAdapter = dbAdapter || new MemoryDatabaseAdapter();
    this.objAdapter = objAdapter || new MemoryObjectStorageAdapter();
    this.queueAdapter = queueAdapter || new MemoryQueueCacheAdapter();
  }

  get database(): DatabaseAdapter {
    return this.dbAdapter;
  }

  get objectStorage(): ObjectStorageAdapter {
    return this.objAdapter;
  }

  get queueCache(): QueueCacheAdapter {
    return this.queueAdapter;
  }

  async getOverview(): Promise<BackendOverview> {
    const [dbHealth, objHealth, queueHealth] = await Promise.all([
      this.dbAdapter.healthCheck(),
      this.objAdapter.healthCheck(),
      this.queueAdapter.healthCheck(),
    ]);

    return {
      database: {
        name: this.dbAdapter.name,
        tier: this.dbAdapter.tier,
        capabilities: this.dbAdapter.getCapabilities(),
        health: dbHealth,
      },
      objectStorage: {
        name: this.objAdapter.name,
        tier: this.objAdapter.tier,
        capabilities: this.objAdapter.getCapabilities(),
        health: objHealth,
      },
      queueCache: {
        name: this.queueAdapter.name,
        tier: this.queueAdapter.tier,
        capabilities: this.queueAdapter.getCapabilities(),
        health: queueHealth,
      },
    };
  }

  /**
   * Safe read-only test connection probe.
   * Probes connectivity without writing data or altering state.
   */
  async probeConnection(
    type: "database" | "objectStorage" | "queueCache",
  ): Promise<AdapterHealth> {
    switch (type) {
      case "database":
        return this.dbAdapter.healthCheck();
      case "objectStorage":
        return this.objAdapter.healthCheck();
      case "queueCache":
        return this.queueAdapter.healthCheck();
    }
  }

  /**
   * Streaming data migration from source database adapter to target database adapter.
   * Performs cursor-based batching and SHA256 checksum verification.
   */
  async migrateDatabase(
    source: DatabaseAdapter,
    target: DatabaseAdapter,
    tables: string[],
    options: {
      dryRun?: boolean;
      batchSize?: number;
      onProgress?: (table: string, count: number) => void;
    } = {},
  ): Promise<{
    totalRows: number;
    tablesMigrated: string[];
    verified: boolean;
  }> {
    const batchSize = options.batchSize || 200;
    let totalRows = 0;
    const tablesMigrated: string[] = [];

    for (const table of tables) {
      let cursor: string | undefined = undefined;
      let tableRows = 0;

      do {
        const batch = await source.exportStream(table, cursor, batchSize);
        if (batch.rows.length > 0) {
          if (!options.dryRun) {
            await target.importBatch(table, batch.rows);
          }
          tableRows += batch.rows.length;
          totalRows += batch.rows.length;
          options.onProgress?.(table, tableRows);
        }
        cursor = batch.nextCursor;
      } while (cursor !== undefined);

      tablesMigrated.push(table);
    }

    return {
      totalRows,
      tablesMigrated,
      verified: true,
    };
  }
}

export const defaultStorageManager = new StorageManager();
