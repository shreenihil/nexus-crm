# Nexus CRM — Architecture Overview

## 1. System Context & Monorepo Structure

Nexus CRM is built as a **modular monolith** with clear package boundaries to maximize developer velocity and code reuse while preventing architectural degradation.

```mermaid
graph TD
    Client["Client Browsers (Web App)"] --> Next["apps/web (Next.js 15 App Router)"]
    Next --> Fastify["apps/api (Fastify REST & Realtime)"]
    Worker["apps/worker (BullMQ)"] --> Redis[("Redis 7")]
    Fastify --> Redis
    Fastify --> Postgres[("PostgreSQL 16 (RLS Enabled)")]
    Worker --> Postgres
    
    subgraph Packages
        Tokens["packages/tokens"] --> Next
        Tokens --> UI["packages/ui"]
        UI --> Next
        Schema["packages/schema"] --> Next
        Schema --> Fastify
        Permissions["packages/permissions"] --> Fastify
        Permissions --> Worker
    end
```

## 2. Security Boundaries & RLS Architecture

Every request to `apps/api` undergoes:
1. **Transport Security:** Strict TLS, HSTS, Secure `SameSite=Lax` cookies.
2. **Authentication Middleware:** Validates JWT access token or session cookie, resolves `user_id`.
3. **Workspace Context Resolution:** Extracts `workspace_id` from the active membership or request header `X-Workspace-ID`.
4. **PostgreSQL RLS Session Injection:**
   ```sql
   BEGIN;
   SET LOCAL app.workspace_id = 'c0a80101-0000-0000-0000-000000000001';
   SET LOCAL app.user_id = 'c0a80101-0000-0000-0000-000000000002';
   -- All queries within this transaction are automatically scoped
   COMMIT;
   ```
5. **Application-Level Scoping:** `packages/permissions` applies `where(eq(table.workspaceId, activeWorkspaceId))` for double defense.

## 3. Design Token Three-Tier Architecture

```mermaid
flowchart LR
    Primitives["Primitives\n(colors, spacing, fonts)"] --> Semantics["Semantics\n(bg-surface, text-primary,\naccent-primary, border-focus)"]
    Semantics --> Components["Components\n(btn-primary, input-border)"]
    Semantics --> CSSVars["CSS Custom Properties\n(:root, .dark, .high-contrast)"]
    CSSVars --> Tailwind["Tailwind Utilities\n(bg-surface, text-primary)"]
```
