import type { ObjectStorageCapabilityFlags, AdapterHealth } from './capabilities.js';

export interface PutObjectResult {
  key: string;
  size: number;
  etag: string;
}

export interface GetObjectResult {
  data: Buffer;
  contentType?: string;
  size: number;
}

export interface ObjectStorageAdapter {
  readonly name: string;
  readonly tier: 1 | 2;

  getCapabilities(): ObjectStorageCapabilityFlags;
  healthCheck(): Promise<AdapterHealth>;

  putObject(key: string, data: Buffer | Uint8Array, contentType?: string): Promise<PutObjectResult>;
  getObject(key: string): Promise<GetObjectResult>;
  deleteObject(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
  listObjects(prefix?: string, cursor?: string, limit?: number): Promise<{ keys: string[]; nextCursor?: string }>;
}
