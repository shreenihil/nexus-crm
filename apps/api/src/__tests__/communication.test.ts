import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createServer } from "../server.js";
import { db } from "../db/index.js";
import type { FastifyInstance } from "fastify";

describe("Phase 3 Omnichannel Communication Engine API", () => {
  let app: FastifyInstance;
  const ownerHeaders = {
    authorization: "Bearer demo-session-token",
  };

  beforeAll(async () => {
    app = await createServer({ logger: false });
    await app.ready();
  });

  beforeEach(async () => {
    await db.seedDemoData(true);
  });

  describe("1. Shared Inbox & Threads API", () => {
    it("returns threads list with proper channels, status, unread counts and SLA countdown", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/v1/inbox/threads",
        headers: ownerHeaders,
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(Array.isArray(json.threads)).toBe(true);
      expect(json.threads.length).toBeGreaterThanOrEqual(3);

      const emailThread = json.threads.find((t: any) => t.channel === "email");
      expect(emailThread).toBeDefined();
      expect(emailThread.subject).toContain(
        "Enterprise Cloud Transformation Scope",
      );
      expect(emailThread.status).toBe("open");
      expect(emailThread.slaDueAt).toBeDefined();
    });

    it("filters threads by channel and search query", async () => {
      const smsRes = await app.inject({
        method: "GET",
        url: "/v1/inbox/threads?channel=sms",
        headers: ownerHeaders,
      });

      expect(smsRes.statusCode).toBe(200);
      const smsJson = JSON.parse(smsRes.body);
      expect(smsJson.threads.every((t: any) => t.channel === "sms")).toBe(true);

      const searchRes = await app.inject({
        method: "GET",
        url: "/v1/inbox/threads?search=Security",
        headers: ownerHeaders,
      });

      expect(searchRes.statusCode).toBe(200);
      const searchJson = JSON.parse(searchRes.body);
      expect(searchJson.threads.length).toBeGreaterThanOrEqual(1);
      expect(searchJson.threads[0].subject).toContain("Security");
    });

    it("returns thread detail with messages, contact info, and DNC status", async () => {
      const detailRes = await app.inject({
        method: "GET",
        url: "/v1/inbox/threads/th-stark-email-1",
        headers: ownerHeaders,
      });

      expect(detailRes.statusCode).toBe(200);
      const detailJson = JSON.parse(detailRes.body);
      const { thread, messages, contact, preferences } = detailJson;
      expect(thread.id).toBe("th-stark-email-1");
      expect(messages.length).toBeGreaterThanOrEqual(3);
      expect(contact.first_name).toBe("Tony");
      expect(preferences.emailOptOut).toBe(false);

      // Verify internal note is in messages
      const note = messages.find((m: any) => m.isInternalNote);
      expect(note).toBeDefined();
      expect(note.bodyText).toContain("Spoke with engineering lead");
    });

    it("allows posting an outbound email and logs timeline activity", async () => {
      const msgRes = await app.inject({
        method: "POST",
        url: "/v1/inbox/threads/th-stark-email-1/messages",
        headers: ownerHeaders,
        payload: {
          body: "Hello Tony, your enterprise enclave has been provisioned.",
          isInternalNote: false,
          channel: "email",
        },
      });

      expect(msgRes.statusCode).toBe(201);
      const msgJson = JSON.parse(msgRes.body);
      expect(msgJson.direction).toBe("outbound");
      expect(msgJson.bodyText).toContain(
        "enterprise enclave has been provisioned",
      );

      // Verify thread now has this message
      const threadRes = await app.inject({
        method: "GET",
        url: "/v1/inbox/threads/th-stark-email-1",
        headers: ownerHeaders,
      });
      const threadJson = JSON.parse(threadRes.body);
      const lastMsg = threadJson.messages.slice(-1)[0];
      expect(lastMsg.bodyText).toContain(
        "enterprise enclave has been provisioned",
      );
    });

    it("allows posting an internal note visible only to staff", async () => {
      const noteRes = await app.inject({
        method: "POST",
        url: "/v1/inbox/threads/th-stark-email-1/messages",
        headers: ownerHeaders,
        payload: {
          body: "Internal audit: Deal is high probability. Fast-track approval.",
          isInternalNote: true,
        },
      });

      expect(noteRes.statusCode).toBe(201);
      const noteJson = JSON.parse(noteRes.body);
      expect(noteJson.isInternalNote).toBe(true);
      expect(noteJson.channel).toBe("internal_note");
    });

    it("patches thread status to resolved or re-opened", async () => {
      const patchRes = await app.inject({
        method: "PATCH",
        url: "/v1/inbox/threads/th-stark-email-1",
        headers: ownerHeaders,
        payload: { status: "resolved" },
      });

      expect(patchRes.statusCode).toBe(200);
      const patchJson = JSON.parse(patchRes.body);
      expect(patchJson.status).toBe("resolved");
    });
  });

  describe("2. Inbound Email Webhook & Thread Stitching", () => {
    it("stitches inbound reply into existing thread using In-Reply-To header", async () => {
      const webhookRes = await app.inject({
        method: "POST",
        url: "/v1/webhooks/inbound/email",
        payload: {
          from: "tony@starkindustries.com",
          to: "alex@acme.corp",
          subject: "Re: Enterprise Cloud Transformation Scope",
          html: "<p>Thanks for the update. How soon can it ship?</p>",
          text: "Thanks for the update. How soon can it ship?",
          inReplyTo: "msg-stark-1",
        },
      });

      expect(webhookRes.statusCode).toBe(201);
      const webhookJson = JSON.parse(webhookRes.body);
      expect(webhookJson.success).toBe(true);
      expect(webhookJson.threadId).toBe("th-stark-email-1");

      // Check thread detail has the new inbound reply
      const threadRes = await app.inject({
        method: "GET",
        url: "/v1/inbox/threads/th-stark-email-1",
        headers: ownerHeaders,
      });
      const threadJson = JSON.parse(threadRes.body);
      const messages = threadJson.messages;
      const inboundMsg = messages.find((m: any) =>
        m.bodyText.includes("How soon can it ship?"),
      );
      expect(inboundMsg).toBeDefined();
      expect(inboundMsg.direction).toBe("inbound");
    });

    it("automatically un-enrolls contact from drip sequence when an inbound reply is received", async () => {
      // Send inbound email from Bruce Wayne (bruce@waynecorp.com) who is enrolled in seq-enterprise-outbound
      const enrollmentsBefore = Array.from(
        db.sequenceEnrollments.values(),
      ).filter((e) => e.contactEmail === "bruce@waynecorp.com");
      expect(enrollmentsBefore.length).toBeGreaterThan(0);
      expect(enrollmentsBefore[0]!.status).toBe("running");

      await app.inject({
        method: "POST",
        url: "/v1/webhooks/inbound/email",
        payload: {
          from: "bruce@waynecorp.com",
          to: "alex@acme.corp",
          subject: "Re: Technical Briefing",
          text: "We reviewed the briefing and would like to proceed with the proof-of-concept.",
        },
      });

      // Enrollment should now be canceled due to reply
      const enrollmentsAfter = Array.from(
        db.sequenceEnrollments.values(),
      ).filter((e) => e.contactEmail === "bruce@waynecorp.com");
      expect(enrollmentsAfter.length).toBeGreaterThan(0);
      expect(enrollmentsAfter[0]!.status).toBe("canceled_reply");
    });
  });

  describe("3. Inbound SMS Webhook & DNC / STOP Opt-Out Enforcement", () => {
    it("detects STOP keyword, sets SMS opt-out preference, cancels sequences, and auto-replies", async () => {
      const smsWebhookRes = await app.inject({
        method: "POST",
        url: "/v1/webhooks/inbound/sms",
        payload: {
          from: "+1-212-555-0144", // Bruce Wayne
          to: "+1-800-555-0100",
          body: "Please STOP sending me messages.",
        },
      });

      expect(smsWebhookRes.statusCode).toBe(201);
      const smsJson = JSON.parse(smsWebhookRes.body);
      expect(smsJson.isOptOut).toBe(true);
      expect(smsJson.autoReply).toContain("successfully opted out");

      // Verify communication preference is updated to opt-out
      const contact = Array.from(db.records.values()).find(
        (r) => r.data.phone === "+1-212-555-0144",
      );
      expect(contact).toBeDefined();

      const prefRes = await app.inject({
        method: "GET",
        url: `/v1/communication/preferences/${contact!.id}`,
        headers: ownerHeaders,
      });
      expect(prefRes.statusCode).toBe(200);
      const prefJson = JSON.parse(prefRes.body);
      expect(prefJson.smsOptOut).toBe(true);

      // Verify that subsequent outbound SMS is blocked with 403 DNC error
      const sendBlockedRes = await app.inject({
        method: "POST",
        url: "/v1/inbox/threads/th-wayne-sms-1/messages",
        headers: ownerHeaders,
        payload: {
          body: "Hey Bruce, checking back in on the Batmobile armour specs.",
          channel: "sms",
        },
      });

      expect(sendBlockedRes.statusCode).toBe(403);
      const blockedJson = JSON.parse(sendBlockedRes.body);
      expect(blockedJson.error).toContain(
        "opted out of SMS messages (DNC active)",
      );
    });
  });

  describe("4. Telephony & Click-to-Call API", () => {
    it("initiates a call, ends the call with outcome notes, and logs to timeline", async () => {
      const thread = db.threads.get("th-stark-email-1");
      expect(thread).toBeDefined();
      const dealId = thread!.dealId!;
      expect(dealId).toBeDefined();

      // 1. Initiate call
      const initRes = await app.inject({
        method: "POST",
        url: "/v1/telephony/calls",
        headers: ownerHeaders,
        payload: {
          contactId: thread!.contactId,
          dealId,
          phoneNumber: "+1-212-555-0144",
        },
      });

      expect(initRes.statusCode).toBe(201);
      const initJson = JSON.parse(initRes.body);
      expect(initJson.callId).toBeDefined();
      expect(initJson.status).toBe("connected");

      // 2. End call with disposition outcome
      const endRes = await app.inject({
        method: "POST",
        url: `/v1/telephony/calls/${initJson.callId}/end`,
        headers: ownerHeaders,
        payload: {
          outcome: "connected",
          durationSeconds: 145,
          notes:
            "Spoke with client regarding enterprise license delivery. Follow-up quote sent.",
          dealId,
        },
      });

      expect(endRes.statusCode).toBe(200);
      const endJson = JSON.parse(endRes.body);
      expect(endJson.outcome).toBe("connected");
      expect(endJson.durationSeconds).toBe(145);
      expect(endJson.direction).toBe("outbound");

      // 3. Verify activity timeline has this call
      const timelineRes = await app.inject({
        method: "GET",
        url: `/v1/activities/timeline/${dealId}`,
        headers: ownerHeaders,
      });
      expect(timelineRes.statusCode).toBe(200);
      const timelineJson = JSON.parse(timelineRes.body);
      const callActivity = timelineJson.events.find(
        (a: any) => a.type === "call" && a.body.includes("license delivery"),
      );
      expect(callActivity).toBeDefined();
    });
  });

  describe("5. Canned Snippets & Variable Substitution", () => {
    it("returns canned snippets list and creates new snippet", async () => {
      const getRes = await app.inject({
        method: "GET",
        url: "/v1/inbox/snippets",
        headers: ownerHeaders,
      });

      expect(getRes.statusCode).toBe(200);
      const snippets = JSON.parse(getRes.body);
      expect(snippets.length).toBeGreaterThanOrEqual(3);
      const intro = snippets.find((s: any) => s.shortcut === "!intro");
      expect(intro).toBeDefined();
      expect(intro.body).toContain("{{first_name}}");

      const createRes = await app.inject({
        method: "POST",
        url: "/v1/inbox/snippets",
        headers: ownerHeaders,
        payload: {
          title: "Discount Offer",
          shortcut: "!discount",
          body: "Hi {{first_name}}, we are pleased to offer a 15% discount for {{company}}.",
          category: "Sales",
        },
      });

      expect(createRes.statusCode).toBe(201);
      const createJson = JSON.parse(createRes.body);
      expect(createJson.shortcut).toBe("!discount");
    });
  });
});
