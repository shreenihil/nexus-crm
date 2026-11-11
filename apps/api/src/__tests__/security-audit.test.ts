import { describe, it, expect, beforeAll } from 'vitest';
import { createServer } from '../server.js';
import { db } from '../db/index.js';
import { validateSafeOutboundUrl, SSRFBlockedError } from '../lib/ssrf.js';
import { evaluateAST, tokenize, Parser } from '@nexus/schema';
import type { FastifyInstance } from 'fastify';

describe('Security Hardening & Regression Test Suite (§7 & ASVS Level 2)', () => {
  let app: FastifyInstance;
  const tenantA = '01910000-0000-7000-8000-000000000001';
  const tenantB = '01910000-0000-7000-8000-000000000099';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await createServer({ logger: false });
    await db.initializeSystem(true);
  });

  describe('1. SSRF & Outbound URL Protection', () => {
    it('blocks loopback IP addresses (127.0.0.1, localhost)', async () => {
      await expect(validateSafeOutboundUrl('http://127.0.0.1:8080/webhook')).rejects.toThrow(SSRFBlockedError);
      await expect(validateSafeOutboundUrl('http://localhost:4000/api')).rejects.toThrow(SSRFBlockedError);
    });

    it('blocks RFC1918 private IPv4 networks (10.x, 192.168.x, 172.16.x)', async () => {
      await expect(validateSafeOutboundUrl('http://10.0.0.1/admin')).rejects.toThrow(SSRFBlockedError);
      await expect(validateSafeOutboundUrl('http://192.168.1.1/secret')).rejects.toThrow(SSRFBlockedError);
      await expect(validateSafeOutboundUrl('http://172.16.0.1/internal')).rejects.toThrow(SSRFBlockedError);
    });

    it('blocks Cloud Metadata services (169.254.169.254)', async () => {
      await expect(validateSafeOutboundUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow(SSRFBlockedError);
    });

    it('blocks non-HTTP/HTTPS protocols (file://, gopher://)', async () => {
      await expect(validateSafeOutboundUrl('file:///etc/passwd')).rejects.toThrow(SSRFBlockedError);
      await expect(validateSafeOutboundUrl('gopher://127.0.0.1:70/')).rejects.toThrow(SSRFBlockedError);
    });
  });

  describe('2. CORS & Origin Isolation', () => {
    it('rejects untrusted malicious origins when credentials are enabled', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          origin: 'https://attacker-controlled-site.com',
        },
      });

      // Untrusted origin should NOT have access-control-allow-origin header set to attacker
      const allowOrigin = res.headers['access-control-allow-origin'];
      expect(allowOrigin).not.toBe('https://attacker-controlled-site.com');
    });
  });

  describe('3. Formula Engine Sandbox & Prototype Pollution Defense', () => {
    it('neutralizes prototype pollution attempts via __proto__, constructor, prototype', () => {
      const maliciousContext = { regularField: 100 };
      const astProto = new Parser(tokenize('{__proto__.polluted}')).parse();
      const astConstructor = new Parser(tokenize('{constructor.prototype.polluted}')).parse();

      expect(evaluateAST(astProto, maliciousContext)).toBeNull();
      expect(evaluateAST(astConstructor, maliciousContext)).toBeNull();
      expect((Object.prototype as any).polluted).toBeUndefined();
    });
  });

  describe('4. Multi-Tenant Authorization & IDOR Protection', () => {
    it('prevents tenant B from fetching or modifying tenant A records', async () => {
      // Create a test record in tenant A
      const testRecordId = 'rec-tenant-a-protected';
      db.records.set(testRecordId, {
        id: testRecordId,
        workspaceId: tenantA,
        objectId: 'companies',
        data: { name: 'Tenant A Confidential Corp' },
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Tenant B session token
      const tenantBSessionId = 'sess-tenant-b-user';
      db.sessions.set(tenantBSessionId, {
        id: tenantBSessionId,
        userId: 'usr-b',
        workspaceId: tenantB,
        refreshTokenHash: 'hash',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      });
      db.memberships.set('mem-b', {
        id: 'mem-b',
        workspaceId: tenantB,
        userId: 'usr-b',
        role: 'sales_rep',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Attempt IDOR read across tenant boundary
      const res = await app.inject({
        method: 'GET',
        url: `/v1/records/companies/${testRecordId}`,
        headers: { authorization: `Bearer ${tenantBSessionId}` },
      });

      // Must be blocked (401, 403 or 404) - Never 200
      expect([401, 403, 404]).toContain(res.statusCode);
      expect(res.statusCode).not.toBe(200);
    });
  });
});
