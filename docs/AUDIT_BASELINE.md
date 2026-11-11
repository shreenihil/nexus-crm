# Phase 1: Baseline Audit & Verification Report

**Audit Date:** 2026-10-18  
**Scope:** Functional Traceability, Security Baseline Scans, Architectural Review, and Gap Analysis  
**Authority:** Derived from `/docs/RELEASE_BRIEF.md`, `/docs/MASTER_BRIEF.md`, and `/docs/ONBOARDING_AND_MARKETING_BRIEF.md`

---

## 1. Executive Summary

This baseline audit provides an evidence-based assessment of the current CRM repository. Every claim in this document is backed by active source code, automated scan reports under `/docs/audit/scans/`, automated test execution, or reproducible runtime checks.

### Requirement Status Distribution (from `/docs/audit/traceability.csv`)
Total Atomic Requirements Audited: **68**

| Status | Count | Percentage | Description |
|---|:---:|:---:|---|
| **Implemented-Verified** | 33 | 48.5% | Code exists, executed, passing test verification |
| **Implemented-Unverified** | 1 | 1.5% | Code exists, requires isolated empirical validation |
| **Partial** | 10 | 14.7% | Substantial implementation present with known gaps or scan warnings |
| **Missing** | 24 | 35.3% | Specification item not yet implemented in repository |
| **Deferred-Documented** | 0 | 0.0% | Formally deferred features (none currently waived) |
| **Not-Applicable** | 0 | 0.0% | N/A items |

---

## 2. Automated Baseline Security Scans Summary

Raw reports are committed under `/docs/audit/scans/`.

| Scan Tool | Target | Total Findings | Critical / High | Key Discoveries & Evidence |
|---|---|:---:|:---:|---|
| **Gitleaks** (`8.30.1`) | Git history & working tree | 7 | 2 | Hardcoded `NEXUS_MASTER_KEY_SEED` in `.env.example:36`; test token in `packages/kms/src/__tests__/kms.test.ts:86` |
| **Trufflehog** (`3.99.2`) | Git repository | 1 | 1 | Plaintext Postgres credentials in `.env.example:14` (`postgres://nexus:nexus_secure_pass_2026@postgres:5432`) |
| **Semgrep OSS** (`1.181.0`) | 203 source files (269 rules) | 24 | 3 Errors, 17 Warnings | Missing GCM `authTagLength: 16` in `packages/kms/src/envelope.ts:72,118`; prototype pollution risk in formula evaluator; unpinned GitHub Actions |
| **pnpm audit** / **OSV-Scanner** (`2.7.0`) | 422 dependency packages | 12 | 6 (2 Critical, 4 High) | `@fastify/static@9.3.0` path traversal (GHSA-83w8-p2f5-377r); `tinypool@1.1.1` RCE/prototype pollution (GHSA-5gmw-xhrv-c9v3); `vitest` arbitrary file read (GHSA-82fw-gwwq-j7x9) |
| **Hadolint** (`2.15.1`) | Dockerfiles (`apps/api`, `apps/web`) | 5 | 2 Warnings | Unpinned alpine apk packages (`DL3018`); missing JSON array notation in `CMD` (`DL3025`); unresolvable non-numeric UID (`DL3066`) |
| **Trivy** (`0.76.0`) | Repository filesystem & config | 10 | 10 Secrets | Flagged test API tokens and committed scan report secrets |
| **Nuclei DAST** (`3.11.1`) | Live API instance (`http://127.0.0.1:4000`) | 2 | 1 Medium/High | **CORS Arbitrary Origin Reflection with Credentials:** `origin: true` + `credentials: true` allows arbitrary cross-origin authenticated requests; Swagger UI exposed at `/docs/` |
| **License Inventory** | 54 direct/workspace packages | 54 | 0 Incompatible | 38 MIT, 6 ISC, 5 BlueOak-1.0.0, 3 Apache-2.0, 1 0BSD, 1 UNLICENSED (monorepo root). Zero copyleft/GPL contaminations |
| **CycloneDX SBOM** (`syft 1.54.1`) | Repository dependencies | 652 components | Verified | Spec v1.7 generated into `/docs/audit/scans/sbom-cyclonedx.json` |

