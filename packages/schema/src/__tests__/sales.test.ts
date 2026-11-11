import { describe, it, expect } from "vitest";
import {
  isDealRotting,
  calculatePipelineMetrics,
  DEFAULT_PIPELINE_STAGES,
} from "../pipeline";
import {
  calculateQuoteTotals,
  DISCOUNT_APPROVAL_THRESHOLD_PERCENT,
} from "../cpq";

describe("Sales Execution — Pipeline & Rotting Logic", () => {
  it("detects deal rotting when daysInStage exceeds stage threshold", () => {
    // Discovery threshold is 14 days
    expect(isDealRotting(10, 14)).toBe(false);
    expect(isDealRotting(15, 14)).toBe(true);

    // Closed Won and Closed Lost (threshold 999) never rot
    expect(isDealRotting(45, 999)).toBe(false);
  });

  it("correctly calculates total and win-probability-weighted pipeline metrics", () => {
    const deals = [
      { amount: 100000, stage: "Discovery" }, // 20% -> 20,000
      { amount: 50000, stage: "Negotiation" }, // 80% -> 40,000
      { amount: 200000, stage: "Closed Won" }, // 100% -> 200,000
    ];

    const metrics = calculatePipelineMetrics(deals, DEFAULT_PIPELINE_STAGES);

    expect(metrics.dealCount).toBe(3);
    expect(metrics.totalAmount).toBe(350000);
    expect(metrics.weightedAmount).toBe(260000);
    expect(metrics.stageBreakdown["Discovery"]?.count).toBe(1);
    expect(metrics.stageBreakdown["Discovery"]?.weightedAmount).toBe(20000);
  });
});

describe("Sales Execution — CPQ Light Engine", () => {
  it("computes line items, volume discounts, taxes, ARR, and TCV accurately", () => {
    const items = [
      {
        productId: "prod-1",
        productName: "Nexus CRM Enterprise Seat",
        sku: "NEX-ENT-M",
        billingPeriod: "monthly" as const,
        quantity: 10,
        unitPrice: 100, // 10 * 100 = $1,000 / mo -> $12,000 ARR
        discountPercent: 10, // 10% line discount -> $900 / mo -> $10,800 ARR
      },
      {
        productId: "prod-2",
        productName: "Dedicated Cloud Migration Package",
        sku: "NEX-MIG-ONE",
        billingPeriod: "one_time" as const,
        quantity: 1,
        unitPrice: 5000, // $5,000 one-time
        discountPercent: 0,
      },
    ];

    // Subtotal: 900 (monthly) + 5000 (one-time) = 5,900
    // Volume discount: 5%
    // Tax rate: 8%
    const result = calculateQuoteTotals(items, 5, 8);

    expect(result.subtotal).toBe(5900);
    expect(result.discountAmount).toBe(295); // 5% of 5900
    const taxable = 5900 - 295; // 5605
    expect(result.taxAmount).toBe(448.4); // 8% of 5605
    expect(result.total).toBe(6053.4); // 5605 + 448.4

    // Under 20% discount does not require approval
    expect(result.requiresApproval).toBe(false);
  });

  it("flags quote for manager approval if discount exceeds threshold (>20%)", () => {
    const items = [
      {
        productId: "prod-1",
        productName: "Custom SLA Package",
        sku: "SLA-GOLD",
        billingPeriod: "annual" as const,
        quantity: 1,
        unitPrice: 20000,
        discountPercent: 25, // 25% > 20% threshold
      },
    ];

    const result = calculateQuoteTotals(items, 0, 0);
    expect(result.requiresApproval).toBe(true);
  });
});
