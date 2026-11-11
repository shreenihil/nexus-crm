import type { DatabaseCapabilityFlags, AdapterHealth } from "./capabilities.js";

export interface DatabaseAdapter {
  readonly name: string;
  readonly tier: 1 | 2;

  getCapabilities(): DatabaseCapabilityFlags;
  healthCheck(): Promise<AdapterHealth>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<{ rowsAffected: number }>;
  transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T>;
  migrate(): Promise<{ appliedMigrations: string[] }>;

  // Streaming data migration primitives
  exportStream(
    table: string,
    cursor?: string,
    batchSize?: number,
  ): Promise<{ rows: any[]; nextCursor?: string; checksum: string }>;
  importBatch(table: string, rows: any[]): Promise<{ inserted: number }>;
}
