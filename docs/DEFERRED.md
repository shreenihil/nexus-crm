# Deferred Scope & Technical Backlog

This document lists items intentionally deferred per phase, with explicit rationales and phase targets.

| Item                         | Reason for Deferral                                                                                                                   | Scheduled Phase                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| WebAuthn / Passkeys          | Master Brief §2 notes WebAuthn; Phase 0 exit gate requires password + TOTP MFA. Passkeys will be layered in alongside SSO in Phase 4. | Phase 4 (Integrations & Auth expansion) |
| OIDC/SAML Enterprise SSO     | Requires external identity provider configurations; base user auth and tenant boundary is priority for Phase 0.                       | Phase 4 (Integrations)                  |
| Headless Chromium PDF Engine | PDF quote generation belongs to Revenue Operations.                                                                                   | Phase 6 (Revenue ops)                   |
| GraphQL Endpoint             | REST OpenAPI 3.1 is foundational for Phase 0 auth and workspace shell; dynamic GraphQL schema generated in Phase 1 metadata model.    | Phase 1 (Data core)                     |
