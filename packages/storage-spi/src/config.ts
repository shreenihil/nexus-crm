import { z } from "zod";

export const PostgresConfigSchema = z.object({
  type: z.literal("postgres"),
  host: z.string().min(1),
  port: z.number().int().default(5432),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
  ssl: z.boolean().default(false),
  maxConnections: z.number().int().default(20),
});

export const SqliteConfigSchema = z.object({
  type: z.literal("sqlite"),
  filepath: z.string().min(1),
  inMemory: z.boolean().default(false),
});

export const S3ConfigSchema = z.object({
  type: z.literal("s3"),
  endpoint: z.string().url().optional(),
  region: z.string().default("us-east-1"),
  bucket: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  forcePathStyle: z.boolean().default(false),
});

export const LocalFsConfigSchema = z.object({
  type: z.literal("local-fs"),
  baseDir: z.string().min(1),
});

export const RedisConfigSchema = z.object({
  type: z.literal("redis"),
  host: z.string().min(1),
  port: z.number().int().default(6379),
  password: z.string().optional(),
  db: z.number().int().default(0),
  tls: z.boolean().default(false),
});

export const MemoryCacheConfigSchema = z.object({
  type: z.literal("memory"),
  maxItems: z.number().int().default(10000),
});

export const StorageBackendConfigSchema = z.object({
  database: z.discriminatedUnion("type", [
    PostgresConfigSchema,
    SqliteConfigSchema,
  ]),
  objectStorage: z.discriminatedUnion("type", [
    S3ConfigSchema,
    LocalFsConfigSchema,
  ]),
  queueCache: z.discriminatedUnion("type", [
    RedisConfigSchema,
    MemoryCacheConfigSchema,
  ]),
});

export type PostgresConfig = z.infer<typeof PostgresConfigSchema>;
export type SqliteConfig = z.infer<typeof SqliteConfigSchema>;
export type S3Config = z.infer<typeof S3ConfigSchema>;
export type LocalFsConfig = z.infer<typeof LocalFsConfigSchema>;
export type RedisConfig = z.infer<typeof RedisConfigSchema>;
export type MemoryCacheConfig = z.infer<typeof MemoryCacheConfigSchema>;
export type StorageBackendConfig = z.infer<typeof StorageBackendConfigSchema>;
