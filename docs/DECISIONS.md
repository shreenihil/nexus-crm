# Architectural Decision Records (ADRs)

This document records the architectural and design decisions for Nexus CRM using the ADR format (Context → Decision → Consequences).

---

## ADR-001: API Framework Selection — Fastify

- **Status:** Accepted
- **Date:** 2026-10-16
- **Context:**
  The Master Brief requires either NestJS or Fastify exposing REST `/v1` (OpenAPI 3.1) and GraphQL (`/graphql`) from a shared service layer. The CRM requires high throughput (sub-200ms p95 on lists), low memory overhead, asynchronous JSON serialization performance, modular encapsulation, and straightforward schema validation integration without complex decorator reflection.
- **Decision:**
  We adopt **Fastify** as the core API framework. Modules are organized as Fastify plugins with strict encapsulated scopes. Validation is handled by Zod via standard Fastify schema providers, and OpenAPI 3.1 documentation is auto-generated via `@fastify/swagger`.
- **Consequences:**
  - **Positive:** Up to 2x faster request throughput compared to Express/NestJS, clean dependency injection via plugins, native schema compilation, low cold-start latency.
  - **Negative:** Less prescriptive directory conventions than NestJS; architecture conventions must be strictly enforced via monorepo structure and ESLint rules.

---

## ADR-002: Dual-Layer Multi-Tenancy & Row-Level Security (RLS)

- **Status:** Accepted
- **Date:** 2026-10-16
- **Context:**
  CRMs are prime targets for cross-tenant data exfiltration when tenancy checks exist solely in application code (ORM query filters). Any developer oversight, missing `WHERE workspace_id = ?` clause, or raw SQL query can cause catastrophic data leakage.
- **Decision:**
  Implement defense-in-depth through two independent enforcement layers:
  1. **Application Layer (`packages/permissions`):** Query scoping automatically appends `workspace_id` to all queries.
  2. **Database Layer (PostgreSQL Row-Level Security):** Every tenant-scoped table has `ROW LEVEL SECURITY` enabled. Database connections set `SET LOCAL app.workspace_id = '<current_workspace_id>'` inside transaction blocks. The RLS policy rejects any row where `workspace_id != current_setting('app.workspace_id')`.
- **Consequences:**
  - **Positive:** Even a catastrophic application bug or raw SQL injection cannot read or write data belonging to another tenant.
  - **Negative:** Database connection pooling requires careful session hygiene (`SET LOCAL` within transactions or session reset) to prevent connection reuse leakage.

---

## ADR-003: Three-Tier Design Tokens & Theme Engine Architecture

- **Status:** Accepted
- **Date:** 2026-10-16
- **Context:**
  The CRM UI must be sleek, modern, accessible (WCAG 2.2 AA / AAA for high-contrast), and support Light, Dark, System, High-contrast, and 6 dynamic accent palettes + custom brand hex without theme flash (FOWT) or hardcoded colors in component code.
- **Decision:**
  Define tokens in `packages/tokens` across three tiers:
  1. **Primitives:** Raw color hexes, base spacing units (4px scale), typography scales.
  2. **Semantics:** Meaningful tokens (`bg-surface`, `text-primary`, `border-muted`, `accent-primary`, `status-danger`).
  3. **Components:** Specific abstractions (`button-primary-bg`, `table-row-hover`).
     Tokens are compiled into CSS custom properties (`--color-bg-surface`, etc.) mapped to Tailwind CSS utilities. A blocking inline script in `<head>` applies the user's theme preference before first DOM paint to prevent FOWT.
- **Consequences:**
  - **Positive:** Components never contain hardcoded hex codes. Contrast ratios can be validated mathematically at build time. Themes switch instantaneously with zero flash.
  - **Negative:** Requires strict discipline when creating components to only consume semantic tokens.

---

## ADR-004: Tamper-Evident Immutable Audit Log

- **Status:** Accepted
- **Date:** 2026-10-16
- **Context:**
  Enterprise compliance requires audit logs that cannot be altered or purged by rogue administrators or compromised application credentials.
- **Decision:**
  Implement an append-only `audit_events` ledger:
  - Each audit event stores `prev_hash` and `current_hash = SHA256(prev_hash + JSON(event_payload))`.
  - The database user assigned to the application has `INSERT` and `SELECT` privileges only on `audit_events` (no `UPDATE`, no `DELETE`).
  - A database trigger blocks updates or deletes even if permissions were misconfigured.
- **Consequences:**
  - **Positive:** Cryptographically provable tamper evidence. Any missing or modified row breaks the hash chain.
  - **Negative:** Requires serial or lock-guarded calculation of the hash chain head during sequential audit event ingestion.

---

## ADR-005: Authentication, Session Management, and MFA Architecture

- **Status:** Accepted
- **Date:** 2026-10-16
- **Context:**
  The CRM requires sovereign authentication with zero third-party lock-in: secure password hashing, TOTP MFA, rotating refresh tokens, and recovery codes.
