# THIRD MASTER PROMPT — Full Audit → Security Audit → Self-Hosting → Pluggable Backends → Onboarding Integration → Open-Source Release Readiness

> Paste everything below the line into Antigravity (Gemini) in the CRM repo. Save it as `/docs/RELEASE_BRIEF.md`.
> It builds on `/docs/MASTER_BRIEF.md` (product, security, design system, INR-first) and `/docs/ONBOARDING_AND_MARKETING_BRIEF.md` (onboarding, zero sample data). Where briefs conflict, the **stricter / safer** rule wins.
> Tip: in Antigravity's agent manager you can run the audit tracks (functional QA, security, DevOps, docs) as parallel agents, then merge their reports. A single agent working sequentially is also fine.

---

## 0. MISSION, ROLE AND GROUND RULES

**Mission:** Turn this project into a **complete, secure, self-hostable, open-source CRM** that anyone in the world can clone, configure and run on their own server or private network — with a **pluggable storage-backend system** and a first-run experience (including the **App Onboarding Walkthrough / Onboarding Carousel**) that guides them through it.

You act as a combined **QA lead, application-security engineer, DevOps/SRE, technical writer and open-source maintainer**. Rules:

1. **Evidence over claims.** Nothing is "done" unless you can point to proof: a passing test, a file path, a command output, or a screenshot. Never write "implemented" from memory or from reading a plan. Run it.
2. **Honest reporting.** Report gaps, partial work and failures plainly. A "No-Go" verdict with a clear fix list is more valuable than a false "Go". Do not claim certifications (SOC 2, GDPR, PCI, GST, ISO) — only "readiness" and what was actually tested.
3. **Plan first, then execute.** Produce one Implementation Plan artifact covering all phases (§1). Wait for my approval. Then proceed phase by phase, reporting at each gate.
4. **Fix, don't just list.** For each defect or gap: fix it, add a regression test, re-run, and record it in the report. Anything you can't fix goes to `/docs/KNOWN_ISSUES.md` with severity and workaround.
5. **Never weaken security to make something work.** If a feature conflicts with a security rule, stop and ask me.
6. **Ask me only these 4 things at the very start (one message), then proceed:**
   (a) **Open-source licence** — present these options with one-line trade-offs and your recommendation: _Apache-2.0_ (permissive + explicit patent grant), _MIT_ (simplest permissive), _AGPL-3.0_ (copyleft: anyone running a modified version as a network service must publish their changes — protects against closed-source hosted forks). Note that you are not giving legal advice.
   (b) **Project name** (and check it for obvious trademark/name collisions with well-known CRM products and npm/GitHub name availability — report, don't decide).
   (c) **Copyright holder name** and **public security-contact email** (for `LICENSE`, `SECURITY.md`; don't reuse any private email found in the repo).
   (d) **GitHub org/repo URL** to put in docs and badges.
7. **Record decisions** in `/docs/DECISIONS.md` (ADR style).
8. Keep honoring: design tokens only, INR-first + no hard-coded currency, WCAG 2.2 AA, i18n (English-India, Hindi), zero sample data in the shipped app.

---

## 1. PHASES AND GATES (strict order)

| #   | Phase                                                                                                                             | Output                                                                                                        | Gate                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | **Baseline audit** — functional traceability + automated security scans (no fixes yet)                                            | `/docs/AUDIT_BASELINE.md`, `/docs/audit/traceability.csv`, scan reports                                       | Every requirement has a status and evidence             |
| 2   | **Close the gaps** — implement missing/partial items, fix defects and vulnerabilities                                             | Code + tests                                                                                                  | All Critical/High items fixed; remaining are documented |
| 3   | **Self-hosting packaging** — run it on your own server/LAN/cloud                                                                  | Docker/Compose/Helm/bare-metal docs, setup wizard, `doctor` CLI, backup/restore                               | Fresh-machine install test passes                       |
| 4   | **Pluggable backend system** — choose/connect storage backends dynamically and safely                                             | Adapter SPI, first-party adapters, connection manager UI, migration tool, contract tests                      | Adapter conformance suites pass                         |
| 5   | **Onboarding integration** — put infrastructure/backends into the Welcome → Carousel → Tour → Interactive Walkthrough → Checklist | Updated onboarding + tests                                                                                    | Fresh-user E2E passes                                   |
| 6   | **Open-source packaging** — licence, community files, docs site, CI/CD, releases                                                  | Repo ready for public                                                                                         | OSS checklist 100%                                      |
| 7   | **Final re-audit & verdict** — repeat functional + security audit on the final code                                               | `/docs/AUDIT_FINAL.md`, `/docs/SECURITY_AUDIT.md`, `/docs/RELEASE_READINESS.md` (Go / Conditional-Go / No-Go) | Evidence-backed verdict                                 |

---

## 2. PHASE 1 — BASELINE AUDIT: "HAS EVERYTHING WE PLANNED ACTUALLY BEEN BUILT?"

### 2.1 Requirements traceability matrix

1. Parse **every requirement** from `/docs/MASTER_BRIEF.md` (§1–§17, including §4.7 currency/India compliance and §15 phase gates) and `/docs/ONBOARDING_AND_MARKETING_BRIEF.md` (§1–§6). Break them into atomic, testable requirements with IDs (e.g. `SEC-RBAC-003`, `CPQ-APPR-002`, `ONB-TOUR-004`).
2. For each, record in `/docs/audit/traceability.csv`: `id, source section, requirement, status, evidence (file/line, test name, screenshot), gaps, severity, owner-phase`.
3. **Status values:** `Implemented-Verified` (works, tested) · `Implemented-Unverified` (code exists, no proof) · `Partial` · `Missing` · `Deferred-Documented` · `Not-Applicable`.
4. **Verify by running, not reading:** start the app from a clean clone using only the README; click through every golden path in master brief §12 in the browser (desktop 1440, tablet 820, mobile 390; light/dark/high-contrast; en-IN and Hindi); run every automated suite; run the 1M-record benchmark and k6 load test and compare to the budgets in master brief §13.
5. Produce a **summary table** (counts per status per module) and a **top-20 gaps** list ranked by user impact and risk.

### 2.2 Areas that must each get an explicit verdict

Data model (custom objects, attributes, relationships, formulas, views, schema versioning) · Pipelines/Kanban · Activity capture · Search & command palette · Import/export · Dedup & merge/unmerge · Workflow engine (durability, loop protection, versioning, dry-run) · REST/OpenAPI/GraphQL/SDK · Webhooks (HMAC, idempotency, backoff+jitter, DLQ, replay) · RBAC at object/row/field level **across every access path** (UI, REST, GraphQL, search, export, webhooks, dashboards) · Audit log (hash-chain, insert-only) · Auth (MFA, passkeys, SSO, sessions, API keys) · CPQ/Q2C, approvals, GST invoicing, multi-currency/FX, payments adapters · Dashboards/analytics/forecasting · Design system, themes, accessibility · i18n (en-IN, Hi) · Onboarding system · **Zero-sample-data proof** · Performance · Observability · Backup/restore · Documentation.

### 2.3 Completeness checks beyond the briefs ("what's a real user going to hit?")

Run a "first-week user" scenario script: install → create workspace → invite 3 users with different roles → import 5,000 contacts from CSV → build a pipeline → send/receive an email through the connected mailbox (use a test mailbox/Mailpit) → run a workflow → create a quote that needs approval → issue a GST invoice in ₹ → export data → delete a user (GDPR erasure) → restore from backup. Log every moment of friction, error, dead end, missing empty state, broken link, console error, 4xx/5xx, unhandled promise rejection, or untranslated string. Each becomes an issue in the matrix.

### 2.4 Baseline automated scans (record results; fixes come in Phase 2)

Run and save raw output under `/docs/audit/scans/`:

- **Static analysis:** Semgrep (OWASP/TypeScript/Node rulesets), CodeQL (if repo on GitHub) or equivalent, ESLint security plugins, `tsc --noEmit`.
- **Dependencies:** `pnpm audit`, **OSV-Scanner**, `npm-check-updates` report; flag unmaintained/abandoned packages.
- **Secrets:** **gitleaks** and **trufflehog** on the working tree **and full git history** (and any built artifacts, screenshots, docs, `.env*`, CI files).
- **Containers/IaC:** **Trivy** (images + filesystem + misconfig) and Hadolint on Dockerfiles; kube-linter/Checkov on manifests/Helm.
- **DAST:** **OWASP ZAP** baseline + API scan against a running instance using the OpenAPI spec; **Nuclei** basic templates (against local instance only).
- **Licences:** full dependency licence inventory (see §7.3).
- **SBOM:** CycloneDX (`cyclonedx-npm` or Syft) for the repo and each image.

---

## 3. PHASE 2 — CLOSE THE GAPS (complete and full-fledged)

1. Implement every `Missing` and `Partial` item and verify every `Implemented-Unverified` item (write the missing tests). Prioritise: security → data integrity → core workflows → polish.
2. Fix all baseline findings: **Critical and High must be fixed**; Medium fixed or explicitly accepted with justification in `/docs/KNOWN_ISSUES.md`; Low triaged.
3. **Dedicated security audit (manual + automated), covering at minimum:**
   - **AuthN/AuthZ:** attempt IDOR on every `:id` route, cross-tenant access (tenant A token → tenant B ids), role escalation, horizontal escalation, missing function-level checks, **field-level leakage** via GraphQL introspection/aliasing/batching, search, CSV export, webhook payloads, dashboards/aggregates, audit-log views, error messages, timing differences. Verify Postgres RLS blocks cross-tenant reads even when app-layer checks are deliberately bypassed in a test.
   - **Session & token handling:** cookie flags (`Secure`, `HttpOnly`, `SameSite`), refresh-token rotation and reuse detection, logout/revocation, MFA bypass attempts, password-reset poisoning, account enumeration, brute-force/lockout, OAuth state/PKCE/redirect-URI validation, SSO assertion validation, API-key scoping and hashing.
   - **Injection & input handling:** SQL injection (incl. dynamic custom-object filters and JSONB paths), NoSQL-style operator injection in filters, GraphQL query abuse (depth, complexity, alias bombing, batching), formula-engine sandbox escape, template/merge-field injection, stored/reflected **XSS** (rich text, custom field labels, import data, filenames), CSV/Excel **formula injection** in exports, SSTI in PDF/email templates, **path traversal**, zip-slip, XXE, deserialisation, prototype pollution, open redirects, HTTP request smuggling via proxy config.
   - **SSRF & outbound:** webhooks, URL fields, import-from-URL, OAuth callbacks, **the new backend connection tests (§5)** — block private/link-local/metadata ranges _unless_ `DEPLOYMENT_MODE=self_hosted` explicitly allows private networks; DNS-rebinding-safe resolution; redirect limits; response-size and time limits.
   - **File handling:** type sniffing, size caps, AV hook, stored-file access control (signed URLs, no public buckets by default), PDF generation sandboxing (headless Chromium must run without network access to internal services, with no file:// access).
   - **Business-logic abuse:** discount/approval bypass (client-side tampering, race conditions, double-submit), invoice number gaps/duplication under concurrency, FX-rate tampering, negative amounts, rounding exploits, replayed webhooks, double payment capture, idempotency-key misuse, workflow infinite loops / resource exhaustion, mass assignment, bulk-endpoint abuse, **rate-limit bypass** (header spoofing, `X-Forwarded-For` trust).
   - **Transport & headers:** TLS config, HSTS, CSP (nonce-based, no `unsafe-inline`), CORS allow-list, clickjacking (`frame-ancestors`), `Referrer-Policy`, `Permissions-Policy`, cache-control on sensitive responses, no sensitive data in URLs/logs.
   - **Secrets & crypto:** no secrets in repo/images/logs/screenshots; envelope encryption working and key rotation tested; Argon2id parameters; constant-time comparisons for HMAC/tokens; CSPRNG only for tokens; webhook secret rotation overlap.
   - **Availability:** request size limits, pagination caps, slow-query protection, queue back-pressure, graceful degradation when Redis/DB/email is down, no unbounded memory in import/export, zip-bomb/CSV-bomb protection.
   - **Supply chain:** pinned versions + lockfile integrity, `pnpm` `--frozen-lockfile` in CI, provenance (npm provenance / Sigstore for images), no `postinstall` scripts from untrusted packages, GitHub Actions pinned by SHA and least-privilege `GITHUB_TOKEN`, Dependabot/Renovate configured.
4. **Every finding** goes in `/docs/SECURITY_AUDIT.md` using this record: `ID · title · severity (Critical/High/Medium/Low/Info, with CVSS 3.1 vector) · affected component · how found · proof-of-concept (safe, local only) · impact · fix · regression test · status`. Map coverage to **OWASP ASVS Level 2**, **OWASP API Security Top 10 (2023)** and **OWASP Top 10** with a coverage table showing tested / not-applicable / gap.
5. Update `/docs/THREAT_MODEL.md` (STRIDE) with the new attack surface introduced by self-hosting, pluggable backends, the setup wizard and plugins/adapters (§4–§5).
6. Write a security **test suite that stays in CI** (authz matrix, SSRF, injection corpus, rate-limit, headers) so these never regress.

---

## 4. PHASE 3 — SELF-HOSTING: ANYONE CAN RUN IT ON THEIR OWN SERVER OR NETWORK

Goal: a stranger with a Linux/macOS/Windows machine (or a cloud VM, Kubernetes cluster, or an offline office LAN) can go from `git clone` to a working, secure instance **in under 15 minutes** by following the README only.

### 4.1 Deployment options (all documented and tested)

1. **Quick start (single machine):** `docker compose up -d` using a **production-grade default** compose file (app, worker, Postgres, Redis, object storage, reverse proxy with automatic HTTPS via Caddy or Traefik, optional Mailpit for dev). A **dev** compose file separate from the **prod** one.
2. **One-command bootstrap:** `./scripts/init` (and `.\scripts\init.ps1` for Windows) which: checks prerequisites (Docker version, ports, RAM/disk), **generates all secrets** (DB passwords, JWT/session keys, encryption master key, webhook signing key) with a CSPRNG into a `chmod 600` `.env`, never printing them to shared logs, and explains how to back the master key up. **No default or shared credentials anywhere in the repo.**
3. **Kubernetes:** a **Helm chart** (values documented, `securityContext` hardened, resource requests/limits, PodDisruptionBudget, NetworkPolicy, readiness/liveness probes, external-DB and external-Redis options, Ingress + cert-manager example).
4. **Bare-metal / VM without Docker:** systemd unit files + nginx/Caddy examples + Node/pnpm build instructions.
5. **Air-gapped / private LAN mode:** works with **no internet access** — no CDN fonts/scripts/icons, no external calls at runtime, no telemetry (**telemetry is OFF by default and, if offered, strictly opt-in, documented and anonymous**), offline docs bundled, internal CA support, local SMTP. Prove it by running the app with outbound network blocked and recording what, if anything, fails.
6. **Platforms:** multi-arch images (**linux/amd64 and linux/arm64**) so it runs on Raspberry Pi 5 / Apple Silicon / cloud ARM.
7. **Cloud one-click guides:** AWS/GCP/Azure/DigitalOcean/Hetzner/Render/Railway-style docs (guides only; don't claim partnership).

### 4.2 First-run Setup Wizard (instance-level, before any user exists)

- Route `/setup` is **only available while the instance is uninitialised** and requires a **one-time setup token** printed to the server console/CLI (and stored hashed) — so a random visitor who finds a freshly exposed server **cannot hijack it**. The token expires (e.g. 1 hour) and is invalidated after use; `/setup` returns 404 afterwards.
- Steps: (1) language & region (default India/₹/IST, all changeable) → (2) **create the instance owner** (strong-password policy + enforce MFA enrolment) → (3) **storage backends** (see §5; default = bundled Postgres) → (4) email/SMTP (with test send) → (5) public URL & TLS check → (6) backup target & schedule → (7) review & finish → launches the in-app **onboarding** (§6).
- Every step validates, shows clear errors, is resumable, and is accessible/i18n'd like the rest of the app. Setup actions are written to the audit log.

### 4.3 Operational tooling (CLI: `crm` or `pnpm crm …`)

- `crm doctor` — **self-check**: config validity; secrets strength/placeholder detection; DB/Redis/object-store/SMTP connectivity; migration status; clock skew; TLS & HSTS; insecure settings (HTTP in prod, wide-open CORS, debug mode, default ports exposed, running as root); disk space; backup age; outdated version; prints PASS/WARN/FAIL with fixes.
- `crm migrate`, `crm backup`, `crm restore`, `crm user:create-admin`, `crm secrets:rotate`, `crm config:validate`, `crm adapters:list`, `crm backend:migrate` (§5.6), `crm export`/`crm gdpr:erase`.
- **Backups:** scheduled encrypted backups (DB + object storage + config), retention policy, **tested restore on a clean machine** (include a restore-drill script and prove it in CI), documented RPO/RTO guidance.
- **Upgrades:** semantic versioning, forward-only migrations with an **expand → migrate → contract** pattern, `crm upgrade --check` (shows pending migrations and breaking changes), automatic pre-upgrade backup prompt, documented rollback.
- **Config:** one validated schema (Zod) for env/config file with clear errors; `.env.example` complete and commented; no config that silently falls back to insecure defaults — the app **refuses to start in production mode** with weak/missing secrets or `NODE_ENV` misconfiguration.
- **Observability for operators:** `/healthz` & `/readyz`, Prometheus `/metrics` (auth-protected), structured logs, optional OpenTelemetry export, an admin **System Status** page (versions, queue depth, failed jobs, DLQ size, storage usage, backup status, adapter health).
- **Container hardening:** minimal/distroless base, **non-root user**, read-only root filesystem, dropped Linux capabilities, `no-new-privileges`, pinned base image digests, healthchecks, no dev dependencies in the prod image, image scanned in CI, signed with cosign, SBOM attached.
- **Reverse-proxy correctness:** configurable `TRUSTED_PROXIES` (never blindly trust `X-Forwarded-*`), WebSocket/SSE pass-through, large-upload limits, example configs for Caddy, nginx, Traefik, Apache, and Cloudflare Tunnel/Tailscale for private access without opening ports.
- **Sizing doc:** minimum and recommended CPU/RAM/disk for 5 / 50 / 500 users, based on your **actual load-test results**, not guesses.

---

## 5. PHASE 4 — DYNAMIC, PLUGGABLE BACKENDS ("connect it to any back-end")

### 5.1 Reality check and design decision (write this ADR first)

A literal "any back-end software" is not technically honest for a CRM that depends on relational integrity, transactions, tenant isolation and fast joins. The achievable, professional design is:

> **A stable _Storage Adapter SPI_ (service-provider interface) + a set of first-party adapters + a conformance test-suite + a documented path to write community adapters + a generic HTTP gateway for everything else.**

Each adapter declares **capability flags** (e.g. `transactions`, `rowLevelSecurity`, `jsonIndexing`, `fullTextSearch`, `skipLockedQueues`, `advisoryLocks`). The app **gracefully degrades** where a capability is absent and **shows the admin exactly what is and isn't active** on the System Status page. **Authorization is always enforced in the application layer on every adapter** (permissions library from the master brief); Postgres RLS is an _additional_ defence-in-depth layer where available — never the only one. Document the support tiers honestly:

| Tier                                  | Meaning                                                                                   | Examples                                                                                           |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Tier 1 — Fully supported**          | Passes the complete conformance + security suites, used in CI, recommended for production | **PostgreSQL 14+** (incl. managed: RDS/Aurora, Cloud SQL, Azure Postgres, Supabase, Neon, Crunchy) |
| **Tier 2 — Supported**                | Passes conformance suite; documented capability gaps (e.g. no RLS, weaker fuzzy search)   | **MySQL 8 / MariaDB 10.6+**, **SQLite** (single-node / small team / evaluation)                    |
| **Tier 3 — Community / experimental** | Implemented against the SPI by others; not guaranteed                                     | MS SQL Server, CockroachDB, others; **HTTP Storage Gateway**                                       |

### 5.2 Adapter families (each with an interface, a default, and ≥1 alternative)

1. **`DatabaseAdapter`** (primary store): PostgreSQL (default, Tier 1), MySQL/MariaDB, SQLite. Use a dialect-aware query builder (Kysely/Drizzle) behind a repository layer; **no raw SQL outside adapter packages**. Where Postgres-only features are used (`pg_trgm`, JSONB GIN, RLS, `SKIP LOCKED`), provide adapter-specific implementations or fallbacks (e.g. in-process fuzzy search from `packages/dedup`, generated JSON columns on MySQL/SQLite) and test them.
2. **`ObjectStorageAdapter`** (files, PDFs, exports, backups): local filesystem (default for single node), **any S3-compatible** store (AWS S3, MinIO, Cloudflare R2, Backblaze B2, Wasabi, DigitalOcean Spaces, Ceph), Google Cloud Storage, Azure Blob. Signed, expiring URLs; private by default; server-side encryption options.
3. **`QueueCacheAdapter`** (jobs, rate-limit counters, pub/sub, sessions cache): **Redis-compatible** (Redis, Valkey, KeyDB, Dragonfly) **and a no-Redis database-backed queue mode** so tiny installs need only one dependency.
4. **`SearchAdapter`**: database-native (default), Meilisearch, OpenSearch/Elasticsearch. Index payloads must respect field-level permissions.
5. **`EmailAdapter`**: SMTP (default), Amazon SES, SendGrid, Resend, Mailgun, Postmark.
6. **`SecretsProvider`**: environment/`.env`, files & Docker/K8s secrets, HashiCorp Vault, AWS/GCP/Azure secret managers.
7. **`AuthProvider` extensions**: generic OIDC/SAML + presets (Google, Microsoft, Okta, Keycloak, Authentik, Azure AD) so self-hosters can plug in their own identity provider; LDAP/AD optional (Tier 3).
8. **`HTTP Storage Gateway` (experimental, Tier 3):** a published **OpenAPI contract** ("Persistence over HTTP") so anyone can write a small bridge service to a store we don't ship an adapter for. Include a reference implementation and clear performance/consistency caveats. Mutual-TLS or signed-request auth required.

### 5.3 Adapter plugin system (secure by design)

- Adapters are **packages installed by the server operator** (e.g. `pnpm add @yourorg/adapter-mysql` or placed in a mounted `/plugins` volume), discovered via a manifest (`name, version, kind, capabilities, configSchema (JSON Schema), minCoreVersion, integrity hash`).
- **Never load or execute code uploaded through the web UI.** The UI can only _select and configure_ adapters that the operator already installed. This prevents the UI from becoming a remote-code-execution path.
- Third-party adapters: integrity/lockfile check, optional signature verification (Sigstore/cosign), run with the same least privileges as the app, **explicit warning in docs and in `crm adapters:list`** that third-party adapters run with full app privileges and must be reviewed.
- **Versioned SPI** with a compatibility policy; breaking changes only in major versions; an **adapter authoring guide** + template repo + `@yourorg/adapter-testkit` that runs the conformance suite.

### 5.4 Conformance & security suites (must pass for Tier 1/2)

- **Functional contract tests** for each adapter kind (CRUD, transactions/rollback, concurrency/optimistic locking, pagination, JSON/custom-attribute filtering and indexing, soft delete, outbox ordering, queue at-least-once & retries, large-file upload/download, signed URL expiry).
- **Security contract tests that run on every adapter:** tenant isolation, object/row/field permission enforcement (the **same permission test matrix**), audit-log append-only behaviour (or documented compensating control if the store can't enforce it), no SQL/filter injection via custom attributes, encrypted-at-rest field handling.
- Run the **full app E2E suite against each Tier 1/2 combination** in CI (matrix: Postgres / MySQL / SQLite × Redis / DB-queue × local-FS / S3-compatible via MinIO).
- Benchmarks per adapter published in docs (the 1M-record test where the adapter supports it, with honest limits per tier).

### 5.5 Backend Connection Manager (UI + CLI) — dynamic connection from the app

Located in **Settings → Infrastructure (Instance Admin only)** and in the Setup Wizard.

- **Pick** an adapter per family from the list of installed adapters; the form is **generated from the adapter's JSON-Schema config** (host, port, database, user, password/secret reference, TLS mode, CA certificate, pool size, region, bucket, endpoint, etc.), with inline validation and help text.
- **Secret handling:** passwords/keys are accepted once, **encrypted at rest** (envelope encryption), masked in the UI and API (`••••`), **never logged, never in audit-log values, never in error messages or screenshots**; prefer **secret references** (`env:DB_PASSWORD`, `file:/run/secrets/db`, `vault:path#key`) over pasted values; connection strings are parsed into fields so they can be masked.
- **Bootstrap rule:** the connection settings for the _primary database_ can't live in the database they configure. Store bootstrap config in environment/`config/instance.json` (encrypted values / secret refs) and document it; the UI edits that file through a guarded server-side write.
- **"Test connection" (safe, read-only probe):** checks DNS/TCP reachability, TLS (verify-full by default; show cert chain/expiry; warn on `sslmode=disable` or self-signed unless explicitly acknowledged), authentication, server version compatibility, required privileges/extensions (reports exactly what's missing and the SQL/steps to grant it), latency, and runs a **write/rollback probe in a throw-away schema/prefix**. Never touches production data. Rate-limited, timeout-bounded, audit-logged.
- **Network safety:** private/loopback ranges are **allowed only when `DEPLOYMENT_MODE=self_hosted`** (the normal case for a LAN/own server); in `managed` multi-tenant hosting they are blocked (SSRF). Show a plain-language banner explaining which mode is active and what it permits.
- **Least-privilege guidance:** generate copy-paste SQL/IAM policy for a **runtime role** (no DDL, no superuser) and a separate **migration role**; warn if the supplied user is a superuser/owner/root.
- **Safe changes, never a blind swap:**
  1. Connecting a **new empty** backend → run migrations (dry-run preview first) → switch.
  2. Switching an instance **that already has data** = use `crm backend:migrate` / the "Migrate data" wizard: automatic backup → maintenance mode → export/import with **row-count + checksum verification per table**, schema-version check, resumable, rollback plan, estimated downtime shown upfront, post-migration smoke tests; the old backend stays untouched (read-only) until the admin confirms.
  3. Cross-tier moves (e.g. Postgres → MySQL) show the **capability-diff report** (what degrades) and require explicit confirmation.
- **Step-up auth (MFA re-prompt) + audit-log entry** for any infrastructure change; **instance-admin role is separate from workspace admin** (a workspace admin cannot reach infrastructure settings).
- Health: each adapter reports `ready/degraded/down` + latency to **System Status**, alerts on failure, and the app degrades gracefully (read-only banner if the DB is unreachable, queue retries if Redis is down).

### 5.6 CLI parity

`crm adapters:list`, `crm backend:test --kind database --config ./db.json`, `crm backend:use …`, `crm backend:migrate --from … --to … --verify`, `crm backend:capabilities`. Everything the UI can do is scriptable (infrastructure-as-code friendly) and supports `--dry-run`.

### 5.7 Security checks specific to this phase (add to the security audit)

Credential leakage (logs/errors/audit/UI/network responses), SSRF through connection tests, TLS downgrade/verification bypass, injection through adapter config fields, malicious/third-party adapter risk, bootstrap-config tampering, setup-token brute-force/hijack, privilege separation between instance-admin and workspace-admin, backup files containing PII (encrypted, access-controlled), tenant isolation on each adapter, migration tool race conditions and partial-failure behaviour, denial of service via the "test connection" endpoint.

---

## 6. PHASE 5 — ONBOARDING INTEGRATION (Welcome Screen → Carousel → Product Tour → Interactive Walkthrough → Checklist)

Extend the existing onboarding system (`packages/onboarding`) so new owners/admins are guided through **hosting and backend choices**, without overwhelming non-technical users. Keep all rules from the onboarding brief (accessibility, i18n en-IN + Hindi, tokens, themes, reduced motion, per-user server-side progress, privacy-respecting analytics, lazy loading, role-filtered).

**Two layers, clearly separated:**

- **Instance setup (operator, one-time, §4.2)** — runs before login via the setup token.
- **In-app onboarding (per user, ongoing)** — runs after login; **infrastructure steps are shown only to Instance Admins**; regular users never see them (and tour steps pointing at hidden UI are skipped automatically).

**Add to the flow:**

1. **Welcome Screen:** after workspace basics, an **"Where does your data live?"** step with plain cards — _Bundled database (recommended to start)_, _Connect my own database/storage_, _I'll decide later_ — each with a one-line explanation and a "Learn more". Choosing "connect my own" deep-links to the Connection Manager.
2. **Onboarding Carousel — add 2 slides** (keep total ≤ 8, each with a token-coloured SVG illustration, one headline, one sentence, accessible, swipe/keyboard):
   - **"Your data, your servers"** — self-host on your own machine, network or cloud; open source; no lock-in.
   - **"Plug in your own backend"** — PostgreSQL, MySQL/MariaDB, SQLite; S3-compatible storage; Redis-compatible queues; your SMTP and identity provider.
3. **Product Tour with coach marks & tooltips (Instance Admin track):** Settings → **Infrastructure** → adapters list & capability flags → **Connection Manager** → **System Status** → **Backups** → **Security & Audit**. Tooltips explain tiers (Tier 1/2/3) and capability badges in plain language.
4. **Interactive Walkthrough (learn by doing, safe):** guided steps that auto-advance on real actions: _(a)_ choose a storage adapter; _(b)_ fill the form (with example values in the placeholder text only); _(c)_ **click "Test connection"** (read-only probe) and read the result; _(d)_ **set up a backup schedule**; _(e)_ **run a test restore into a temporary location**; _(f)_ **send a test email**. No step performs a destructive or irreversible action; "Skip" is always available.
5. **Onboarding Checklist — add items (Instance Admin):** _Choose storage backend · Verify connection · Configure email (SMTP) · Enable scheduled backups · Run `crm doctor` / System Status all green · Set up HTTPS/public URL · Enable MFA for all admins · Invite your team._
6. **Help menu & Command palette:** "Infrastructure tour", "Run system check", "Open documentation: Self-hosting", "Adapter guide".
7. **Empty states & errors as onboarding:** connection failures show _what went wrong, why it matters, and the exact next step_ (not raw stack traces), linking to the matching docs page.
8. **Tests:** E2E for the full instance-admin onboarding path (fresh instance → setup token → wizard → carousel → tour → interactive walkthrough → checklist), regular-user path (no infra steps), Hindi run, keyboard-only run, a11y (axe) in all themes, and a security test proving non-instance-admins can't see/trigger infra tour steps or APIs. **Zero sample data** must remain true.
9. Capture updated screenshots of the new onboarding screens (same storage-folder workflow as the onboarding brief — **ask me for the folder again if it isn't set**) and update the LinkedIn carousel assets with the "Self-host & bring your own backend" slides.

---

## 7. PHASE 6 — OPEN-SOURCE PACKAGING AND COMMUNITY READINESS

### 7.1 Repository hygiene

- **History scrub:** if gitleaks/trufflehog find any secret, personal data, private email, internal URL or large binary in history → document it, **rotate the credential**, and (with my approval) rewrite history with `git filter-repo` before publishing. Verify again afterwards. Never publish a repo whose history contains a live secret.
- Remove local/IDE artefacts (`.env`, `.DS_Store`, IDE folders, Antigravity/agent scratch files, build output, node_modules, test artefacts); strong `.gitignore`/`.dockerignore`; **no screenshots or demo files containing real data**; large marketing assets stay out of git (or in Git LFS / a separate repo).
- Consistent naming, remove dead code/TODOs/commented-out code, no references to private services, no hard-coded personal paths or emails.
- Normalise line endings, `.editorconfig`, Prettier, ESLint, commit hooks (lint-staged), Conventional Commits, `CODEOWNERS`.

### 7.2 Required community files (root of repo)

`README.md` (see 7.4) · `LICENSE` (chosen) · `NOTICE`/`THIRD_PARTY_NOTICES.md` (generated from the dependency licence inventory) · `CONTRIBUTING.md` (setup in <10 min, branch/commit conventions, tests required, how to add an adapter/translation/theme, **DCO sign-off** `Signed-off-by` or a CLA — recommend DCO for simplicity) · `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1 with my enforcement contact) · `SECURITY.md` (supported versions, **private vulnerability reporting** via GitHub Security Advisories + my security email, response-time targets, safe-harbour wording, no public disclosure before fix; PGP key optional) · `GOVERNANCE.md` (maintainers, decision process, how to become a maintainer) · `SUPPORT.md` (where to ask questions: Discussions vs Issues) · `CHANGELOG.md` (Keep a Changelog) · `ROADMAP.md` · `.github/` issue forms (bug / feature / question / security-redirect), PR template with checklist (tests, docs, a11y, security impact, adapter conformance), `FUNDING.yml` (optional), `dependabot.yml`/Renovate.

- Add **SPDX licence headers** (or a repo-level `REUSE.toml`) and run the **REUSE** lint.

### 7.3 Licence & compliance audit

- Generate a full dependency licence report (e.g. `license-checker-rseidelsohn`, ScanCode, or `licensee`). **Fail the build** on licences incompatible with the chosen project licence (e.g. GPL/AGPL dependencies in a permissive project, "non-commercial" or "source-available" licences, unknown/unlicensed packages). List any attribution requirements in `THIRD_PARTY_NOTICES.md`.
- **Fonts, icons, illustrations, images and screenshots:** confirm each asset's licence (e.g. OFL fonts, MIT/ISC icon sets), include licence files, and make sure no copyrighted third-party assets, logos or trademarks are bundled. Self-host fonts (no Google Fonts CDN) for privacy and offline use.
- **AI-assisted code:** the code was produced with AI tools. Add a short, honest statement in `CONTRIBUTING.md`/README on AI-assisted development and review practices; run a similarity/licence scan (ScanCode or equivalent) for accidentally copied code blocks; flag anything suspicious for my review. Do not claim legal clearance.
- **Trademark/name check** result from §0.6(b) recorded, and a short **trademark & branding policy** if I choose to protect the name.
- **Export-control / crypto & privacy notes** (the app uses encryption; telemetry off by default; no personal-data collection by the project itself) summarised in `/docs/COMPLIANCE_NOTES.md` — informational, not legal advice.

### 7.4 README (the project's front door)

Clear one-line pitch · screenshot/GIF (real, no sample data; may use the clean empty-state/onboarding shots) · feature list (honest — only what works) · **"Quick start in 3 commands"** · self-host options table (Compose / Helm / bare-metal / air-gapped) · supported backends table with tiers · architecture diagram · security highlights + link to `SECURITY.md` · roadmap · screenshots of themes · badges (CI, licence, version, container image, OpenSSF Scorecard) · contributing & community links · "AI-assisted development" note · support/maintenance expectations (be honest about response times).

### 7.5 Documentation site (VitePress/Docusaurus/Nextra, buildable offline, included in repo `/docs-site`)

Getting started · Self-hosting guides (each deployment option) · **Configuration reference** (every env var, auto-generated from the Zod schema) · **Backends & adapters** (tiers, capability matrix, how to connect each, how to migrate between them, writing your own adapter) · Security hardening guide & checklist · Backup/restore/upgrade runbooks · Admin guide (roles, permissions, data model, workflows, CPQ, GST/multi-currency) · API reference (REST OpenAPI + GraphQL) & SDK · Developer guide (architecture, schema-as-code, testing, design system, adding a theme/translation) · Troubleshooting & FAQ · Changelog. Docs are **tested**: code samples and commands are executed in CI where possible; link checker runs in CI.

### 7.6 CI/CD and releases

- **CI (on every PR):** typecheck, lint, unit, integration (Testcontainers), adapter conformance matrix, E2E (Playwright), a11y (axe), visual regression, security scans (Semgrep, CodeQL, OSV, Trivy, gitleaks), licence check, docs build + link check, `crm doctor` against a freshly installed stack, **fresh-clone install test** (clone → `init` → compose up → healthy → smoke test), restore-drill test.
- **CD (on tag):** semantic-release or Changesets → GitHub Release with notes, **multi-arch images pushed to GHCR/Docker Hub**, **SBOM + provenance attestations + cosign signatures**, Helm chart published, checksums, upgrade notes. Branch protection, required reviews & status checks, signed commits/tags recommended, GitHub Actions pinned by SHA with least-privilege permissions, `OpenSSF Scorecard` workflow.
- **Version 0.x → 1.0 policy** documented (what "stable" means for the SPI, API and DB schema). Recommend starting at `v0.1.0` (public beta) unless every gate passes cleanly.

### 7.7 Community setup

Enable GitHub Discussions, labels (`good first issue`, `help wanted`, `adapter`, `translation`, `security`, `a11y`), a seeded list of ~10 genuine "good first issues" (no fake ones), translation workflow (Weblate/Crowdin or PR-based with instructions), adapter registry page listing community adapters, issue triage guide, release checklist for maintainers.

---

## 8. PHASE 7 — FINAL RE-AUDIT AND RELEASE-READINESS VERDICT

Re-run **everything**: the traceability matrix against the final code, all test suites, all scans (§2.4), the manual security checks (§3.3), fresh-clone installs on **three environments** (Linux server via Compose, a clean Windows/macOS dev machine via the README, and a Kubernetes (kind/k3d) install via Helm), the air-gapped run, backup→restore drill, an **upgrade test from the previous tag**, adapter conformance matrix, load tests, and the full first-run onboarding as a brand-new user (instance admin, then a sales rep).

Deliver three documents:

1. **`/docs/AUDIT_FINAL.md`** — updated traceability summary (before vs after), what was built, what's deferred and why.
2. **`/docs/SECURITY_AUDIT.md`** — all findings with severity/status, ASVS/API-Top-10 coverage table, residual risks, and the honest statement: _automated and agent-assisted review is not a substitute for an independent penetration test and professional code review before handling sensitive production data_ — list what an external pentest should focus on.
3. **`/docs/RELEASE_READINESS.md`** — a scorecard with **evidence links** for each line, and a verdict.

### Release gate checklist (every line must be ✅ or explicitly waived by me)

**Product:** all golden paths pass · zero sample data (CI-proven) · INR-first & multi-currency tests pass · onboarding (incl. infrastructure steps) works for admin and non-admin · Hindi + English complete · themes & a11y pass.
**Security:** 0 open Critical/High · all Medium fixed or accepted with justification · authz matrix 100% across UI/REST/GraphQL/search/export/webhooks · no secrets in tree or history · setup-token hijack test passes · SSRF/connection-test tests pass · container scan clean of Critical/High · SBOM + provenance published · `SECURITY.md` + private reporting enabled.
**Self-hosting:** fresh-clone install < 15 min on 3 environments · `crm doctor` all green · backup→restore drill passes · upgrade test passes · air-gapped run documented · refuses to start with weak/default secrets · multi-arch images.
**Backends:** Tier 1 & Tier 2 adapters pass conformance + security suites · capability matrix documented honestly · migration tool verified with checksums · adapter SPI documented with testkit.
**Open source:** licence chosen & applied, headers/REUSE pass · dependency licences compatible · notices generated · assets licensed · community files complete · docs site builds, links valid · CI/CD green · release workflow dry-run succeeded · name/trademark check recorded · AI-assistance statement included.

**Verdict rules:** **Go** = all ✅. **Conditional-Go** = only Low/Medium items open, each with owner and timeline (suggest tagging as `v0.x` public beta). **No-Go** = any open Critical/High, any secret in history, any failed install or restore drill, or licence incompatibility. Always list the **next 10 actions** in priority order.

---

## 9. FINAL OUTPUT FORMAT (what you report back)

1. A short executive summary: verdict (Go / Conditional-Go / No-Go), counts of requirements by status (before → after), counts of security findings by severity (found → fixed → open).
2. Links to the three audit documents, the traceability CSV, the scan reports, the SBOM, and the CI run proving the fresh-clone installs.
3. A "What a stranger sees" walkthrough: the exact commands from the README, and screenshots of the setup wizard, onboarding carousel (incl. the new "Your data, your servers" / "Plug in your own backend" slides), Connection Manager with a successful test, System Status, and `crm doctor` output.
4. Anything you could not verify (and why), assumptions made, decisions recorded, and recommended next steps (including an independent security review).

**Begin now: send me the four questions from §0.6 in a single message, then post the Implementation Plan for all seven phases and wait for my approval.**
