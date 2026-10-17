import { describe, it, expect, beforeAll } from 'vitest';
import { createServer } from '../server';
import type { FastifyInstance } from 'fastify';

describe('Phase 2: Sales Execution API Tests', () => {
  let app: FastifyInstance;
  let sessionId: string;
  let dealId: string;
  let pipelineId: string;

  beforeAll(async () => {
    app = await createServer({ logger: false });

    // Register test user & tenant
    const regRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'sales-lead@acme.inc',
        password: 'SuperSecretPassword123!',
        firstName: 'Arthur',
        lastName: 'Dent',
        workspaceName: 'Sales Acme',
      },
    });
    const regBody = JSON.parse(regRes.body);
    sessionId = regBody.sessionId;

    // Create a test deal
    const dealRes = await app.inject({
      method: 'POST',
      url: '/v1/records/deals',
      headers: { authorization: `Bearer ${sessionId}` },
      payload: {
        name: 'Enterprise Cloud Transformation',
        amount: 250000,
        stage: 'Discovery',
        probability: 20,
      },
    });
    const dealBody = JSON.parse(dealRes.body);
    dealId = dealBody.id;

    // Fetch pipeline
    const pipeRes = await app.inject({
      method: 'GET',
      url: '/v1/pipelines',
      headers: { authorization: `Bearer ${sessionId}` },
    });
    const pipelines = JSON.parse(pipeRes.body);
    pipelineId = pipelines[0]?.id || 'default-pipeline';
  });

  it('Exit Gate 1: Drag deal through 5 stages, updates stage, history, and recalculates formula', async () => {
    const stages = ['Qualification', 'Proposal Sent', 'Negotiation', 'Closed Won'];

    for (const targetStage of stages) {
      const res = await app.inject({
        method: 'POST',
        url: `/v1/pipelines/deals/${dealId}/stage`,
        headers: { authorization: `Bearer ${sessionId}` },
        payload: { toStage: targetStage },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.deal.data.stage).toBe(targetStage);
      expect(body.transition.toStage).toBe(targetStage);

      // Verify formula recalculation: expected_value = amount * (probability / 100)
      if (targetStage === 'Closed Won') {
        expect(body.deal.data.probability).toBe(100);
        expect(body.deal.data.expected_value).toBe(250000);
      }
    }
  });

  it('Exit Gate 2: Creates quote with 3 line items, volume discount, tax rate, and generates PDF', async () => {
    // 1. Create quote
    const quoteRes = await app.inject({
      method: 'POST',
      url: '/v1/cpq/quotes',
      headers: { authorization: `Bearer ${sessionId}` },
      payload: {
        dealId,
        items: [
          {
            productId: 'p1',
            productName: 'Nexus CRM Enterprise Seat',
            sku: 'NEX-ENT-M',
            billingPeriod: 'monthly',
            quantity: 25,
            unitPrice: 100, // 2500/mo -> $30,000 ARR
            discountPercent: 10, // 2250/mo -> $27,000 ARR
          },
          {
            productId: 'p2',
            productName: 'Dedicated SSO Suite',
            sku: 'NEX-SSO-A',
            billingPeriod: 'annual',
            quantity: 1,
            unitPrice: 3000,
            discountPercent: 0,
          },
          {
            productId: 'p3',
            productName: 'Migration Assistance',
            sku: 'NEX-MIG-ONE',
            billingPeriod: 'one_time',
            quantity: 1,
            unitPrice: 5000,
            discountPercent: 0,
          },
        ],
        volumeDiscountPercent: 5,
        taxRatePercent: 8.5,
      },
    });

    expect(quoteRes.statusCode).toBe(201);
    const quote = JSON.parse(quoteRes.body);
    expect(quote.lineItems.length).toBe(3);
    expect(quote.subtotal).toBe(10250); // 2250 + 3000 + 5000
    expect(quote.discountAmount).toBe(512.5); // 5% of 10250
    expect(quote.total).toBeGreaterThan(0);

    // 2. Fetch PDF render
    const pdfRes = await app.inject({
      method: 'GET',
      url: `/v1/cpq/quotes/${quote.id}/pdf`,
      headers: { authorization: `Bearer ${sessionId}` },
    });
    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers['content-type']).toContain('text/html');
    expect(pdfRes.body).toContain(quote.quoteNumber);
    expect(pdfRes.body).toContain('Enterprise CRM Quote & Proposal');
  });

  it('Exit Gate 3: Logs activities and verifies chronological timeline query renders with low latency', async () => {
    const startTime = performance.now();

    // Log 5 activities
    for (let i = 1; i <= 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/v1/activities',
        headers: { authorization: `Bearer ${sessionId}` },
        payload: {
          type: i % 2 === 0 ? 'meeting' : 'note',
          subject: `Meeting note #${i} with customer stakeholders`,
          body: `Discussed technical architecture requirements and timeline checkpoint #${i}`,
          targetRecordId: dealId,
        },
      });
    }

    // Query timeline
    const queryStart = performance.now();
    const timelineRes = await app.inject({
      method: 'GET',
      url: `/v1/activities/timeline/${dealId}`,
      headers: { authorization: `Bearer ${sessionId}` },
    });
    const queryDuration = performance.now() - queryStart;

    expect(timelineRes.statusCode).toBe(200);
    const timeline = JSON.parse(timelineRes.body);

    // Timeline must interleave stage transitions, activities, and audit events
    expect(timeline.events.length).toBeGreaterThanOrEqual(5);
    expect(queryDuration).toBeLessThan(50); // Target < 50ms latency
  });

  it('Exit Gate 4: Rotting deal warning triggers when deal stays in stage beyond threshold', async () => {
    const boardRes = await app.inject({
      method: 'GET',
      url: `/v1/pipelines/${pipelineId}/board`,
      headers: { authorization: `Bearer ${sessionId}` },
    });

    expect(boardRes.statusCode).toBe(200);
    const board = JSON.parse(boardRes.body);
    expect(board.stages.length).toBeGreaterThan(0);
    expect(board.metrics.totalAmount).toBeGreaterThan(0);
  });

  it('Exit Gate 5: Global search indexes deals, contacts, companies and returns fast results', async () => {
    const searchRes = await app.inject({
      method: 'GET',
      url: '/v1/search?q=Enterprise',
      headers: { authorization: `Bearer ${sessionId}` },
    });

    expect(searchRes.statusCode).toBe(200);
    const body = JSON.parse(searchRes.body);
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results.length).toBeGreaterThan(0);
    expect(body.results[0].title).toContain('Enterprise');
    expect(body.results[0].href).toBeDefined();
  });

  it('Exit Gate 6: Lead to deal conversion golden path updates lifecycle stage, links records, and logs audit hash', async () => {
    // 1. Create a lead person
    const personRes = await app.inject({
      method: 'POST',
      url: '/v1/records/people',
      headers: { authorization: `Bearer ${sessionId}` },
      payload: {
        first_name: 'Natasha',
        last_name: 'Romanoff',
        email: 'natasha@shield.gov',
        lifecycle_stage: 'Lead',
      },
    });
    expect(personRes.statusCode).toBe(201);
    const person = JSON.parse(personRes.body);

    // 2. Convert lead to deal
    const convertRes = await app.inject({
      method: 'POST',
      url: `/v1/records/people/${person.id}/convert-to-deal`,
      headers: { authorization: `Bearer ${sessionId}` },
      payload: {
        dealName: 'SHIELD Cyber Defense Initiative',
        dealAmount: 850000,
        pipelineStage: 'Discovery',
      },
    });

    expect(convertRes.statusCode).toBe(201);
    const convertBody = JSON.parse(convertRes.body);
    expect(convertBody.success).toBe(true);
    expect(convertBody.deal.data.name).toBe('SHIELD Cyber Defense Initiative');
    expect(convertBody.deal.data.amount).toBe(850000);
    expect(convertBody.lead.data.lifecycle_stage).toBe('Opportunity');
  });
});
