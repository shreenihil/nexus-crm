import type { QueueCacheCapabilityFlags, AdapterHealth } from './capabilities.js';

export interface LockHandle {
  release(): Promise<void>;
}

export interface QueueCacheAdapter {
  readonly name: string;
  readonly tier: 1 | 2;

  getCapabilities(): QueueCacheCapabilityFlags;
  healthCheck(): Promise<AdapterHealth>;

  // Cache KV
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;

  // Queue Operations
  enqueue(queueName: string, payload: any): Promise<{ jobId: string }>;
  dequeue(queueName: string): Promise<{ jobId: string; payload: any } | null>;

  // Pub/Sub
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string, handler: (message: string) => void): Promise<() => void>;

  // Distributed Locks
  acquireLock(lockKey: string, ttlMs: number): Promise<LockHandle | null>;
}
