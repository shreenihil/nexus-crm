import { describe, it, expect, beforeAll } from 'vitest';
import { createServer } from '../server';
import { db } from '../db/index';
import { generateUuidV7 } from '../lib/crypto';
import type { FastifyInstance } from 'fastify';
import type { WorkspaceRole } from '@nexus/schema';

describe('Phase 1 — Comprehensive Permission Matrix Test Suite', () => {
  let app: FastifyInstance;
  const workspaceId = generateUuidV7();
  const sessionTokens: Record<string, string> = {};

  const roles: WorkspaceRole[] = [
    'owner',
    'admin',
    'sales_manager',
    'sales_rep',
    'support',
    'finance',
    'read_only',
  ];

  beforeAll(async () => {
    app = await createServer({ logger: false });
    await app.ready();

    // Create workspace & seed standard objects
    const now = new Date().toISOString();
    db.workspaces.set(workspaceId, {
      id: workspaceId,
      name: 'Matrix Test Corp',
      slug: 'matrix-test',
      brandColor: '#6366f1',
      createdAt: now,
      updatedAt: now,
    });
    await db.seedStandardObjects(workspaceId);

    // Create users & sessions for every role
    for (const role of roles) {
      const userId = generateUuidV7();
      const sessionId = generateUuidV7();

      db.users.set(userId, {
        id: userId,
        email: `${role}@matrix.corp`,
        passwordHash: 'hash',
        firstName: role,
        lastName: 'User',
        isActive: true,
        isEmailVerified: true,
        createdAt: now,
        updatedAt: now,
      });

      db.memberships.set(generateUuidV7(), {
        id: generateUuidV7(),
        workspaceId,
        userId,
        role,
        createdAt: now,
        updatedAt: now,
      });

      db.sessions.set(sessionId, {
        id: sessionId,
        userId,
        workspaceId,
        refreshTokenHash: 'hash',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now,
        lastUsedAt: now,
      });

      sessionTokens[role] = sessionId;
    }

    // Seed a sample deal record with sensitive financial fields
    const dealsObj = Array.from(db.objects.values()).find(
      (o) => o.workspaceId === workspaceId && o.apiName === 'deals'
    )!;

    const sampleDealId = generateUuidV7();
    db.records.set(sampleDealId, {
      id: sampleDealId,
      workspaceId,
      objectId: dealsObj.id,
      data: {
        name: 'Enterprise Cloud Deal',
        amount: 250000,
        stage: 'Qualified',
        probability: 50,
        expected_value: 125000,
        commission_rate: 15, // SENSITIVE / HIDDEN FIELD
        cost_basis: 80000,   // SENSITIVE / HIDDEN FIELD
      },
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  });

  // Layer 1: Object-level permissions
  it('Matrix: Object-level access enforcement across all roles', async () => {
    // 1. Owner & Admin can read deals
    for (const role of ['owner', 'admin', 'sales_manager', 'sales_rep', 'read_only']) {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/records/deals',
        headers: { authorization: `Bearer ${sessionTokens[role]}` },
      });
      expect(res.statusCode, `Role ${role} should have read access to deals`).toBe(200);
    }

    // 2. Customer Support has NO access to deals (must return 403)
    const supportRes = await app.inject({
      method: 'GET',
      url: '/v1/records/deals',
      headers: { authorization: `Bearer ${sessionTokens['support']}` },
    });
    expect(supportRes.statusCode).toBe(403);
  });

  // Layer 2: Field-level permission masking (REST responses)
  it('Matrix: Field-level security removes hidden fields for Sales Rep', async () => {
    // 1. Owner can see commission_rate and cost_basis
    const ownerRes = await app.inject({
      method: 'GET',
      url: '/v1/records/deals',
      headers: { authorization: `Bearer ${sessionTokens['owner']}` },
    });
    expect(ownerRes.statusCode).toBe(200);
    const ownerDeal = JSON.parse(ownerRes.body).records[0];
    expect(ownerDeal.data.commission_rate).toBe(15);
    expect(ownerDeal.data.cost_basis).toBe(80000);

    // 2. Sales Rep has commission_rate and cost_basis STRIPPED/MASKED from response!
    const repRes = await app.inject({
      method: 'GET',
      url: '/v1/records/deals',
      headers: { authorization: `Bearer ${sessionTokens['sales_rep']}` },
    });
    expect(repRes.statusCode).toBe(200);
    const repDeal = JSON.parse(repRes.body).records[0];
    expect(repDeal.data.name).toBe('Enterprise Cloud Deal');
    expect(repDeal.data.amount).toBe(250000);
    // Crucial:
    expect(repDeal.data.commission_rate).toBeUndefined();
    expect(repDeal.data.cost_basis).toBeUndefined();
  });

  // Layer 3: Export-level permissions & masking
  it('Matrix: Export endpoint enforces permissions and masks fields', async () => {
    // 1. Support cannot export deals
    const supportExport = await app.inject({
      method: 'GET',
      url: '/v1/export/deals',
      headers: { authorization: `Bearer ${sessionTokens['support']}` },
    });
    expect(supportExport.statusCode).toBe(403);

    // 2. Sales Rep is blocked from exporting deals (403)
    const repExport = await app.inject({
      method: 'GET',
      url: '/v1/export/deals',
      headers: { authorization: `Bearer ${sessionTokens['sales_rep']}` },
    });
    expect(repExport.statusCode).toBe(403);

    // 3. Sales Manager can export deals
    const managerExport = await app.inject({
      method: 'GET',
      url: '/v1/export/deals',
      headers: { authorization: `Bearer ${sessionTokens['sales_manager']}` },
    });
    expect(managerExport.statusCode).toBe(200);
    const exportedRecords = JSON.parse(managerExport.body).records;
    expect(exportedRecords.length).toBe(1);
  });

  // Layer 4: Schema Management permissions
  it('Matrix: Schema mutations restricted to Owner and Admin only', async () => {
    // Rep cannot create a custom object
    const repRes = await app.inject({
      method: 'POST',
      url: '/v1/metadata/objects',
      headers: { authorization: `Bearer ${sessionTokens['sales_rep']}` },
      payload: {
        apiName: 'hacked_object',
        singularLabel: 'Hacked',
        pluralLabel: 'Hackeds',
      },
    });
    expect(repRes.statusCode).toBe(403);

    // Admin can create custom object
    const adminRes = await app.inject({
      method: 'POST',
      url: '/v1/metadata/objects',
      headers: { authorization: `Bearer ${sessionTokens['admin']}` },
      payload: {
        apiName: 'licenses',
        singularLabel: 'License',
        pluralLabel: 'Licenses',
      },
    });
    expect(adminRes.statusCode).toBe(201);
  });
});