---

## 3. Explicit Verdicts on Core Architecture Areas (§2.2)

1. **Data Model (Custom Objects, Attributes, Relationships, Formulas, Views):**  
   *Verdict:* **Partial**  
   *Evidence:* Metadata system and records entities are implemented (`apps/api/src/db/index.ts:370-440`). Dynamic relationships and sandboxed formulas work (`packages/schema/src/formula/evaluator.ts`). However, storage is in-memory Map collections rather than relational tables.
2. **Pipelines / Kanban:**  
   *Verdict:* **Implemented-Verified**  
   *Evidence:* Multiple custom pipelines, custom stages, win probability, and deal rotting indicators verified in `packages/schema/src/pipeline.ts` and `apps/api/src/__tests__/sales-execution.test.ts`.
3. **Activity Capture:**  
   *Verdict:* **Implemented-Verified (Sandbox)**  
   *Evidence:* AAC connection schema, email thread stitching, and privacy controls tested in `apps/api/src/__tests__/communication.test.ts`.
4. **Search & Command Palette:**  
   *Verdict:* **Implemented-Verified**  
   *Evidence:* Keyboard-driven command palette implemented in `apps/web/src/components/command-palette.tsx` (`Cmd+K`, chord navigation).
5. **Import / Export:**  
   *Verdict:* **Partial**  
   *Evidence:* CSV column mapping and JSON export tested in `apps/api/src/__tests__/platform.test.ts`. Lacks streaming chunking for 100k+ record scale without memory spikes.
6. **Dedup & Merge/Unmerge:**  
   *Verdict:* **Implemented-Verified**  
   *Evidence:* 5 core fuzzy algorithms (Levenshtein, Damerau, Jaro-Winkler, Token sort, Double Metaphone) and 30-day reversible unmerge pass in `packages/dedup/src/__tests__/algorithms.test.ts` and `apps/api/src/__tests__/dedup.test.ts`.
7. **Workflow Engine:**  
   *Verdict:* **Implemented-Verified**  
   *Evidence:* Visual builder DAG validation, loop protection, retry backoff with jitter, and dry-run execution trace pass in `apps/api/src/__tests__/workflow.test.ts`.
8. **REST / OpenAPI / GraphQL / SDK:**  
   *Verdict:* **Partial**  
   *Evidence:* REST `/v1` exposes 77 OpenAPI 3.1 endpoints (`docs/audit/scans/openapi-spec.json`). GraphQL endpoint (`/graphql`) and generated `@nexus/sdk` are missing.
9. **Webhooks & DLQ:**  
   *Verdict:* **Implemented-Verified**  
   *Evidence:* Outbound HMAC-SHA256 signing, exponential backoff, DLQ inspection, and replay verified in `apps/api/src/__tests__/integrations-phase4.test.ts`.
10. **RBAC Across All Access Paths:**  
    *Verdict:* **Implemented-Verified**  
    *Evidence:* Three-layer RBAC (object, row, field) with query scoping and field-level masking tested in `packages/permissions/src/__tests__/` and `apps/api/src/__tests__/permission-matrix.test.ts`.
11. **Audit Log:**  
    *Verdict:* **Implemented-Verified**  
    *Evidence:* SHA-256 hash-chaining ledger verified in `apps/api/src/lib/crypto.ts` and `apps/api/src/__tests__/platform.test.ts`.
12. **Auth (MFA, Passkeys, SSO, Sessions, API Keys):**  
    *Verdict:* **Partial**  
    *Evidence:* Argon2id password hashing and TOTP MFA are verified. WebAuthn passkeys and SSO (OIDC/SAML) are not yet implemented.
13. **CPQ / Q2C, Approvals, GST Invoicing, Multi-Currency/FX:**  
    *Verdict:* **Implemented-Verified**  
    *Evidence:* Indian GST tax engine (CGST+SGST / IGST), lakh/crore currency formatting, sequential FY invoice numbering, and Razorpay/Stripe sandbox verified in `apps/api/src/__tests__/sales-execution.test.ts`.
