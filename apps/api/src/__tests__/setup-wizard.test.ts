import { describe, it, expect, beforeEach } from "vitest";
import { createServer } from "../server.js";
import { db } from "../db/index.js";
import type { FastifyInstance } from "fastify";

describe("First-Run Setup Wizard (§4.2)", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    // Reset instance to clean, uninitialized state
    db.isInstanceInitialized = false;
    db.setupTokenHash = null;
    db.setupTokenExpiresAt = null;
    app = await createServer({ logger: false });
  });

  it("1. returns initialized=false and requiresSetupToken=true when uninitialized", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/setup/status",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.initialized).toBe(false);
    expect(body.requiresSetupToken).toBe(true);
  });

  it("2. verifies valid setup token and rejects invalid token", async () => {
    const validToken = db.generateSetupToken();

    // Invalid token
    const badRes = await app.inject({
      method: "POST",
      url: "/v1/setup/verify-token",
      payload: { token: "invalid-token-1234" },
    });
    expect(badRes.statusCode).toBe(401);
    expect(JSON.parse(badRes.body).valid).toBe(false);

    // Valid token
    const goodRes = await app.inject({
      method: "POST",
      url: "/v1/setup/verify-token",
      payload: { token: validToken },
    });
    expect(goodRes.statusCode).toBe(200);
    expect(JSON.parse(goodRes.body).valid).toBe(true);
  });

  it("3. validates password length and email requirements during completion", async () => {
    const token = db.generateSetupToken();

    // Short password
    const shortPassRes = await app.inject({
      method: "POST",
      url: "/v1/setup/complete",
      payload: {
        token,
        instanceName: "Acme India",
        adminEmail: "admin@acme.in",
        adminPassword: "short",
        adminFirstName: "Raj",
        adminLastName: "Kumar",
      },
    });
    expect(shortPassRes.statusCode).toBe(400);
    expect(JSON.parse(shortPassRes.body).error).toMatch(
      /at least 12 characters/,
    );

    // Bad email
    const badEmailRes = await app.inject({
      method: "POST",
      url: "/v1/setup/complete",
      payload: {
        token,
        instanceName: "Acme India",
        adminEmail: "not-an-email",
        adminPassword: "StrongPassword123!@#",
        adminFirstName: "Raj",
        adminLastName: "Kumar",
      },
    });
    expect(badEmailRes.statusCode).toBe(400);
    expect(JSON.parse(badEmailRes.body).error).toMatch(/Valid admin email/);
  });

  it("4. successfully completes setup and locks out further setup calls (returns 404)", async () => {
    const token = db.generateSetupToken();

    const res = await app.inject({
      method: "POST",
      url: "/v1/setup/complete",
      payload: {
        token,
        instanceName: "Nexus Bharat HQ",
        adminEmail: "founder@nexus-bharat.in",
        adminPassword: "ProductionMasterKey2026!#",
        adminFirstName: "Arun",
        adminLastName: "Prasad",
        baseCurrency: "INR",
        timezone: "Asia/Kolkata",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.user.email).toBe("founder@nexus-bharat.in");
    expect(body.workspace.name).toBe("Nexus Bharat HQ");
    expect(body.workspace.baseCurrency).toBe("INR");
    expect(body.workspace.timezone).toBe("Asia/Kolkata");
    expect(db.isInstanceInitialized).toBe(true);

    // Verify session cookie was set
    const cookieHeader = res.headers["set-cookie"];
    expect(cookieHeader).toBeDefined();

    // 5. Verify setup token has been invalidated
    expect(db.verifySetupToken(token)).toBe(false);

    // 6. Verify setup endpoints now return 404
    const statusPostInit = await app.inject({
      method: "GET",
      url: "/v1/setup/status",
    });
    expect(statusPostInit.statusCode).toBe(404);

    const verifyPostInit = await app.inject({
      method: "POST",
      url: "/v1/setup/verify-token",
      payload: { token },
    });
    expect(verifyPostInit.statusCode).toBe(404);

    const completePostInit = await app.inject({
      method: "POST",
      url: "/v1/setup/complete",
      payload: { token },
    });
    expect(completePostInit.statusCode).toBe(404);

    // 7. Verify tamper-evident audit event
    const lastAudit = db.auditEvents[db.auditEvents.length - 1];
    expect(lastAudit).toBeDefined();
    expect(lastAudit?.action).toBe("system.setup_completed");
    expect(lastAudit?.payload?.baseCurrency).toBe("INR");
  });
});
