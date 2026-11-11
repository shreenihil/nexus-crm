import { createHash } from "node:crypto";
import type { DatabaseAdapter } from "../database.js";
import type {
  DatabaseCapabilityFlags,
  AdapterHealth,
} from "../capabilities.js";

export class MemoryDatabaseAdapter implements DatabaseAdapter {
  readonly name = "in-memory-sqlite";
  readonly tier = 2 as const;
  private connected = false;
  private tables = new Map<string, any[]>();

  getCapabilities(): DatabaseCapabilityFlags {
    return {
      transactions: true,
      vectorSearch: false,
      fullTextSearch: false,
      timeTravel: false,
      streamingReplication: false,
      savepoints: true,
    };
  }

  async healthCheck(): Promise<AdapterHealth> {
    const start = performance.now();
    return {
      status: this.connected ? "healthy" : "degraded",
      latencyMs: Math.round(performance.now() - start),
      details: {
        tableCount: this.tables.size,
        tier: this.tier,
      },
      checkedAt: new Date().toISOString(),
    };
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async query<T = any>(sql: string, _params?: any[]): Promise<T[]> {
    if (!this.connected) throw new Error("Database not connected");
    return [];
  }

  async execute(
    _sql: string,
    _params?: any[],
  ): Promise<{ rowsAffected: number }> {
    if (!this.connected) throw new Error("Database not connected");
    return { rowsAffected: 0 };
  }

  async transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async migrate(): Promise<{ appliedMigrations: string[] }> {
    return { appliedMigrations: ["001_genesis_schema"] };
  }

  async exportStream(
    table: string,
    cursor?: string,
    batchSize = 100,
  ): Promise<{ rows: any[]; nextCursor?: string; checksum: string }> {
    const all = this.tables.get(table) || [];
    const offset = cursor ? parseInt(cursor, 10) : 0;
    const rows = all.slice(offset, offset + batchSize);
    const nextOffset = offset + batchSize;
    const nextCursor = nextOffset < all.length ? String(nextOffset) : undefined;
    const checksum = createHash("sha256")
      .update(JSON.stringify(rows))
      .digest("hex");
    return { rows, nextCursor, checksum };
  }

  async importBatch(table: string, rows: any[]): Promise<{ inserted: number }> {
    if (!this.tables.has(table)) {
      this.tables.set(table, []);
    }
    const current = this.tables.get(table)!;
    current.push(...rows);
    return { inserted: rows.length };
  }
}
