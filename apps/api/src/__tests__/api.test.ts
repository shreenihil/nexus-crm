import { describe, it, expect, beforeAll } from 'vitest';
import { createServer } from '../server.js';
import { db } from '../db/index.js';
import { computeTotpCode } from '../lib/crypto.js';
import type { FastifyInstance } from 'fastify';

describe('Nexus CRM API & RLS Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createServer({ logger: false });
    await app.ready();
  });

  it('Health endpoint returns healthy status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/health',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('healthy');
  });

  it('Flow: Register user + workspace -> creates owner membership & session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'founder@acme.inc',
        password: 'SuperSecretPassword123!',
        firstName: 'Arthur',
        lastName: 'Dent',
        workspaceName: 'Acme Corporation',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.user.email).toBe('founder@acme.inc');
    expect(body.workspace.name).toBe('Acme Corporation');
    expect(body.sessionId).toBeDefined();

    // Check cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
  });

  it('Flow: MFA enrollment and two-factor challenge during login', async () => {
    // 1. Register a dedicated MFA user
    const regRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'security.officer@acme.inc',
        password: 'PasswordEnterprise99!',
        firstName: 'Jane',
        lastName: 'Doe',
        workspaceName: 'Acme Security',
      },
    });
    const regBody = JSON.parse(regRes.body);
    const sessionId = regBody.sessionId;

    // 2. Setup MFA
    const setupRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/mfa/setup',
      headers: {
        authorization: `Bearer ${sessionId}`,
      },
    });
    expect(setupRes.statusCode).toBe(200);
    const { secret, otpauthUri } = JSON.parse(setupRes.body);
    expect(secret).toBeDefined();
    expect(otpauthUri).toContain('otpauth://totp/Nexus%20CRM:');

    // 3. Compute code and verify MFA
    const validCode = computeTotpCode(secret);
    const verifyRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/mfa/verify',
      headers: {
        authorization: `Bearer ${sessionId}`,
      },
      payload: { token: validCode },
    });
    expect(verifyRes.statusCode).toBe(200);
    const verifyBody = JSON.parse(verifyRes.body);
    expect(verifyBody.success).toBe(true);
    expect(verifyBody.recoveryCodes).toHaveLength(10);

    // 4. Login now requires MFA
    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'security.officer@acme.inc',
        password: 'PasswordEnterprise99!',
      },
    });
    expect(loginRes.statusCode).toBe(200);
    const loginBody = JSON.parse(loginRes.body);
    expect(loginBody.mfaRequired).toBe(true);
    expect(loginBody.mfaTicket).toBeDefined();

    // 5. Complete MFA challenge
    const challengeCode = computeTotpCode(secret);
    const challengeRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/mfa/challenge',
      payload: {
        mfaTicket: loginBody.mfaTicket,
        token: challengeCode,
      },
    });
    expect(challengeRes.statusCode).toBe(200);
    const challengeBody = JSON.parse(challengeRes.body);
    expect(challengeBody.success).toBe(true);
    expect(challengeBody.sessionId).toBeDefined();
  });

  it('RLS Isolation Proof: Tenant A cannot read Tenant B data', async () => {
    // 1. Create Tenant A
    const resA = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'alice@tenant-a.com',
        password: 'PasswordTenantA123!',
        firstName: 'Alice',
        lastName: 'Alpha',
        workspaceName: 'Tenant Alpha',
      },
    });
    const sessionA = JSON.parse(resA.body).sessionId;
    const workspaceIdA = JSON.parse(resA.body).workspace.id;

    // 2. Create Tenant B
    const resB = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'bob@tenant-b.com',
        password: 'PasswordTenantB123!',
        firstName: 'Bob',
        lastName: 'Beta',
        workspaceName: 'Tenant Beta',
      },
    });
    const sessionB = JSON.parse(resB.body).sessionId;
    const workspaceIdB = JSON.parse(resB.body).workspace.id;

    // 3. Query audit events as Tenant A
    const eventsARes = await app.inject({
      method: 'GET',
      url: '/v1/audit/events',
      headers: { authorization: `Bearer ${sessionA}` },
    });
    expect(eventsARes.statusCode).toBe(200);
    const eventsA = JSON.parse(eventsARes.body);

    // Verify all returned events belong to Workspace A only
    expect(eventsA.length).toBeGreaterThan(0);
    for (const ev of eventsA) {
      expect(ev.workspaceId).toBe(workspaceIdA);
      expect(ev.workspaceId).not.toBe(workspaceIdB);
    }

    // 4. Test RLS context directly
    db.withRlsContext(workspaceIdA, 'user-a', (scopedDb) => {
      expect(scopedDb.workspaceId).toBe(workspaceIdA);
      const ws = scopedDb.getWorkspace();
      expect(ws?.id).toBe(workspaceIdA);
      expect(ws?.name).toBe('Tenant Alpha');

      const auditRecords = scopedDb.getAuditEvents();
      expect(auditRecords.every((r) => r.workspaceId === workspaceIdA)).toBe(true);
      expect(auditRecords.some((r) => r.workspaceId === workspaceIdB)).toBe(false);
    });
  });

  it('Audit Log Hash Chain: Detects tampering if row is modified', async () => {
    // Check integrity before tampering
    expect(db.verifyAuditChainIntegrity()).toBe(true);

    // Inject a tampered event
    const originalEvent = db.auditEvents[0]!;
    const originalPayload = originalEvent.payload;

    try {
      // Tamper with payload
      originalEvent.payload = { ...originalPayload, forgedField: 'malicious' };

      // Verification MUST throw
      expect(() => db.verifyAuditChainIntegrity()).toThrow(/hash tampering detected/);
    } finally {
      // Restore original
      originalEvent.payload = originalPayload;
      expect(db.verifyAuditChainIntegrity()).toBe(true);
    }
  });
});
