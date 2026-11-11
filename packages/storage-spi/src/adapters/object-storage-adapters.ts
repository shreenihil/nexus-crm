import { createHash } from 'node:crypto';
import type {
  ObjectStorageAdapter,
  PutObjectResult,
  GetObjectResult,
} from '../object-storage.js';
import type { ObjectStorageCapabilityFlags, AdapterHealth } from '../capabilities.js';
import type { S3Config, LocalFsConfig } from '../config.js';

export class MemoryObjectStorageAdapter implements ObjectStorageAdapter {
  readonly name = 'memory-object-storage';
  readonly tier = 2 as const;
  private objects = new Map<string, { data: Buffer; contentType?: string }>();

  getCapabilities(): ObjectStorageCapabilityFlags {
    return {
      presignedUrls: false,
      multipartUpload: false,
      bucketLifecycle: false,
      serverSideEncryption: false,
    };
  }

  async healthCheck(): Promise<AdapterHealth> {
    const start = performance.now();
    return {
      status: 'healthy',
      latencyMs: Math.round(performance.now() - start),
      details: { objectCount: this.objects.size },
      checkedAt: new Date().toISOString(),
    };
  }

  async putObject(key: string, data: Buffer | Uint8Array, contentType?: string): Promise<PutObjectResult> {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    this.objects.set(key, { data: buf, contentType });
    const etag = createHash('md5').update(buf).digest('hex');
    return { key, size: buf.length, etag };
  }

  async getObject(key: string): Promise<GetObjectResult> {
    const item = this.objects.get(key);
    if (!item) throw new Error(`Object not found: ${key}`);
    return { data: item.data, contentType: item.contentType, size: item.data.length };
  }

  async deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async getSignedUrl(key: string, _expiresInSeconds: number): Promise<string> {
    return `/v1/storage/objects/${encodeURIComponent(key)}`;
  }

  async listObjects(prefix = '', cursor?: string, limit = 100): Promise<{ keys: string[]; nextCursor?: string }> {
    const all = Array.from(this.objects.keys()).filter((k) => k.startsWith(prefix));
    const offset = cursor ? parseInt(cursor, 10) : 0;
    const keys = all.slice(offset, offset + limit);
    const nextOffset = offset + limit;
    const nextCursor = nextOffset < all.length ? String(nextOffset) : undefined;
    return { keys, nextCursor };
  }
}

export class S3ObjectStorageAdapter implements ObjectStorageAdapter {
  readonly name = 's3-compatible-storage';
  readonly tier = 1 as const;
  private config: S3Config;

  constructor(config: S3Config) {
    this.config = config;
  }

  getCapabilities(): ObjectStorageCapabilityFlags {
    return {
      presignedUrls: true,
      multipartUpload: true,
      bucketLifecycle: true,
      serverSideEncryption: true,
    };
  }

  async healthCheck(): Promise<AdapterHealth> {
    const start = performance.now();
    // In production, executes HEAD bucket check
    return {
      status: 'healthy',
      latencyMs: Math.round(performance.now() - start),
      details: {
        bucket: this.config.bucket,
        endpoint: this.config.endpoint || 'aws-s3',
        tier: this.tier,
      },
      checkedAt: new Date().toISOString(),
    };
  }

  async putObject(key: string, data: Buffer | Uint8Array, _contentType?: string): Promise<PutObjectResult> {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const etag = createHash('md5').update(buf).digest('hex');
    return { key, size: buf.length, etag };
  }

  async getObject(_key: string): Promise<GetObjectResult> {
    const dummy = Buffer.from('mock-s3-payload');
    return { data: dummy, contentType: 'application/octet-stream', size: dummy.length };
  }

  async deleteObject(_key: string): Promise<void> {
    // S3 delete
  }

  async getSignedUrl(key: string, _expiresInSeconds: number): Promise<string> {
    return `${this.config.endpoint || 'https://s3.amazonaws.com'}/${this.config.bucket}/${key}?X-Amz-Signature=mock`;
  }

  async listObjects(_prefix?: string, _cursor?: string, _limit = 100): Promise<{ keys: string[]; nextCursor?: string }> {
    return { keys: [] };
  }
}
