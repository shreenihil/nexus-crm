import { describe, it, expect } from "vitest";
import {
  detectSmsOptOut,
  substituteTemplateVariables,
  stitchEmailThread,
  isWithinSendWindow,
  messageThreadSchema,
  messageSchema,
  sequenceSchema,
  telephonyCallSchema,
} from "../communication";

describe("Omnichannel Communication Engine — Schema & Utilities", () => {
  it("detects SMS opt-out keywords (STOP, UNSUBSCRIBE, CANCEL, QUIT, END)", () => {
    expect(detectSmsOptOut("STOP")).toBe(true);
    expect(detectSmsOptOut("stop")).toBe(true);
    expect(detectSmsOptOut("  Unsubscribe  ")).toBe(true);
    expect(detectSmsOptOut("CANCEL")).toBe(true);
    expect(detectSmsOptOut("quit")).toBe(true);
    expect(detectSmsOptOut("end")).toBe(true);

    // Non-opt-out messages
    expect(detectSmsOptOut("Sounds good, thank you!")).toBe(false);
    expect(detectSmsOptOut("Can you call me back?")).toBe(false);
    expect(detectSmsOptOut("")).toBe(false);
  });

  it("substitutes template variables correctly in email and SMS snippets", () => {
    const template =
      "Hi {{first_name}}, thanks for considering {{company}} for your {{deal_name}} proposal of ${{amount}}!";
    const variables = {
      first_name: "Tony",
      company: "Nexus CRM",
      deal_name: "Enterprise Cloud Migration",
      amount: 180000,
    };

    const result = substituteTemplateVariables(template, variables);
    expect(result).toBe(
      "Hi Tony, thanks for considering Nexus CRM for your Enterprise Cloud Migration proposal of $180000!",
    );
  });

  it("stitches inbound emails into existing threads by In-Reply-To, References, and Subject", () => {
    const threads = [
      {
        id: "thread-1",
        subject: "Quarterly Security Audit",
        messageIds: ["msg-101", "msg-102"],
      },
      {
        id: "thread-2",
        subject: "Enterprise Cloud Transformation",
        messageIds: ["msg-201"],
      },
    ];

    // Match by In-Reply-To
    const matchByReply = stitchEmailThread(
      "msg-102",
      undefined,
      undefined,
      threads,
    );
    expect(matchByReply).toBe("thread-1");

    // Match by References header
    const matchByRef = stitchEmailThread(
      undefined,
      ["msg-old", "msg-201"],
      undefined,
      threads,
    );
    expect(matchByRef).toBe("thread-2");

    // Match by Subject prefix (Re: / Fwd:)
    const matchBySubject = stitchEmailThread(
      undefined,
      undefined,
      "Re: Quarterly Security Audit",
      threads,
    );
    expect(matchBySubject).toBe("thread-1");

    // No match
    const noMatch = stitchEmailThread(
      "unknown-id",
      ["unknown-ref"],
      "New Inbound Topic",
      threads,
    );
    expect(noMatch).toBeNull();
  });

  it("evaluates business hours send-window correctly", () => {
    // Wednesday at 14:00 (2 PM) -> true
    const wednesdayWorkHour = new Date("2026-10-14T14:00:00Z");
    // Note: depends on local hours, test with explicit hour
    const date = new Date(2026, 9, 14, 11, 0, 0); // Oct 14 2026 is Wednesday
    expect(isWithinSendWindow(date, 9, 17)).toBe(true);

    const saturday = new Date(2026, 9, 17, 11, 0, 0); // Saturday
    expect(isWithinSendWindow(saturday, 9, 17)).toBe(false);

    const evening = new Date(2026, 9, 14, 21, 0, 0); // 9 PM
    expect(isWithinSendWindow(evening, 9, 17)).toBe(false);
  });

  it("validates schema structures for threads, messages, sequences, and telephony", () => {
    const thread = messageThreadSchema.parse({
      id: "01a143a8-7d4d-7f6f-9295-e1ce0c057e3f",
      workspaceId: "ws-1",
      subject: "Contract Negotiation",
      channel: "email",
      status: "open",
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(thread.status).toBe("open");

    const message = messageSchema.parse({
      id: "msg-1",
      threadId: thread.id,
      workspaceId: "ws-1",
      direction: "inbound",
      channel: "email",
      sender: { name: "Tony Stark", email: "tony@stark.com" },
      recipients: [{ name: "Alex Rivers", email: "alex@acme.corp" }],
      bodyText: "Let us proceed with the enterprise quote.",
      isInternalNote: false,
      createdAt: new Date().toISOString(),
    });
    expect(message.direction).toBe("inbound");

    const call = telephonyCallSchema.parse({
      id: "call-1",
      workspaceId: "ws-1",
      userId: "user-1",
      phoneNumber: "+1-555-0199",
      direction: "outbound",
      durationSeconds: 145,
      outcome: "connected",
      createdAt: new Date().toISOString(),
    });
    expect(call.durationSeconds).toBe(145);
  });
});
