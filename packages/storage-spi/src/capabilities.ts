export interface DatabaseCapabilityFlags {
  transactions: boolean;
  vectorSearch: boolean;
  fullTextSearch: boolean;
  timeTravel: boolean;
  streamingReplication: boolean;
  savepoints: boolean;
}

export interface ObjectStorageCapabilityFlags {
  presignedUrls: boolean;
  multipartUpload: boolean;
  bucketLifecycle: boolean;
  serverSideEncryption: boolean;
}

export interface QueueCacheCapabilityFlags {
  distributedLocks: boolean;
  pubSub: boolean;
  consumerGroups: boolean;
  delayedQueues: boolean;
  atomicCounters: boolean;
}

export interface AdapterHealth {
  status: "healthy" | "degraded" | "unreachable";
  latencyMs: number;
  message?: string;
  details?: Record<string, any>;
  checkedAt: string;
}
