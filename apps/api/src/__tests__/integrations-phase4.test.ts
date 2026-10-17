import { describe, it, expect, beforeAll } from 'vitest';
import { createServer } from '../server';
import { db } from '../db/index';
import type { FastifyInstance } from 'fastify';

describe('Phase 4: Integrations & Events Exit Gate Verification', () => {
  let app: FastifyInstance;
  let sessionId: string;
  let workspaceId: string;
  let createdWebhookId: string;
  let dlqItemId: string;
  let aacConnectionId: string;

  beforeAll(async () => {
    app = await createServer({ logger: false });

    // Seed demo data
    await db.seedDemoData(true);

    // Register test admin user & tenant
    const regRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'integrations-admin@acme.inc',
        password: 'SuperSecretPassword123!',
        firstName: 'Nikola',
        lastName: 'Tesla',
        workspaceName: 'Wardenclyffe Integrations',
      },
    });
    const regBody = JSON.parse(regRes.body);
    sessionId = regBody.sessionId;
    workspaceId = regBody.workspace.id;
  });

  // =========================================================================
  // GATE 1: SSRF PROTECTION TESTS
  // =========================================================================
  describe('Gate 1: SSRF Protection Tests (ASVS L2 / §7.3)', () => {
    const forbiddenUrls = [
      { url: 'http://127.0.0.1:8080/admin', reason: 'Loopback IPv4' },
      { url: 'http://localhost/server-status', reason: 'Localhost alias' },
      { url: 'http://169.254.169.254/latest/meta-data/', reason: 'Cloud instance metadata IP' },
      { url: 'http://10.0.0.1/internal-api', reason: 'RFC 1918 10.0.0.0/8' },
      { url: 'http://172.16.0.5/api', reason: 'RFC 1918 172.16.0.0/12' },
      { url: 'http://192.168.1.1/router', reason: 'RFC 1918 192.168.0.0/16' },
      { url: 'http://[::1]/debug', reason: 'Loopback IPv6' },
      { url: 'file:///etc/passwd', reason: 'File URI scheme' },
      { url: 'gopher://127.0.0.1:6379/_INFO', reason: 'Gopher scheme' },
    ];

    for (const testCase of forbiddenUrls) {
      it(`blocks dangerous target URL: ${testCase.url} (${testCase.reason})`, async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/v1/webhooks/validate-url',
          payload: { url: testCase.url },
        });

        expect(res.statusCode).toBe(400);
        const body = JSON.parse(res.body);
        expect(body.isSsrfBlocked).toBe(true);
        expect(body.error).toContain('SSRF Protection Blocked Request');
      });
    }

    it('rejects creating outbound webhook subscription pointing to loopback address', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/outbound',
        headers: { authorization: `Bearer ${sessionId}` },
        payload: {
          targetUrl: 'http://127.0.0.1:9000/internal-hook',
          subscribedEvents: ['deal.won'],
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.isSsrfBlocked).toBe(true);
    });

    it('allows verified safe public outbound URLs', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/validate-url',
        payload: { url: 'https://webhook.site/nexus-test-gateway' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.safe).toBe(true);
    });
  });

  // =========================================================================
  // GATE 2: WEBHOOK CHAOS TEST (BACKOFF, JITTER & DLQ DROP)
  // =========================================================================
  describe('Gate 2: Webhook Chaos Test (Outbox, Retries, Backoff & DLQ)', () => {
    it('creates an outbound webhook subscription for chaos testing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/outbound',
        headers: { authorization: `Bearer ${sessionId}` },
        payload: {
          targetUrl: 'https://webhook.site/chaos-receiver',
          secret: 'whsec_chaos_test_secret_key_888',
          subscribedEvents: ['deal.won', 'order.provisioned'],
          description: 'Chaos Delivery Test Target',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.subscription.id).toBeDefined();
      createdWebhookId = body.subscription.id;
    });

    it('simulates flaky webhook failure: records backoff attempts and routes to DLQ', async () => {
      const chaosPayload = {
        dealId: 'deal-acme-satellite-99',
        name: 'Deep Space Telemetry Contract',
        amount: 450000,
        currency: 'INR',
      };

      // Trigger chaos dispatch: simulated HTTP 503 with timeout & 3 max attempts
      const res = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/chaos/dispatch',
        headers: { authorization: `Bearer ${sessionId}` },
        payload: {
          event: 'deal.won',
          payload: chaosPayload,
          chaosFail: true,
          chaosStatusCode: 503,
          chaosError: 'HTTP 503: Upstream service capacity exceeded',
          maxAttempts: 3,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);

      // 1. Transactional Outbox State
      expect(body.outboxEvent).toBeDefined();
      expect(body.outboxEvent.status).toBe('DLQ');
      expect(body.outboxEvent.attempts).toBe(3);
      expect(body.outboxEvent.error).toContain('HTTP 503');

      // 2. Delivery Attempts Logged
      expect(body.deliveriesCount).toBe(3);

      // 3. DLQ Item Generated
      expect(body.dlqItemsCount).toBe(1);
      expect(body.dlqItems[0].status).toBe('PENDING');
      expect(body.dlqItems[0].attempts).toBe(3);
      expect(body.dlqItems[0].lastStatusCode).toBe(503);
      expect(body.dlqItems[0].targetUrl).toBe('https://webhook.site/chaos-receiver');

      dlqItemId = body.dlqItems[0].id;
    });
  });

  // =========================================================================
  // GATE 3: DEAD-LETTER QUEUE (DLQ) REPLAY
  // =========================================================================
  describe('Gate 3: Dead-Letter Queue (DLQ) Single & Bulk Replay', () => {
    it('lists items in the Dead-Letter Queue with failure diagnostics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/webhooks/dlq',
        headers: { authorization: `Bearer ${sessionId}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items.length).toBeGreaterThanOrEqual(1);

      const targetItem = body.items.find((i: any) => i.id === dlqItemId);
      expect(targetItem).toBeDefined();
      expect(targetItem.status).toBe('PENDING');
      expect(targetItem.lastError).toContain('HTTP 503');
      expect(targetItem.responseSnippet).toBeDefined();
    });

    it('replays a single failed event from DLQ after endpoint recovery', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/v1/webhooks/dlq/${dlqItemId}/replay`,
        headers: { authorization: `Bearer ${sessionId}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.item.status).toBe('REPLAYED');
      expect(body.item.replayedAt).toBeDefined();

      // Successful delivery log created
      expect(body.delivery).toBeDefined();
      expect(body.delivery.status).toBe('SUCCESS');
      expect(body.delivery.statusCode).toBe(200);
      expect(body.delivery.signature).toMatch(/^sha256=[a-f0-9]{64}$/);

      // Check DB outbox event status is now DELIVERED
      const dlqItem = db.deadLetterQueue.get(dlqItemId)!;
      if (dlqItem.outboxEventId) {
        const outbox = db.outboxEvents.get(dlqItem.outboxEventId);
        expect(outbox?.status).toBe('DELIVERED');
      }

      // Check audit chain integrity remains intact
      expect(db.verifyAuditChainIntegrity()).toBe(true);
    });

    it('performs bulk replay of pending DLQ items', async () => {
      // Seed a pending item for bulk test
      const seedDlqId = 'dlq-bulk-test-1';
      db.deadLetterQueue.set(seedDlqId, {
        id: seedDlqId,
        workspaceId,
        subscriptionId: createdWebhookId,
        targetUrl: 'https://webhook.site/chaos-receiver',
        event: 'order.provisioned',
        payload: { orderId: 'ord-8877' },
        attempts: 3,
        lastStatusCode: 504,
        lastError: 'Gateway Timeout',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/dlq/replay-all',
        headers: { authorization: `Bearer ${sessionId}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.replayedCount).toBeGreaterThanOrEqual(1);
      expect(body.replayedIds).toContain(seedDlqId);

      const replayedItem = db.deadLetterQueue.get(seedDlqId);
      expect(replayedItem?.status).toBe('REPLAYED');
    });
  });

  // =========================================================================
  // GATE 4: AUTOMATIC ACTIVITY CAPTURE (AAC) MAILBOX SYNC
  // =========================================================================
  describe('Gate 4: Automatic Activity Capture (AAC) Mailbox Sync', () => {
    it('connects Google Workspace test mailbox with KMS encrypted token and privacy rules', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/integrations/aac/connect',
        headers: { authorization: `Bearer ${sessionId}` },
        payload: {
          provider: 'google',
          email: 'alex@acme.corp',
          token: 'ya29.sample_oauth_access_token_google_workspace',
          privacySettings: {
            excludeInternalDomains: ['acme.corp', 'acme.inc'],
            excludeLabels: ['Personal', 'Spam', 'Receipts'],
            shareLevel: 'full',
          },
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.connection.id).toBeDefined();
      expect(body.connection.provider).toBe('google');
      expect(body.connection.status).toBe('CONNECTED');
      expect(body.connection.accessTokenEncrypted).toContain('enc_kms_');
      expect(body.connection.privacySettings.excludeInternalDomains).toContain('acme.corp');

      aacConnectionId = body.connection.id;
    });

    it('syncs test mailbox: associates contact, company & deal, and excludes internal emails', async () => {
      // Create a test contact in Wardenclyffe workspace
      const contactRes = await app.inject({
        method: 'POST',
        url: '/v1/records/people',
        headers: { authorization: `Bearer ${sessionId}` },
        payload: {
          first_name: 'Tony',
          last_name: 'Stark',
          email: 'tony@starkindustries.com',
          company: 'Stark Industries',
        },
      });
      const contact = JSON.parse(contactRes.body);

      // Create a test company
      const companyRes = await app.inject({
        method: 'POST',
        url: '/v1/records/companies',
        headers: { authorization: `Bearer ${sessionId}` },
        payload: {
          name: 'Stark Industries',
          domain: 'starkindustries.com',
        },
      });
      const company = JSON.parse(companyRes.body);

      // Create an active deal
      await app.inject({
        method: 'POST',
        url: '/v1/records/deals',
        headers: { authorization: `Bearer ${sessionId}` },
        payload: {
          name: 'Stark Defense Cloud Modernization',
          amount: 500000,
          stage: 'Proposal Sent',
        },
      });

      const testEmails = [
        // 1. External email from Tony Stark -> MUST associate with Tony Stark and Stark Industries
        {
          id: 'mail-ext-stark-1',
          from: 'tony@starkindustries.com',
          to: ['alex@acme.corp'],
          subject: 'Review of Cloud Architecture Enclave Terms',
          body: 'Hi Alex, security review is approved. Proceeding with KMS envelope deployment.',
          date: new Date().toISOString(),
        },
        // 2. Purely internal email -> MUST be filtered out by privacy exclusion
        {
          id: 'mail-int-hr-2',
          from: 'hr@acme.corp',
          to: ['alex@acme.corp'],
          subject: 'Quarterly Team All-Hands and Townhall',
          body: 'Reminder regarding the company-wide townhall scheduled for Friday at 3 PM.',
          date: new Date().toISOString(),
        },
      ];

      const syncRes = await app.inject({
        method: 'POST',
        url: '/v1/integrations/aac/sync',
        headers: { authorization: `Bearer ${sessionId}` },
        payload: {
          connectionId: aacConnectionId,
          testEmails,
        },
      });

      expect(syncRes.statusCode).toBe(200);
      const syncBody = JSON.parse(syncRes.body);

      // Verify sync results
      expect(syncBody.ok).toBe(true);
      expect(syncBody.syncedCount).toBe(1); // Only the external Stark email synced
      expect(syncBody.excludedInternalCount).toBe(1); // Internal email excluded by privacy filter

      // Verify deterministic associations
      expect(syncBody.associatedPeople).toContain(contact.id);
      expect(syncBody.associatedCompanies).toContain(company.id);

      // Verify connection sync metrics updated
      expect(syncBody.connection.syncedEmailsCount).toBeGreaterThanOrEqual(1);
      expect(syncBody.connection.lastSyncedAt).toBeDefined();
      expect(syncBody.connection.deltaToken).toBeDefined();
    });

    it('queries AAC connection status', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/integrations/aac/status',
        headers: { authorization: `Bearer ${sessionId}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.activeConnection).toBeDefined();
      expect(body.activeConnection.id).toBe(aacConnectionId);
      expect(body.activeConnection.status).toBe('CONNECTED');
    });

    it('safely disconnects AAC provider', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/integrations/aac/disconnect',
        headers: { authorization: `Bearer ${sessionId}` },
        payload: { connectionId: aacConnectionId },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.connection.status).toBe('DISCONNECTED');
    });
  });
});
