import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  scryptSync,
} from 'node:crypto';

export interface EncryptedDekEnvelope {
  dekId: string;
  workspaceId?: string;
  keyVersion: number;
  encryptedDek: string; // base64
  iv: string; // base64
  authTag: string; // base64
}

export interface EncryptedFieldPayload {
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
  dekId: string;
  keyVersion: number;
  algorithm: 'AES-256-GCM';
}

/**
 * Generates a 256-bit cryptographically secure random key.
 */
export function generateKey(): Buffer {
  return randomBytes(32);
}

/**
 * Derives a 256-bit key from a customer passphrase using Scrypt KDF.
 */
export function deriveKeyFromPassphrase(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, 32);
}

/**
 * Encrypts a Data Encryption Key (DEK) under a Master Key Encryption Key (KEK).
 */
export function wrapDek(
  kek: Buffer,
  dek: Buffer,
  dekId: string,
  keyVersion: number
): EncryptedDekEnvelope {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', kek, iv);

  const encryptedDek = Buffer.concat([cipher.update(dek), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    dekId,
    keyVersion,
    encryptedDek: encryptedDek.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypts an encrypted Data Encryption Key (DEK) using the Master Key Encryption Key (KEK).
 */
export function unwrapDek(kek: Buffer, envelope: EncryptedDekEnvelope): Buffer {
  const iv = Buffer.from(envelope.iv, 'base64');
  const authTag = Buffer.from(envelope.authTag, 'base64');
  const encryptedDek = Buffer.from(envelope.encryptedDek, 'base64');

  const decipher = createDecipheriv('aes-256-gcm', kek, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encryptedDek), decipher.final()]);
}

/**
 * Encrypts plaintext data using a Data Encryption Key (DEK) with AES-256-GCM.
 * Optional Associated Authenticated Data (AAD) binds the ciphertext to a tenant/record.
 */
export function encryptData(
  dek: Buffer,
  plaintext: string | Buffer,
  aad?: string
): { ciphertext: string; iv: string; authTag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', dek, iv);

  if (aad) {
    cipher.setAAD(Buffer.from(aad, 'utf8'));
  }

  const inputBuffer = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
  const encrypted = Buffer.concat([cipher.update(inputBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypts ciphertext data using a Data Encryption Key (DEK) with AES-256-GCM.
 * Validates GCM auth tag and Associated Authenticated Data (AAD).
 */
export function decryptData(
  dek: Buffer,
  encrypted: { ciphertext: string; iv: string; authTag: string },
  aad?: string
): Buffer {
  const iv = Buffer.from(encrypted.iv, 'base64');
  const authTag = Buffer.from(encrypted.authTag, 'base64');
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');

  const decipher = createDecipheriv('aes-256-gcm', dek, iv);
  decipher.setAuthTag(authTag);

  if (aad) {
    decipher.setAAD(Buffer.from(aad, 'utf8'));
  }

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
