import { describe, it, expect } from "vitest";
import {
  generateKey,
  wrapDek,
  unwrapDek,
  encryptData,
  decryptData,
  deriveKeyFromPassphrase,
  rotateMasterKey,
} from "../index.js";

describe("KMS Envelope Encryption & BYOK Key Management", () => {
  it("generates 256-bit keys and successfully wraps and unwraps DEKs under a master KEK", () => {
    const masterKek = generateKey();
    const dataDek = generateKey();
    const dekId = "dek-tenant-acme-1";

    // Wrap DEK under master KEK (Version 1)
    const envelope = wrapDek(masterKek, dataDek, dekId, 1);
    expect(envelope.dekId).toBe(dekId);
    expect(envelope.keyVersion).toBe(1);
    expect(envelope.encryptedDek).toBeDefined();
    expect(envelope.iv).toBeDefined();
    expect(envelope.authTag).toBeDefined();

    // Unwrap DEK
    const unwrappedDek = unwrapDek(masterKek, envelope);
    expect(unwrappedDek.equals(dataDek)).toBe(true);
  });

  it("encrypts and decrypts sensitive data payloads with AES-256-GCM", () => {
    const dataDek = generateKey();
    const sensitivePayload =
      "Social Security Number: 000-12-3456; Bank Account: 9876543210";

    const encrypted = encryptData(dataDek, sensitivePayload);
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.ciphertext).not.toBe(sensitivePayload);

    const decrypted = decryptData(dataDek, encrypted);
    expect(decrypted.toString("utf8")).toBe(sensitivePayload);
  });

  it("binds ciphertext to tenant and record ID via Associated Authenticated Data (AAD)", () => {
    const dataDek = generateKey();
    const sensitiveData = "High-Value Enterprise Deal Terms: $10,000,000";
    const validAad = "tenant:ws-acme-1:record:deal-999";
    const maliciousAad = "tenant:ws-rogue-corp:record:deal-999";

    // Encrypt with valid AAD
    const encrypted = encryptData(dataDek, sensitiveData, validAad);

    // Decrypting with the same AAD succeeds
    const decrypted = decryptData(dataDek, encrypted, validAad);
    expect(decrypted.toString("utf8")).toBe(sensitiveData);

    // Decrypting with swapped/tampered AAD fails GCM authentication
    expect(() => {
      decryptData(dataDek, encrypted, maliciousAad);
    }).toThrow();
  });

  it("rejects tampered ciphertext or modified auth tags", () => {
    const dataDek = generateKey();
    const sensitiveData = "Cryptographic Secret";

    const encrypted = encryptData(dataDek, sensitiveData);

    // Tamper with ciphertext
    const tamperedBuffer = Buffer.from(encrypted.ciphertext, "base64");
    tamperedBuffer[0]! ^= 0xff; // Flip bits
    const tamperedCiphertext = tamperedBuffer.toString("base64");

    expect(() => {
      decryptData(dataDek, {
        ...encrypted,
        ciphertext: tamperedCiphertext,
      });
    }).toThrow();
  });

  it("executes zero-downtime master key rotation (re-wrapping DEKs in milliseconds without touching data)", () => {
    const oldKek = generateKey();
    const newKek = generateKey();
    const dataDek = generateKey();

    const sensitiveData =
      "Client API Secret Key: test_key_mock_arbitrary_string";
    const aad = "workspace:ws-1:record:rec-1";

    // 1. Initial encryption under DEK wrapped by oldKek (Version 1)
    const initialEnvelope = wrapDek(oldKek, dataDek, "dek-1", 1);
    const encryptedData = encryptData(dataDek, sensitiveData, aad);

    // Decrypt data with initial envelope
    const dekV1 = unwrapDek(oldKek, initialEnvelope);
    expect(decryptData(dekV1, encryptedData, aad).toString("utf8")).toBe(
      sensitiveData,
    );

    // 2. Perform zero-downtime key rotation: re-wrap envelopes under newKek (Version 2)
    const rotation = rotateMasterKey(oldKek, newKek, 1, [initialEnvelope]);

    expect(rotation.previousVersion).toBe(1);
    expect(rotation.newVersion).toBe(2);
    expect(rotation.envelopesReWrapped).toBe(1);
    expect(rotation.durationMs).toBeLessThan(100);

    const rotatedEnvelope = rotation.rotatedEnvelopes[0]!;
    expect(rotatedEnvelope.keyVersion).toBe(2);

    // 3. Verify data decrypts identically using the newly wrapped envelope and newKek
    const dekV2 = unwrapDek(newKek, rotatedEnvelope);
    expect(dekV2.equals(dataDek)).toBe(true);

    const decryptedAfterRotation = decryptData(dekV2, encryptedData, aad);
    expect(decryptedAfterRotation.toString("utf8")).toBe(sensitiveData);
  });
});
