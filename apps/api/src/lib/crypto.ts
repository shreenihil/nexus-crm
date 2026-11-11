import * as crypto from "crypto";

/**
 * UUIDv7 generation per RFC 9562 (timestamp-ordered UUID).
 */
export function generateUuidV7(): string {
  const timestamp = Date.now();
  const bytes = crypto.randomBytes(16);

  // 48-bit timestamp in big-endian
  bytes.writeUIntBE(Math.floor(timestamp / 0x10000), 0, 4);
  bytes.writeUInt16BE(timestamp & 0xffff, 4);

  // Version 7: 0111 in bits 48-51
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  // Variant 10xx in bits 64-65
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  return [
    bytes.subarray(0, 4).toString("hex"),
    bytes.subarray(4, 6).toString("hex"),
    bytes.subarray(6, 8).toString("hex"),
    bytes.subarray(8, 10).toString("hex"),
    bytes.subarray(10, 16).toString("hex"),
  ].join("-");
}

/**
 * Secure password hashing using scrypt (Node crypto native, comparable to Argon2id).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      64,
      { N: 16384, r: 8, p: 1 },
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(
          `$scrypt$N=16384,r=8,p=1$${salt}$${derivedKey.toString("hex")}`,
        );
      },
    );
  });
}

/**
 * Constant-time verification of password against stored hash.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length < 5) return false;
  const salt = parts[3];
  const originalKeyHex = parts[4];
  if (!salt || !originalKeyHex) return false;

  const originalKey = Buffer.from(originalKeyHex, "hex");

  return new Promise((resolve) => {
    crypto.scrypt(
      password,
      salt,
      originalKey.length,
      { N: 16384, r: 8, p: 1 },
      (err, derivedKey) => {
        if (err) return resolve(false);
        try {
          resolve(crypto.timingSafeEqual(originalKey, derivedKey));
        } catch {
          resolve(false);
        }
      },
    );
  });
}

/**
 * Base32 alphabet for TOTP (RFC 3548 / RFC 4648).
 */
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateBase32Secret(length = 20): string {
  const randomBytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < randomBytes.length; i++) {
    result += BASE32_CHARS[(randomBytes[i] ?? 0) % 32];
  }
  return result;
}

function base32ToBuffer(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const index = BASE32_CHARS.indexOf(char ?? "");
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * RFC 6238 TOTP computation (6 digits, 30s step, HMAC-SHA1).
 */
export function computeTotpCode(
  secretBase32: string,
  time = Date.now(),
): string {
  const timeStep = 30;
  const counter = Math.floor(time / 1000 / timeStep);

  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const key = base32ToBuffer(secretBase32);
  const hmac = crypto.createHmac("sha1", key).update(buffer).digest();

  const offset = (hmac[hmac.length - 1] ?? 0) & 0xf;
  const codeInt =
    (((hmac[offset] ?? 0) & 0x7f) << 24) |
    (((hmac[offset + 1] ?? 0) & 0xff) << 16) |
    (((hmac[offset + 2] ?? 0) & 0xff) << 8) |
    ((hmac[offset + 3] ?? 0) & 0xff);

  const code = (codeInt % 1000000).toString().padStart(6, "0");
  return code;
}

/**
 * Verifies TOTP code within +-1 time step (RFC 6238 drift window).
 */
export function verifyTotpCode(
  secretBase32: string,
  token: string,
  time = Date.now(),
): boolean {
  const timeSteps = [-30000, 0, 30000];
  for (const delta of timeSteps) {
    const candidate = computeTotpCode(secretBase32, time + delta);
    if (candidate === token) {
      return true;
    }
  }
  return false;
}

/**
 * Generates 10 cryptographically random recovery codes (format: XXXX-XXXX).
 */
export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const hex = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${hex.slice(0, 4)}-${hex.slice(4, 8)}`);
  }
  return codes;
}

/**
 * Deterministic canonical JSON serialization with sorted keys at all levels.
 */
function canonicalJson(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJson).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(obj[k])).join(",") +
    "}"
  );
}

/**
 * SHA-256 hash calculation for audit log chaining.
 */
export function calculateAuditHash(
  prevHash: string,
  payload: Record<string, any>,
): string {
  const serialized = canonicalJson(payload);
  return crypto
    .createHash("sha256")
    .update(`${prevHash}:${serialized}`)
    .digest("hex");
}