- **Decision:**
  Build a dedicated auth module in `apps/api`:
  - Passwords hashed using **Argon2id** (memory cost 64MB, 3 iterations, 4 parallelism).
  - MFA implemented via RFC 6238 TOTP with AES-256-GCM envelope-encrypted secrets at rest.
  - Session tokens stored in database `sessions` table; short-lived access tokens + rotating refresh tokens issued in secure `httpOnly`, `SameSite=Lax`, `Secure` cookies.
  - 10 single-use cryptographically secure recovery codes generated upon MFA activation.
- **Consequences:**
  - **Positive:** High security, OWASP ASVS L2 aligned, zero recurring auth vendor costs.
  - **Negative:** We are directly responsible for rate limiting, account lockout, and token rotation security.

---

## ADR-006: Hybrid Storage Strategy for Programmable CRM Schema

- **Status:** Accepted
- **Date:** 2026-10-16
- **Context:**
  The CRM requires unlimited custom objects, custom attributes (text, number, currency, relation, formula, etc.), and bidirectional relationships defined by users dynamically through the UI/API without executing unversioned raw DDL (`ALTER TABLE`) on the production database.
- **Decision:**
  Adopt a hybrid storage strategy:
  1. **Metadata tables:** `objects`, `attributes`, `relationships`, and `views` describe both standard and custom schemas.
  2. **Standard objects:** Pre-seeded in metadata with system flags, mapped to real entity contracts.
  3. **Records table:** Typed JSONB `data` column partitioned/indexed by `workspace_id` and `object_id`. For filterable, sortable, or unique attributes, expression indexes and GIN indexes are maintained.
  4. **Record links table:** `record_links` stores bidirectional graph edges (`from_record_id`, `to_record_id`, `relationship_id`, `workspace_id`) with composite B-tree indexes in both directions.
- **Consequences:**
  - **Positive:** Zero DDL locks or migration downtime when creating custom objects or attributes; bidirectional relationships work identically for standard and custom objects.
  - **Negative:** Requires strict schema validation (Zod) on every write and expression indexing for high-cardinality filters.

---

## ADR-007: Safe AST-Based Sandboxed Formula Engine

- **Status:** Accepted
- **Date:** 2026-10-16
- **Context:**
  Custom formula attributes (e.g. `amount * (probability / 100)` or `IF(status == 'Active', mrr * 12, 0)`) must evaluate dynamically across record values. Using JavaScript `eval()` or `new Function()` creates severe remote code execution (RCE) and prototype pollution vulnerabilities.
- **Decision:**
  Implement a dedicated Lexer, recursive-descent AST Parser, and sandboxed Evaluator:
  - Lexer recognizes tokens: numbers, strings, identifiers (`{field_name}`), operators (`+`, `-`, `*`, `/`, `>`, `<`, `==`, `!=`), and function calls (`IF`, `COALESCE`, `ROUND`, `CONCAT`).
  - Evaluator traverses the syntax tree strictly against an explicit record data dictionary, disallowing any access to global scope, window, process, prototypes, or constructor functions.
- **Consequences:**
  - **Positive:** Mathematically safe calculation engine with 0% risk of arbitrary code execution or injection.
  - **Negative:** Functions are restricted to the explicitly implemented AST node library.

---

## ADR-008: Currency-Agnostic Value Object & India-First Defaults (§4.7)

- **Status:** Accepted
- **Date:** 2026-10-16
- **Context:**
  Most CRMs hardcode assumptions about currency (`$`, USD, division by 100, 2-decimal digits, Western comma digit grouping `1,000,000`). This causes rounding loss, precision corruption for 0-decimal (JPY) or 3-decimal (KWD) currencies, and poor developer experience for global markets. Furthermore, Nexus CRM is India-first in its defaults, requiring INR (₹), Indian lakh/crore digit grouping (`12,34,567.50`), compact forms (`12.5 L`, `3.2 Cr`), and Indian financial year (1 April – 31 March).
- **Decision:**
  1. **Strict Money Value Object:** Implement an immutable `Money` class in `packages/schema`:
     - Money is stored exclusively as `amount_minor` (bigint/integer) + `currency_code` (ISO-4217 string).
     - Decimal exponents are looked up from an ISO-4217 dictionary (INR=2 paise, JPY=0, KWD=3, USD=2). Never divide or multiply by 100 by default.
     - Adding or comparing two different currencies throws a `CurrencyMismatchError` unless explicit `convert(toCurrency, rate)` is executed.
     - Remainder-preserving allocation algorithm ensures splits never lose a single paisa or cent.
  2. **India-First Defaults:**
     - Default workspace currency is `INR` (`₹`).
     - Default user locale is `en-IN` (with `hi-IN` support) utilizing Indian lakh/crore grouping and compact symbols (`L`, `Cr`).
     - Default fiscal year is 1 April to 31 March (e.g. FY 2026–27).
     - Default timezone is `Asia/Kolkata` (IST).
  3. **CI Currency Gate:**
     - A CI script scans codebase for forbidden literal `$`, hardcoded `USD`, or `/ 100` outside the currency module.
- **Consequences:**
  - **Positive:** 100% precision safety, zero currency bugs, native Indian localization without sacrificing any ISO-4217 foreign currency capability.
  - **Negative:** Developers must always use `Money` and formatting utilities instead of raw string templates or numbers.
