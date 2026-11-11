import { describe, it, expect } from "vitest";
import { evaluateFormula } from "../formula";

describe("Safe Formula Engine — Sandboxed Evaluator", () => {
  it("Evaluates arithmetic with correct operator precedence", () => {
    expect(evaluateFormula("10 + 20 * 2")).toBe(50);
    expect(evaluateFormula("(10 + 20) * 2")).toBe(60);
    expect(evaluateFormula("100 / 4 - 5")).toBe(20);
  });

  it("Evaluates record field references dynamically", () => {
    const record = {
      amount: 150000,
      probability: 60,
    };
    const formula = "{amount} * ({probability} / 100)";
    expect(evaluateFormula(formula, record)).toBe(90000);
  });

  it("Evaluates IF and nested conditionals", () => {
    const activeDeal = { stage: "Closed Won", amount: 50000 };
    const lostDeal = { stage: "Closed Lost", amount: 50000 };

    const formula = "IF({stage} == 'Closed Won', {amount}, 0)";
    expect(evaluateFormula(formula, activeDeal)).toBe(50000);
    expect(evaluateFormula(formula, lostDeal)).toBe(0);
  });

  it("Evaluates COALESCE correctly", () => {
    const recordWithEmail = {
      primary_email: "ceo@acme.com",
      fallback_email: "info@acme.com",
    };
    const recordWithoutEmail = {
      primary_email: null,
      fallback_email: "info@acme.com",
    };

    const formula =
      "COALESCE({primary_email}, {fallback_email}, 'no-email@crm')";
    expect(evaluateFormula(formula, recordWithEmail)).toBe("ceo@acme.com");
    expect(evaluateFormula(formula, recordWithoutEmail)).toBe("info@acme.com");
  });

  it("Handles division by zero safely without throwing or NaN", () => {
    expect(evaluateFormula("100 / 0")).toBe(0);
    expect(
      evaluateFormula("{amount} / {divisor}", { amount: 500, divisor: 0 }),
    ).toBe(0);
  });

  it("Evaluates nested dot notation field references", () => {
    const record = {
      deal_name: "Enterprise License",
      company: {
        annual_revenue: 2000000,
        tier: "Tier 1",
      },
    };
    expect(evaluateFormula("{company.annual_revenue} * 0.05", record)).toBe(
      100000,
    );
    expect(
      evaluateFormula("IF({company.tier} == 'Tier 1', 1000, 100)", record),
    ).toBe(1000);
  });

  it("Rejects arbitrary code execution attempts at parse time", () => {
    expect(() => evaluateFormula("process.exit()")).toThrow();
    expect(() => evaluateFormula('require("fs")')).toThrow();
    expect(() => evaluateFormula('eval("1+1")')).toThrow();
    expect(() => evaluateFormula("constructor.prototype")).toThrow();
  });
});
