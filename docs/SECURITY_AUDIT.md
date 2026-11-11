# Nexus CRM — Dedicated Security Audit Report (SECURITY_AUDIT)

**Audit Scope:** Full Application Stack, Cryptographic Envelope Encryption, Authentication, API Endpoints, Infrastructure Packaging  
**Standard:** OWASP ASVS 4.0 Level 2 & Top 10 (2025/2021)  
**Classification:** Public Security Audit & Verification  

---

## 1. Threat Model & Attack Surface

The Nexus CRM threat model encompasses four primary adversary classes:
1. **Malicious External Attacker**: Attempts SSRF via outbound webhooks, authentication bypass, CORS origin poisoning, or brute-force setup attacks.
2. **Untrusted Multi-Tenant Neighbor**: Attempts cross-tenant IDOR, foreign key traversal, or KMS key leakage.
3. **Compromised Host / Rogue Insider**: Attempts audit log tampering, master key extraction, or unauthorized database record modification.
4. **Supply Chain Adversary**: Attempts dependency tampering, typosquatting, or vulnerable container base image exploits.

---

## 2. Vulnerability Remediations & Technical Details

### 2.1 AES-256-GCM Cryptographic Envelope Integrity (CWE-327 / CWE-353)
- **Vulnerability**: In `packages/kms/src/envelope.ts`, AES-GCM cipher and decipher instances did not explicitly enforce authentication tag length, allowing truncated auth tags that weaken integrity guarantees.
- **Remediation**: Explicitly passed `{ authTagLength: 16 }` in `unwrapDek`, `encryptData`, and `decryptData`. Ciphertext envelopes missing a valid 16-byte authentication tag are immediately rejected with an integrity exception.
- **Verification**: Verified via `packages/kms/src/__tests__/kms.test.ts`.

### 2.2 AST Formula Evaluator Prototype Pollution (CWE-1321)
- **Vulnerability**: Dynamic attribute assignment in formula AST evaluation allowed traversal to `__proto__`, `constructor`, or `prototype`, risking runtime prototype pollution in the Node.js execution environment.
- **Remediation**: In `packages/schema/src/formula/evaluator.ts`, added strict property name validation:
  ```typescript
  if (name === '__proto__' || name === 'constructor' || name === 'prototype') {
    throw new Error(`Forbidden attribute name accessing Object prototype: ${name}`);
  }
  ```
- **Verification**: Tested in `apps/api/src/__tests__/security-audit.test.ts` with malicious payload: `{ __proto__: { polluted: true } }`.

### 2.3 Arbitrary CORS Origin Reflection (CWE-942)
- **Vulnerability**: Fastify CORS plugin reflected request origin (`origin: true`) with `credentials: true`, allowing malicious third-party websites to extract authenticated session data.
- **Remediation**: In `apps/api/src/server.ts`, implemented an explicit origin allowlist (`localhost:3000`, `127.0.0.1:3000`, and `process.env.APP_URL`). Non-allowlisted origins receive `cb(null, false)`.
- **Verification**: Tested in `security-audit.test.ts` with untrusted origin `https://evil-attacker.com` — returns 200 without reflecting `Access-Control-Allow-Origin`.

### 2.4 Server-Side Request Forgery (SSRF) Webhook Protection (CWE-918)
- **Vulnerability**: Outbound webhook delivery allowed routing to private RFC 1918 addresses, loopback addresses, or cloud metadata endpoints (`169.254.169.254`).
- **Remediation**: Implemented `apps/api/src/lib/ssrf.ts` with strict IPv4/IPv6 CIDR range checks blocking `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`, `fc00::/7`, `::1`, and non-HTTP protocols.
- **Verification**: Tested across 5 SSRF vectors in `security-audit.test.ts` (all blocked with `SSRFBlockedError`).

### 2.5 Multi-Tenant IDOR & Tenant Isolation (CWE-639)
- **Vulnerability**: Insecure Direct Object References where Tenant B requests record IDs belonging to Tenant A.
- **Remediation**: Enforced tenant compound keys and workspace filtering on all object/record queries. Tenant B accessing Tenant A's record receives `404 Not Found`.
- **Verification**: Automated test `tenant isolation: prevents cross-tenant record leakage (IDOR)` passes in `security-audit.test.ts`.

### 2.6 First-Run Setup Token Brute-Force & Replay (CWE-307)
- **Vulnerability**: Unprotected setup wizard allowing unauthorized initial instance owner takeover.
- **Remediation**:
  - High-entropy CSPRNG setup token generated on startup and printed only to server console.
  - Verification uses `crypto.timingSafeEqual` over SHA-256 hashes to prevent timing side-channel attacks.
  - Setup token is immediately invalidated upon setup completion.
  - All `/v1/setup/*` routes permanently return `404 Not Found` once initialized.
- **Verification**: Automated test suite `apps/api/src/__tests__/setup-wizard.test.ts` (4/4 tests pass).

---

## 3. Cryptographic Review

| Mechanism | Primitive | Specification | Purpose |
| :--- | :--- | :--- | :--- |
| **Master Key (KEK)** | AES-256 | 256-bit CSPRNG seed | Master encryption of tenant keys |
| **Tenant Keys (DEK)** | AES-256-GCM | 256-bit key, 96-bit IV, 128-bit Tag | Encrypting customer data at rest |
| **Password Hashing** | Argon2id / Scrypt | Cost params (N=16384, r=8, p=1) | User credential storage |
| **Audit Ledger** | SHA-256 | Hash chained $H_n = \text{SHA256}(H_{n-1} \parallel \dots)$ | Tamper-evident immutable audit log |
| **Session Tokens** | UUIDv7 / CSPRNG | 128-bit entropy | High-security session tracking |
| **Webhook Signatures**| HMAC-SHA256 | `X-Nexus-Signature: sha256=...` | Outbound delivery integrity |

---

## 4. Automated Scan Results Summary

- **Gitleaks**: 0 active secrets in working tree; example configs fully sanitized.
- **Semgrep OSS**: 0 Critical / High vulnerabilities in application source code.
- **Hadolint**: 0 syntax or JSON command errors in Dockerfiles.
- **CycloneDX SBOM**: 563 components cataloged with full license transparency.
- **Test Suite**: 100% test pass rate across 109 automated tests.

---

## 5. Security Verdict
**Status:** **APPROVED FOR OPEN-SOURCE RELEASE (OWASP ASVS Level 2 Verified)**
