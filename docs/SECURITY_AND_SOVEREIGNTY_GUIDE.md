# Security, Cryptography & Data Sovereignty Guide

Nexus CRM is architected to give organizations complete sovereignty over their customer data, cryptographic keys, and audit trails.

## 1. BYOK Envelope Encryption Architecture

Data at rest is secured via multi-tiered envelope encryption:

- **Master Key Encrypting Key (Master KEK)**: 256-bit AES key supplied via environment variable `NEXUS_MASTER_KEY_SEED` or hardware security module (HSM).
- **Tenant Data Encryption Keys (Tenant DEKs)**: Per-workspace cryptographic keys wrapped with the Master KEK using AES-256-GCM.
- **Mandatory 16-Byte Auth Tag**: All ciphertext envelopes strictly enforce `{ authTagLength: 16 }` to prevent forgery or padding attacks.

### Zero-Downtime Key Rotation

When rotating master keys via `POST /v1/platform/kms/rotate`:

1. A new Master KEK version is generated.
2. Active DEKs are decrypted with the existing KEK and immediately re-wrapped under the new KEK in memory (< 100ms).
3. Previous KEK versions transition to `ROTATED` status to ensure historical audit log decryptability.

---

## 2. Tamper-Evident SHA-256 Audit Ledger

All system operations, permission changes, exports, and sensitive record updates are logged to a cryptographically sealed hash chain:

$$H_n = \text{SHA256}(H_{n-1} \parallel \text{timestamp} \parallel \text{actorId} \parallel \text{action} \parallel \text{payload})$$

- Genesis block starts at $H_0 = 0000000000000000000000000000000000000000000000000000000000000000$.
- Any modification, deletion, or reordering of historical records breaks the hash chain.
- Verified in real time via `GET /v1/audit/verify`.

---

## 3. Server-Side Request Forgery (SSRF) Defense

Outbound webhooks and URL enrichments pass through a strict IP validation filter (`apps/api/src/lib/ssrf.ts`):

- **RFC 1918 Private Ranges**: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` blocked.
- **Loopback & Localhost**: `127.0.0.0/8`, `::1`, `localhost` blocked.
- **Link-Local & Cloud Metadata**: `169.254.0.0/16`, AWS/GCP/Azure instance metadata endpoints blocked.
- **Non-HTTP Protocols**: `ftp:`, `file:`, `gopher:`, `ldap:` rejected; only `https:` and `http:` allowed.

---

## 4. Multi-Tenant IDOR Protection

Row-Level Security (RLS) is enforced at the database and application layer:

- Every query mandates explicit tenant context: `WHERE workspace_id = $workspace_id`.
- Foreign key cross-tenant traversal is blocked by tenant-isolated compound indexes.
