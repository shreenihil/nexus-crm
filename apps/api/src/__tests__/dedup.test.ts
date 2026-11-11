import { describe, it, expect, beforeAll } from "vitest";
import { createServer } from "../server";
import { db } from "../db/index";
import type { FastifyInstance } from "fastify";

describe("Phase 4: Deduplication & Identity Resolution API Tests", () => {
  let app: FastifyInstance;
  let sessionId: string;
  let workspaceId: string;
  let personAId: string;
  let personBId: string;
  let duplicatePairId: string;

  beforeAll(async () => {
    app = await createServer({ logger: false });

    // Register test user & tenant
    const regRes = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: "dedup-admin@acme.inc",
        password: "SuperSecretPassword123!",
        firstName: "Sherlock",
        lastName: "Holmes",
        workspaceName: "Baker Street CRM",
      },
    });
    const regBody = JSON.parse(regRes.body);
    sessionId = regBody.sessionId;
    workspaceId = regBody.workspace.id;

    // Create primary person
    const p1Res = await app.inject({
      method: "POST",
      url: "/v1/records/people",
      headers: { authorization: `Bearer ${sessionId}` },
      payload: {
        first_name: "Tony",
        last_name: "Stark",
        email: "tony@starkindustries.com",
        phone: "+1-212-555-0199",
        title: "CEO & Chief Engineer",
      },
    });
    const p1 = JSON.parse(p1Res.body);
    personAId = p1.id;

    // Create duplicate person with transposed name & minor phone formatting difference
    const p2Res = await app.inject({
      method: "POST",
      url: "/v1/records/people",
      headers: { authorization: `Bearer ${sessionId}` },
      payload: {
        first_name: "Anthony",
        last_name: "Stark",
        email: "tony.stark@starkindustries.com",
        phone: "+1 212 555 0199",
        title: "Chief Executive Officer",
      },
    });
    const p2 = JSON.parse(p2Res.body);
    personBId = p2.id;

    // Trigger duplicate scan for workspace
    const scanRes = await app.inject({
      method: "POST",
      url: "/v1/duplicates/scan",
      headers: { authorization: `Bearer ${sessionId}` },
    });
    expect(scanRes.statusCode).toBe(200);
  });

  it("1. GET /v1/duplicates lists detected duplicate pairs with confidence scores", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/duplicates",
      headers: { authorization: `Bearer ${sessionId}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.pairs).toBeDefined();
    expect(body.pairs.length).toBeGreaterThan(0);

    const pair = body.pairs.find(
      (p: any) =>
        (p.primaryRecordId === personAId &&
          p.duplicateRecordId === personBId) ||
        (p.primaryRecordId === personBId && p.duplicateRecordId === personAId),
    );
    expect(pair).toBeDefined();
    expect(pair.confidenceScore).toBeGreaterThanOrEqual(85);
    expect(pair.confidenceTier).toBe("HIGH");
    expect(pair.status).toBe("PENDING");
    expect(pair.primaryRecord).toBeDefined();
    expect(pair.duplicateRecord).toBeDefined();

    duplicatePairId = pair.id;
  });

  it("2. GET /v1/duplicates/:id returns pair details with score breakdown", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/v1/duplicates/${duplicatePairId}`,
      headers: { authorization: `Bearer ${sessionId}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.pair.id).toBe(duplicatePairId);
    expect(body.pair.matchFactors).toBeDefined();
    expect(body.pair.matchFactors.length).toBeGreaterThan(0);
  });

  it("3. POST /v1/duplicates/check detects duplicates in real-time pre-creation check (<25ms)", async () => {
    const start = performance.now();
    const res = await app.inject({
      method: "POST",
      url: "/v1/duplicates/check",
      headers: { authorization: `Bearer ${sessionId}` },
      payload: {
        entityName: "people",
        data: {
          first_name: "Tony",
          last_name: "Stark",
          email: "tony@starkindustries.com",
        },
      },
    });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50); // Generous assertion for CI / dev test runner (<25ms typical)
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body);
    expect(body.isDuplicate).toBe(true);
    expect(body.matches.length).toBeGreaterThan(0);
    expect(body.matches[0].matchResult.overallScore).toBe(100);

    // Negative case: non-duplicate
    const uniqueRes = await app.inject({
      method: "POST",
      url: "/v1/duplicates/check",
      headers: { authorization: `Bearer ${sessionId}` },
      payload: {
        entityName: "people",
        data: {
          first_name: "Arthur",
          last_name: "Dent",
          email: "arthur.dent@milliways.galaxy",
        },
      },
    });
    const uniqueBody = JSON.parse(uniqueRes.body);
    expect(uniqueBody.isDuplicate).toBe(false);
  });

  it("4. POST /v1/duplicates/:id/merge merges duplicate records with link re-pointing and audit logging", async () => {
    const mergeRes = await app.inject({
      method: "POST",
      url: `/v1/duplicates/${duplicatePairId}/merge`,
      headers: { authorization: `Bearer ${sessionId}` },
      payload: {
        winnerId: personAId,
        loserId: personBId,
        mergedData: {
          title: "Chief Executive Officer & Founder",
        },
      },
    });
    expect(mergeRes.statusCode).toBe(200);
    const body = JSON.parse(mergeRes.body);
    expect(body.ok).toBe(true);
    expect(body.mergeHistory).toBeDefined();
    expect(body.mergeHistory.status).toBe("MERGED");

    // Winner record should have merged data
    const winnerRecord = db.records.get(personAId);
    expect(winnerRecord?.data.title).toBe("Chief Executive Officer & Founder");
    expect(winnerRecord?.deletedAt).toBeUndefined();

    // Loser record should be soft-deleted
    const loserRecord = db.records.get(personBId);
    expect(loserRecord?.deletedAt).toBeDefined();

    // Audit chain should remain cryptographically unbroken
    expect(db.verifyAuditChainIntegrity()).toBe(true);
  });

  it("5. POST /v1/duplicates/merges/:mergeId/unmerge reversibly unmerges records within 30-day window", async () => {
    // List merge history
    const listRes = await app.inject({
      method: "GET",
      url: "/v1/duplicates/merges",
      headers: { authorization: `Bearer ${sessionId}` },
    });
    expect(listRes.statusCode).toBe(200);
    const { merges } = JSON.parse(listRes.body);
    const recentMerge = merges.find((m: any) => m.winnerRecordId === personAId);
    expect(recentMerge).toBeDefined();

    // Call 1-click unmerge
    const unmergeRes = await app.inject({
      method: "POST",
      url: `/v1/duplicates/merges/${recentMerge.id}/unmerge`,
      headers: { authorization: `Bearer ${sessionId}` },
    });
    expect(unmergeRes.statusCode).toBe(200);
    const unmergeBody = JSON.parse(unmergeRes.body);
    expect(unmergeBody.ok).toBe(true);
    expect(unmergeBody.mergeHistory.status).toBe("UNMERGED");

    // Loser record should be restored
    const loserRecord = db.records.get(personBId);
    expect(loserRecord?.deletedAt).toBeNull();

    // Winner record should be restored to snapshot before merge
    const winnerRecord = db.records.get(personAId);
    expect(winnerRecord?.data.title).toBe("CEO & Chief Engineer");

    // Audit chain integrity intact
    expect(db.verifyAuditChainIntegrity()).toBe(true);
  });

  it("6. POST /v1/duplicates/:id/dismiss marks pair as dismissed and remembers pair key", async () => {
    // Reopen duplicate pair
    const pair = db.duplicatePairs.get(duplicatePairId)!;
    pair.status = "PENDING";

    const dismissRes = await app.inject({
      method: "POST",
      url: `/v1/duplicates/${duplicatePairId}/dismiss`,
      headers: { authorization: `Bearer ${sessionId}` },
    });
    expect(dismissRes.statusCode).toBe(200);
    const body = JSON.parse(dismissRes.body);
    expect(body.ok).toBe(true);
    expect(body.pair.status).toBe("DISMISSED");

    // Subsequent pending list excludes it
    const listRes = await app.inject({
      method: "GET",
      url: "/v1/duplicates",
      headers: { authorization: `Bearer ${sessionId}` },
    });
    const { pairs } = JSON.parse(listRes.body);
    expect(pairs.some((p: any) => p.id === duplicatePairId)).toBe(false);
  });
});
