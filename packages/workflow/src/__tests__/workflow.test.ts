import { describe, it, expect } from "vitest";
import { validateWorkflowDAG, WorkflowNode } from "../dag/validator.js";
import {
  signWebhookPayload,
  verifyWebhookSignature,
} from "../webhooks/signer.js";
import {
  executeWorkflowDAG,
  WorkflowExecutionContext,
} from "../engine/executor.js";

describe("Workflow DAG Validation & Cycle Detection", () => {
  it("detects and rejects cyclical loops in workflow graphs", () => {
    const cyclicNodes: WorkflowNode[] = [
      {
        id: "node-trigger",
        type: "trigger",
        title: "Deal Created",
        config: {},
        nextNodes: ["node-action-1"],
      },
      {
        id: "node-action-1",
        type: "action",
        title: "Send Notification",
        config: {},
        nextNodes: ["node-action-2"],
      },
      {
        id: "node-action-2",
        type: "action",
        title: "Update Record",
        config: {},
        nextNodes: ["node-action-1"], // Loop back to action-1!
      },
    ];

    const result = validateWorkflowDAG(cyclicNodes, "node-trigger");
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Cycle detected"))).toBe(true);
  });

  it("validates a valid multi-branch acyclic workflow graph", () => {
    const validNodes: WorkflowNode[] = [
      {
        id: "trigger-1",
        type: "trigger",
        title: "Lead Ingested",
        config: {},
        nextNodes: ["condition-enterprise"],
      },
      {
        id: "condition-enterprise",
        type: "condition",
        title: "Is Enterprise Deal?",
        config: { field: "annual_revenue", operator: ">", value: 1000000 },
        nextNodes: ["action-vip-outreach"],
        elseNodes: ["action-standard-nurture"],
      },
      {
        id: "action-vip-outreach",
        type: "action",
        title: "Assign VP Account Exec",
        config: {},
        nextNodes: [],
      },
      {
        id: "action-standard-nurture",
        type: "action",
        title: "Enroll in Automated Cadence",
        config: {},
        nextNodes: [],
      },
    ];

    const result = validateWorkflowDAG(validNodes, "trigger-1");
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.executionOrder.length).toBe(4);
  });
});

describe("Webhook HMAC-SHA256 Signatures", () => {
  const secret = "nexus-top-secret-signing-key-42";
  const samplePayload = {
    event: "deal.closed_won",
    dealId: "deal-stark-cloud-1",
    amount: 180000,
  };

  it("computes sha256= prefixed hex signature", () => {
    const sig = signWebhookPayload(secret, samplePayload);
    expect(sig.startsWith("sha256=")).toBe(true);
    expect(sig.length).toBe(71); // 'sha256=' (7) + 64 hex chars
  });

  it("validates authentic signatures and rejects forged signatures", () => {
    const validSig = signWebhookPayload(secret, samplePayload);
    expect(verifyWebhookSignature(secret, samplePayload, validSig)).toBe(true);

    // Tampered payload
    const tamperedPayload = { ...samplePayload, amount: 999999 };
    expect(verifyWebhookSignature(secret, tamperedPayload, validSig)).toBe(
      false,
    );

    // Forged signature
    expect(
      verifyWebhookSignature(
        secret,
        samplePayload,
        "sha256=0000000000000000000000000000000000000000000000000000000000000000",
      ),
    ).toBe(false);
  });
});

describe("DAG Execution Engine", () => {
  it("executes conditional branch paths and logs step-by-step audit entries", async () => {
    const nodes: WorkflowNode[] = [
      {
        id: "t1",
        type: "trigger",
        title: "Lead Inbound",
        config: {},
        nextNodes: ["c1"],
      },
      {
        id: "c1",
        type: "condition",
        title: "VIP Condition",
        config: { field: "annual_revenue", operator: ">", value: 500000 },
        nextNodes: ["a1"],
        elseNodes: ["a2"],
      },
      {
        id: "a1",
        type: "action",
        title: "Update VIP Flag",
        actionType: "update_record",
        config: {
          patch: { is_vip: true, tier: "Tier-1 Enterprise" },
        },
        nextNodes: [],
      },
      {
        id: "a2",
        type: "action",
        title: "Standard Tier Flag",
        actionType: "update_record",
        config: {
          patch: { is_vip: false, tier: "Standard" },
        },
        nextNodes: [],
      },
    ];

    const context: WorkflowExecutionContext = {
      workspaceId: "ws-test",
      triggerEvent: "record.created",
      triggerRecord: {
        id: "rec-1",
        name: "Stark Industries",
        annual_revenue: 1200000,
      },
      variables: {},
    };

    const result = await executeWorkflowDAG("wf-test-1", nodes, "t1", context);
    expect(result.status).toBe("completed");
    expect(result.stepLogs.length).toBe(3); // t1 -> c1 -> a1
    expect(result.stepLogs.some((l) => l.nodeId === "a1")).toBe(true);
    expect(result.stepLogs.some((l) => l.nodeId === "a2")).toBe(false);

    // Context record should be updated with VIP flag
    expect(result.finalVariables.record.is_vip).toBe(true);
    expect(result.finalVariables.record.tier).toBe("Tier-1 Enterprise");
  });
});
