# Security Policy

Nexus CRM treats security, tenant isolation, and data sovereignty as fundamental product requirements. We appreciate the responsible disclosure of security issues by researchers and contributors.

## Supported Versions

| Version | Supported          | Security SLA |
| ------- | ------------------ | ------------ |
| 1.0.x   | :white_check_mark: | 14-day patch |
| < 1.0   | :x:                | Unsupported  |

## Reporting a Vulnerability

**Please do NOT disclose security vulnerabilities publicly via GitHub Issues or Discussions.**

To report a vulnerability:

- Send an encrypted email to **security@nexus-crm.local**, OR
- Submit a confidential advisory via GitHub's [Private Vulnerability Reporting](https://github.com/nexus-crm/nexus/security/advisories/new).

Please include:

1. Detailed description of the vulnerability and its potential impact.
2. Step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
3. Any suggested remediation steps or mitigations.

## Response & Patch SLA

- **Acknowledgement**: Within **48 hours** of report receipt.
- **Triage & Assessment**: Within **5 business days**.
- **Fix & Patch Release**: Within **14 calendar days** for Critical/High severity vulnerabilities.

## Safe Harbor Policy

Nexus CRM supports good-faith security research. We will not pursue legal action against researchers who:

- Perform testing exclusively within local or authorized environments.
- Avoid accessing, altering, or destroying another user or organization's data.
- Refrain from executing Denial of Service (DoS/DDoS) attacks.
- Provide us reasonable time to remediate before public disclosure (coordinated disclosure).

## Cryptographic Guarantees

- **BYOK Envelope Encryption**: Master KEK wrapping per-tenant DEKs via AES-256-GCM with mandatory 16-byte authentication tags.
- **Tamper-Evident Audit Ledger**: SHA-256 append-only chained cryptographic log.
- **SSRF Defense**: RFC1918, loopback (127.0.0.0/8), link-local (169.254.0.0/16), IPv6 ULA, and metadata endpoint blocking on all outbound webhooks.