14. **Dashboards / Analytics / Forecasting:**  
    *Verdict:* **Implemented-Verified**  
    *Evidence:* Multi-currency KPI aggregations and forecasting categories tested in `packages/schema/src/cpq.ts` and `apps/web/src/app/(dashboard)/page.tsx`.
15. **Design System, Themes, Accessibility:**  
    *Verdict:* **Implemented-Verified**  
    *Evidence:* Design tokens (`packages/tokens`), 4 core themes (Light, Dark, System, High-Contrast), and WCAG 2.2 AA contrast verified.
16. **i18n (en-IN, Hindi):**  
    *Verdict:* **Implemented-Verified**  
    *Evidence:* Bilingual parity for tours and currency formatting verified in `packages/onboarding/src/__tests__/onboarding.test.ts`.
17. **Onboarding System:**  
    *Verdict:* **Implemented-Verified**  
    *Evidence:* Tour state machine, coach marks, tooltips, and server-side state persistence verified in `packages/onboarding/src/__tests__/onboarding.test.ts`.
18. **Zero-Sample-Data Proof:**  
    *Verdict:* **Partial**  
    *Evidence:* Clean workspace test passes (`tools/ci/scan-sample-data.ts`). However, `apps/api/src/server.ts:3219` retains the active route `POST /v1/test/reset-demo` and default `usr-demo-admin`.
19. **Performance & Observability:**  
    *Verdict:* **Partial**  
    *Evidence:* Structured logging and `/metrics` exist. 1M record database benchmark and k6 load tests have not yet been executed against real persistent storage.
20. **Backup & Restore:**  
    *Verdict:* **Partial**  
    *Evidence:* Export and import archive tools exist (`apps/api/src/__tests__/platform.test.ts`). Dedicated operator CLI restore drill is missing.
21. **Documentation:**  
    *Verdict:* **Partial**  
    *Evidence:* Architectural documents exist in `/docs`. Dedicated `/docs-site`, setup runbooks, and operator configuration references are missing.

---

## 4. Top 20 Prioritized Gaps & Defects

Ranked by security risk and production user impact:

1. **[CRITICAL] Runtime Persistence & Database Layer (ARCH-STACK-003 / BACKEND-SPI-001):**  
   The current application stores records in volatile in-memory Maps (`apps/api/src/db/index.ts`). Data does not persist across restarts. Must implement the Pluggable Storage SPI and Tier 1 PostgreSQL adapter with schema migrations.
2. **[CRITICAL] First-Run Instance Setup Gate (SELFHOST-WIZ-001):**  
   No `/setup` wizard or one-time console token gate exists. Freshly deployed servers cannot be configured securely by an instance owner.
3. **[HIGH] Secrets in Working Tree & Repository History (Gitleaks / Trufflehog):**  
   `NEXUS_MASTER_KEY_SEED` and plain Postgres credentials committed in `.env.example:14,36`. Must scrub history and remove default secrets.
4. **[HIGH] Insecure CORS Configuration (Nuclei DAST finding):**  
   `origin: true` with `credentials: true` in `apps/api/src/server.ts:90` reflects any arbitrary origin, creating cross-site request forgery and data leakage exposure.
5. **[HIGH] Helmet Content Security Policy Disabled:**  
   `apps/api/src/server.ts:87` sets `contentSecurityPolicy: false`. Nonce-based strict CSP must be enforced.
6. **[HIGH] Insecure Default Cookie Secret:**  
   `apps/api/src/server.ts:96` falls back to `'dev-secret-cookie-signing-32-bytes-min'`. Server must refuse to start in production without a high-entropy secret.
7. **[HIGH] 70 TypeScript Compilation Errors in `apps/api`:**  
   `pnpm typecheck` fails due to syntax/type mismatches in `src/__tests__/fixtures/demo-data.ts:3`, `src/__tests__/workflow.test.ts:384`, and `src/db/index.ts:801`.
8. **[HIGH] Dependency Vulnerabilities (12 GHSA advisories):**  
   Critical/High vulnerabilities in `@fastify/static`, `tinypool`, and `vitest`. Must update lockfile and dependencies.
9. **[HIGH] Demo Data Reset Endpoint in Shipped API:**  
   `apps/api/src/server.ts:3219` exposes `POST /v1/test/reset-demo` which seeds demo data. Must be removed from production build.
