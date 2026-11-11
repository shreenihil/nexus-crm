import {
  generateKey,
  wrapDek,
  unwrapDek,
  type EncryptedDekEnvelope,
} from "./envelope.js";

export interface KeyVersionMetadata {
  version: number;
  algorithm: "AES-256-GCM";
  status: "ACTIVE" | "ROTATED" | "REVOKED";
  createdAt: string;
  rotatedAt?: string | null;
}

export interface RotationResult {
  previousVersion: number;
  newVersion: number;
  envelopesReWrapped: number;
  rotatedEnvelopes: EncryptedDekEnvelope[];
  durationMs: number;
}

/**
 * Executes a zero-downtime master key rotation (re-wrapping existing DEKs under the new KEK).
 */
export function rotateMasterKey(
  oldKek: Buffer,
  newKek: Buffer,
  currentVersion: number,
  existingEnvelopes: EncryptedDekEnvelope[],
): RotationResult {
  const startTime = performance.now();
  const newVersion = currentVersion + 1;
  const rotatedEnvelopes: EncryptedDekEnvelope[] = [];

  for (const env of existingEnvelopes) {
    // 1. Unwrap DEK using the old KEK
    const rawDek = unwrapDek(oldKek, env);

    // 2. Re-wrap DEK under the new KEK with updated version
    const reWrapped = wrapDek(newKek, rawDek, env.dekId, newVersion);
    if (env.workspaceId) reWrapped.workspaceId = env.workspaceId;
    rotatedEnvelopes.push(reWrapped);
  }

  const durationMs = Math.round(performance.now() - startTime);

  return {
    previousVersion: currentVersion,
    newVersion,
    envelopesReWrapped: rotatedEnvelopes.length,
    rotatedEnvelopes,
    durationMs,
  };
}
