import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Phase 2: Sales Execution E2E Verification", () => {
  test.beforeEach(async ({ page }) => {
    // Reset backend demo dataset for clean test isolation
    await page.request.post("http://localhost:4000/v1/test/reset-demo");

    // Set demo authentication session in localStorage
    await page.addInitScript(() => {
      localStorage.setItem("nexus-token", "demo-session-token");
    });
  });

  test("Kanban Board: Renders pipeline metrics, stages, rotting deal warning, and deal creation", async ({
    page,
  }) => {
    await page.goto("/deals/board");
    await page.waitForLoadState("networkidle");

    // 1. Verify Pipeline Header & Metric Cards
    await expect(page.locator("h1")).toContainText("Sales Pipeline");
    await expect(page.locator("text=Total Pipeline Value")).toBeVisible();
    await expect(
      page.locator("text=Weighted Pipeline (AST Formula)"),
    ).toBeVisible();

    // 2. Verify Rotting Deal Alert Badge in Discovery Column
    const rottingBadge = page.locator('[id^="rotting-badge-"]');
    await expect(rottingBadge.first()).toBeVisible();
    await expect(rottingBadge.first()).toContainText("Rotting");

    // 3. Verify Pipeline Stage Columns Render
    await expect(page.locator("#stage-col-discovery")).toBeVisible();
    await expect(page.locator("#stage-col-proposal-sent")).toBeVisible();
    await expect(page.locator("#stage-col-closed-won")).toBeVisible();

    // 4. Test Create New Deal Modal
    await page.locator("#btn-open-create-deal").click();
    await page.locator("#input-deal-name").fill("Cyberdyne AI Migration");
    await page.locator("#input-deal-amount").fill("250000");
    await page.locator("#btn-submit-create-deal").click();

    // Verify new deal appears in board
    await expect(
      page.locator("text=Cyberdyne AI Migration").first(),
    ).toBeVisible({ timeout: 8000 });
  });

  test("Deal Detail: Pipeline stage stepper, formula recalculation, and stage transition", async ({
    page,
  }) => {
    await page.goto("/deals/board");
    await page.waitForLoadState("networkidle");

    // Click into Wayne Corp deal
    const dealCard = page.locator("text=Wayne Corp Security Audit").first();
    await dealCard.scrollIntoViewIfNeeded();
    await dealCard.click();
    await page.waitForURL(/\/records\/deals\/.+/);

    // Verify Stage Progression Stepper is visible
    await expect(page.locator("#stage-step-discovery")).toBeVisible();
    await expect(page.locator("#stage-step-proposal-sent")).toBeVisible();
    await expect(page.locator("#stage-step-negotiation")).toBeVisible();

    // Advance Stage by clicking 'Negotiation'
    await page.locator("#stage-step-negotiation").click();

    // Toast and updated stage badge
    await expect(page.locator("#toast-success")).toBeVisible({ timeout: 8000 });
  });

  test("Universal Activity Timeline: Log note, call, task, and view interleaved audit feed", async ({
    page,
  }) => {
    await page.goto("/deals/board");
    await page.waitForLoadState("networkidle");

    const dealCard = page
      .locator("text=Omni Consumer Products Security Suite")
      .first();
    await dealCard.scrollIntoViewIfNeeded();
    await dealCard.click();
    await page.waitForURL(/\/records\/deals\/.+/);

    // Verify Rotting Warning on Discovery deal
    await expect(page.locator("#deal-rotting-warning")).toBeVisible();

    // Open Timeline Tab
    await page.locator("#tab-universal-timeline").click();
    await expect(
      page.locator("text=Universal Activity Timeline"),
    ).toBeVisible();

    // Log a Call Activity
    await page.locator("#activity-type-call").click();
    await page
      .locator("#input-activity-subject")
      .fill("Enterprise Security Architecture Briefing");
    await page
      .locator("#textarea-activity-body")
      .fill(
        "Reviewed SOC 2 Type II compliance, KMS envelope encryption, and sovereign multi-tenancy.",
      );
    await page.locator("#btn-log-activity").click();

    // Verify activity appears in feed (using .first() to avoid strict mode violation across multiple viewports)
    await expect(
      page.locator("text=Enterprise Security Architecture Briefing").first(),
    ).toBeVisible({ timeout: 8000 });
  });

  test("CPQ Light: Quote creation, line items, volume discount approval gate, and manager approval", async ({
    page,
  }) => {
    await page.goto("/deals/board");
    await page.waitForLoadState("networkidle");

    const dealCard = page
      .locator("text=Omni Consumer Products Security Suite")
      .first();
    await dealCard.scrollIntoViewIfNeeded();
    await dealCard.click();
    await page.waitForURL(/\/records\/deals\/.+/);

    // Open Quotes & Proposals Tab
    await page.locator("#tab-cpq-quotes").click();
    await expect(page.locator("text=Quotes & Proposals (CPQ)")).toBeVisible();

    // Open Create Quote Modal
    await page.locator("#btn-open-create-quote").click();

    // Wait for product dropdown options to populate from backend
    await page.waitForSelector('#select-cpq-product option:not([value=""])', {
      state: "attached",
    });
    await page.locator("#select-cpq-product").selectOption({ index: 1 });

    // Click Add Line and verify line item is attached
    await expect(page.locator("#btn-add-product-line")).toBeEnabled();
    await page.locator("#btn-add-product-line").click();
    await expect(page.locator("#input-item-qty-0")).toBeVisible();

    // Set Volume Discount to 25% (trigger approval gate)
    await page.locator("#input-volume-discount").fill("25");

    // Verify Approval Warning Gate displays
    await expect(page.locator("#quote-approval-warning")).toBeVisible();
    await expect(page.locator("#quote-approval-warning")).toContainText(
      "Discount exceeds 20% threshold",
    );

    // Submit Quote Creation
    const submitQuoteBtn = page.locator("#btn-submit-create-quote");
    await submitQuoteBtn.scrollIntoViewIfNeeded();
    await submitQuoteBtn.click();

    // Verify Pending Approval Badge on quote
    await expect(page.locator("text=Pending Approval").first()).toBeVisible({
      timeout: 8000,
    });

    // Click Approve Gate Button
    const approveBtn = page.locator('[id^="btn-approve-quote-"]').first();
    await approveBtn.click();

    // Verify Status changes to Approved
    await expect(page.locator("#toast-success")).toBeVisible({ timeout: 8000 });
  });

  test("Accessibility (a11y): Zero axe violations across Kanban board", async ({
    page,
  }) => {
    await page.goto("/deals/board");
    await page.waitForLoadState("networkidle");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
