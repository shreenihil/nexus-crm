# Nexus CRM

> A production-grade, multi-tenant, keyboard-first CRM with programmability underneath and consumer-grade simplicity on top.

## Architecture Highlights
- **Multi-Tenant Defense-in-Depth:** Postgres Row-Level Security (RLS) + application query scoping.
- **Tamper-Evident Audit Ledger:** Cryptographic SHA-256 hash chaining on all security-critical events.
- **Three-Tier Design Tokens:** Light, Dark, System, High-contrast, and 6 curated accent palettes with zero theme flash.
- **Sovereign Authentication:** Argon2id password hashing, TOTP MFA, rotating session cookies.

---

## Quickstart (Under 5 Minutes)

### 1. Prerequisites
- Node.js >= 20 (v25 recommended)
- `pnpm` >= 9 (`npm install -g pnpm`)
- Docker & Docker Compose (optional for local Postgres/Redis)

### 2. Setup & Dependencies
```bash
cp .env.example .env
pnpm install
```

### 3. Start Database & Services
```bash
# Start local Postgres, Redis, MinIO, Mailpit
docker compose -f infra/docker-compose.yml up -d
```

### 4. Run Development Server
```bash
pnpm dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)
- REST API & Swagger: [http://localhost:4000/docs](http://localhost:4000/docs)
- Design System Showcase: [http://localhost:3000/design-system](http://localhost:3000/design-system)

---

## Monorepo Layout
```
apps/
  web/          # Next.js 15 App Router frontend
  api/          # Fastify REST service with OpenAPI & RLS
  worker/       # BullMQ asynchronous background jobs
packages/
  tokens/       # Design tokens, theme compiler & WCAG checker
  ui/           # Accessible Radix UI component library
  permissions/  # RBAC engine & database query scoping
  schema/       # Shared validation models (Zod)
  config/       # Shared tsconfig, eslint, prettier
docs/           # MASTER_BRIEF.md, DECISIONS.md, ARCHITECTURE.md, THREAT_MODEL.md
```

## Running Tests
```bash
# Run unit & integration tests
pnpm test

# Run Playwright E2E and accessibility audits
pnpm test:e2e
```
