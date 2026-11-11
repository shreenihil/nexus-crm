import { describe, it, expect, beforeAll } from "vitest";
import { createServer } from "../server";
import { db } from "../db/index";
import type { FastifyInstance } from "fastify";

describe("Phase 6: Platform Sovereignty, BYOK Envelope Encryption & Single-Tenant Deployment API Tests", () => {
  let app: FastifyInstance;
  let sessionId: string;
  let workspaceId: string;

  beforeAll(async () => {
    app = await createServer({ logger: false });

    // Seed clean demo data
    await db.seedDemoData(true);

    // Register test user & tenant
    const regRes = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: "sovereign-admin@acme.inc",
        password: "SuperSecretPassword123!",
        firstName: "Linus",
        lastName: "Torvalds",
        workspaceName: "Kernel Sovereign Corp",
      },
    });
    const regBody = JSON.parse(regRes.body);
    sessionId = regBody.sessionId;
    workspaceId = regBody.workspace.id;
  });

  describe("Health Probes & Prometheus Metrics", () => {
    it("returns healthy status on liveness check /health", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe("healthy");
      expect(body.uptime).toBeGreaterThanOrEqual(0);
      expect(body.timestamp).toBeDefined();
    });

    it("returns ready status and memory metrics on readiness probe /ready", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/ready",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe("ready");
      expect(body.database).toBe("connected");
      expect(body.memory).toBeDefined();
      expect(body.activeTenants).toBeGreaterThanOrEqual(1);
    });

    it("exposes standard Prometheus metrics on /metrics", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/metrics",
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("text/plain");
      const text = res.body;
      expect(text).toContain("nexus_uptime_seconds");
      expect(text).toContain("nexus_active_tenants");
      expect(text).toContain("nexus_records_total");
      expect(text).toContain("nexus_audit_events_total");
      expect(text).toContain("nexus_workflows_total");
    });
  });

  describe("KMS Envelope Encryption & Zero-Downtime BYOK Key Rotation", () => {
    it("retrieves active KMS master key version with secret keys redacted", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/v1/platform/kms/keys",
        headers: { authorization: `Bearer ${sessionId}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.activeVersion).toBe(1);
      expect(body.algorithm).toBe("AES-256-GCM");
      expect(body.keys.length).toBeGreaterThanOrEqual(1);
      // Ensure raw keyHex is never exposed to API clients
      expect(body.keys[0].keyHex).toBeUndefined();
      expect(body.keys[0].status).toBe("ACTIVE");
    });

    it("triggers zero-downtime master key rotation (increments version and re-wraps DEKs in <100ms)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/platform/kms/rotate",
        headers: { authorization: `Bearer ${sessionId}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.rotation.previousVersion).toBe(1);
      expect(body.rotation.newVersion).toBe(2);
      expect(body.rotation.durationMs).toBeLessThan(100);
      expect(body.rotation.algorithm).toBe("AES-256-GCM");

      // Verify that querying keys now shows Version 2 as ACTIVE and Version 1 as ROTATED
      const keysRes = await app.inject({
        method: "GET",
        url: "/v1/platform/kms/keys",
        headers: { authorization: `Bearer ${sessionId}` },
      });
      const keysBody = JSON.parse(keysRes.body);
      expect(keysBody.activeVersion).toBe(2);
      expect(
        keysBody.keys.some(
          (k: any) => k.version === 1 && k.status === "ROTATED",
        ),
      ).toBe(true);
      expect(
        keysBody.keys.some(
          (k: any) => k.version === 2 && k.status === "ACTIVE",
        ),
      ).toBe(true);
    });
  });

  describe("Tenant Data Sovereignty & Portability", () => {
    it("exports 1-click complete tenant archive bundle with SHA-256 integrity checksum manifest", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/v1/platform/export",
        headers: { authorization: `Bearer ${sessionId}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(res.headers["content-disposition"]).toContain(
        "attachment; filename=",
      );

      const archive = JSON.parse(res.body);
      expect(archive.manifest).toBeDefined();
      expect(archive.manifest.formatVersion).toBe("1.0.0");
      expect(archive.manifest.workspaceId).toBe(workspaceId);
      expect(archive.manifest.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(archive.manifest.entityCounts.objects).toBeGreaterThanOrEqual(4);
      expect(archive.schemas.objects.length).toBeGreaterThanOrEqual(4);
      expect(archive.security.auditLedger.length).toBeGreaterThanOrEqual(1);
    });

    it("verifies archive integrity and imports tenant archive bundle successfully", async () => {
      // 1. Export valid archive
      const exportRes = await app.inject({
        method: "GET",
        url: "/v1/platform/export",
        headers: { authorization: `Bearer ${sessionId}` },
      });
      const archive = JSON.parse(exportRes.body);

      // 2. Import into tenant
      const importRes = await app.inject({
        method: "POST",
        url: "/v1/platform/import",
        headers: { authorization: `Bearer ${sessionId}` },
        payload: archive,
      });

      expect(importRes.statusCode).toBe(200);
      const importBody = JSON.parse(importRes.body);
      expect(importBody.ok).toBe(true);
      expect(importBody.validAuditChain).toBe(true);
      expect(importBody.restored).toBeDefined();
    });

    it("rejects tampered tenant archive with checksum mismatch", async () => {
      const exportRes = await app.inject({
        method: "GET",
        url: "/v1/platform/export",
        headers: { authorization: `Bearer ${sessionId}` },
      });
      const archive = JSON.parse(exportRes.body);

      // Tamper with data payload without updating checksumSha256
      archive.data.records.push({
        id: "malicious-injected-record",
        workspaceId,
        objectId: "obj-fake",
        data: { name: "Hacked Record" },
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const importRes = await app.inject({
        method: "POST",
        url: "/v1/platform/import",
        headers: { authorization: `Bearer ${sessionId}` },
        payload: archive,
      });

      expect(importRes.statusCode).toBe(400);
      expect(JSON.parse(importRes.body).error).toContain(
        "integrity verification failed",
      );
    });
  });

  describe("Pluggable Storage Backends (§3 Backend Connection Manager)", () => {
    it("returns active backends, capabilities, and health metrics", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/v1/platform/backends",
        headers: { authorization: `Bearer ${sessionId}` },
      });

      expect(res.statusCode).toBe(200);
      const overview = JSON.parse(res.body);
      expect(overview.database).toBeDefined();
      expect(overview.database.capabilities.transactions).toBe(true);
      expect(overview.objectStorage).toBeDefined();
      expect(overview.queueCache).toBeDefined();
    });

    it("probes backend connectivity in safe read-only mode", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/platform/backends/probe",
        headers: { authorization: `Bearer ${sessionId}` },
        payload: { category: "database" },
      });

      expect(res.statusCode).toBe(200);
      const probe = JSON.parse(res.body);
      expect(probe.status).toBeDefined();
      expect(probe.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("rejects unauthenticated or non-admin access to backends overview", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/v1/platform/backends",
      });
      expect(res.statusCode).toBe(401);
    });
  });
});