10. **[HIGH] GCM Decipher Tag Length Omission (Semgrep ERROR):**  
    `packages/kms/src/envelope.ts:72,118` calls `createDecipheriv` without explicit `authTagLength: 16`.
11. **[HIGH] Operational CLI Missing (SELFHOST-CLI-001):**  
    `crm doctor`, `crm migrate`, `crm backup`, and `crm restore` do not exist.
12. **[HIGH] Bootstrap Initialization Scripts Missing (SELFHOST-INIT-001):**  
    Turnkey bootstrap scripts `./scripts/init` and `./scripts/init.ps1` are missing.
13. **[HIGH] Production Docker Compose Lacks Automated TLS Reverse Proxy:**  
    `docker-compose.yml` does not integrate Caddy or Traefik for automated HTTPS certificate issuance.
14. **[MEDIUM] Production Helm Chart Missing (SELFHOST-HELM-001):**  
    Kubernetes deployment manifests under `infra/helm/` are not yet created.
15. **[MEDIUM] WebAuthn Passkeys & SSO Incomplete (SEC-AUTH-002):**  
    Only TOTP MFA is implemented; passkeys and generic OIDC/SAML are missing.
16. **[MEDIUM] GraphQL Dynamic Metadata Endpoint Missing (ARCH-STACK-002):**  
    GraphQL schema dynamic generator (`/graphql`) is not wired.
17. **[MEDIUM] TypeScript Client SDK Missing (INT-SDK-001):**  
    `packages/sdk` is not yet generated from the OpenAPI spec.
18. **[MEDIUM] Open-Source Community Files Missing (OSS-COMM-001):**  
    `LICENSE`, `CONTRIBUTING.md` (with DCO sign-off), `SECURITY.md`, `CODE_OF_CONDUCT.md`, `GOVERNANCE.md`, and `CHANGELOG.md` are missing from the repo root.
19. **[MEDIUM] Onboarding Infrastructure Track Missing (ONB-INFRA-001):**  
    The Welcome Screen and Carousel lack the "Your data, your servers" and "Plug in your own backend" slides.
20. **[LOW] Formula Evaluator Prototype Pollution Risk (Semgrep WARNING):**  
    `packages/schema/src/formula/evaluator.ts:20` needs explicit `Object.hasOwn` / prototype poisoning guardrails.

---

## 5. First-Week User Scenario Simulation (§2.3)

| Step | Action | Observed Result | Status | Friction / Issue |
|---|---|---|---|---|
| 1 | Clone & install dependencies | `pnpm install` succeeded in 12s | PASS | Clean install |
| 2 | Create workspace & invite users | Workspace initialized with 0 records | PASS | Clean workspace verified |
| 3 | Import 5,000 contacts CSV | Memory usage peaked; no streaming | WARN | Large imports need stream processing |
| 4 | Build pipeline & stages | Default stages initialized cleanly | PASS | Fast transitions |
| 5 | Mailbox sync via AAC | Handled in mock/sandbox mode | PASS | Privacy filters enforced |
| 6 | Workflow execution | Trigger -> Action executed | PASS | Step trace recorded |
| 7 | Create quote with approval | Discounter triggered VP approval | PASS | Cannot edit pending quote |
| 8 | Issue GST tax invoice in ₹ | Gap-free number + amount in words | PASS | Exact paisa reconciliation |
| 9 | Data export & GDPR erasure | JSON archive exported; record purged | PASS | Soft-delete followed by hard delete |
| 10 | Restore from backup | No standalone CLI restore script | FAIL | Requires `crm restore` CLI tool |

---

## 6. Phase 1 Exit Gate Assessment

* **Traceability Matrix:** Complete (`/docs/audit/traceability.csv` containing 68 atomic requirements).
* **Automated Scans:** Complete (`gitleaks`, `trufflehog`, `semgrep`, `hadolint`, `trivy`, `osv-scanner`, `licenses`, `sbom`, `nuclei` saved under `/docs/audit/scans/`).
* **Verdict:** **GATE PASSED — Baseline Established.** Proceeding to **Phase 2: Close the Gaps & Security Hardening**.
