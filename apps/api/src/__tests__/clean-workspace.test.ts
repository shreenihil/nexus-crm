import { describe, it, expect, beforeAll } from 'vitest';
import { createServer } from '../server.js';
import { db } from '../db/index.js';
import type { FastifyInstance } from 'fastify';

describe('Step 2: Clean Workspace Verification Test (§2.4)', () => {
  let app: FastifyInstance;
  let sessionId: string;
  let workspaceId: string;

  beforeAll(async () => {
    app = await createServer({ logger: false });
    await app.ready();

    // Sign up a fresh real tenant
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'founder.clean@example.com',
        password: 'SecurePassword123!',
        firstName: 'Alex',
        lastName: 'Vance',
        workspaceName: 'Sovereign Clean Workspace',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    sessionId = body.sessionId;
    workspaceId = body.workspace.id;
  });

  it('proves a fresh workspace has exactly zero business records (people = companies = deals = activities = quotes = 0)', async () => {
    const headers = { authorization: `Bearer ${sessionId}` };

    // 1. Query People
    const peopleRes = await app.inject({ method: 'GET', url: '/v1/records/people', headers });
    expect(peopleRes.statusCode).toBe(200);
    const peopleBody = JSON.parse(peopleRes.body);
    expect(peopleBody.records.length).toBe(0);

    // 2. Query Companies
    const companiesRes = await app.inject({ method: 'GET', url: '/v1/records/companies', headers });
    expect(companiesRes.statusCode).toBe(200);
    const companiesBody = JSON.parse(companiesRes.body);
    expect(companiesBody.records.length).toBe(0);

    // 3. Query Deals
    const dealsRes = await app.inject({ method: 'GET', url: '/v1/records/deals', headers });
    expect(dealsRes.statusCode).toBe(200);
    const dealsBody = JSON.parse(dealsRes.body);
    expect(dealsBody.records.length).toBe(0);

    // 4. Query Quotes
    const quotesRes = await app.inject({ method: 'GET', url: '/v1/cpq/quotes', headers });
    expect(quotesRes.statusCode).toBe(200);
    const quotes = JSON.parse(quotesRes.body);
    expect(quotes.length).toBe(0);

    // 5. Query Direct In-Memory Collections for this workspace
    const wsRecords = Array.from(db.records.values()).filter((r) => r.workspaceId === workspaceId);
    expect(wsRecords.length).toBe(0);

    const wsQuotes = Array.from(db.quotes.values()).filter((q) => q.workspaceId === workspaceId);
    expect(wsQuotes.length).toBe(0);

    const wsThreads = Array.from(db.threads.values()).filter((t) => t.workspaceId === workspaceId);
    expect(wsThreads.length).toBe(0);

    const wsCalls = Array.from(db.telephonyCalls.values()).filter((c) => c.workspaceId === workspaceId);
    expect(wsCalls.length).toBe(0);
  });

  it('proves system defaults are properly provisioned (4 standard objects, base INR currency, default pipeline)', async () => {
    const headers = { authorization: `Bearer ${sessionId}` };

    // 1. Objects Schema endpoint
    const schemaRes = await app.inject({ method: 'GET', url: '/v1/metadata/objects', headers });
    expect(schemaRes.statusCode).toBe(200);
    const objects = JSON.parse(schemaRes.body);
    const apiNames = objects.map((o: any) => o.apiName);
    expect(apiNames).toContain('companies');
    expect(apiNames).toContain('people');
    expect(apiNames).toContain('deals');
    expect(apiNames).toContain('activities');

    // 2. Workspace Currency default is INR
    const ws = db.workspaces.get(workspaceId);
    expect(ws?.baseCurrency).toBe('INR');
    expect(ws?.locale).toBe('en-IN');
  });
});
