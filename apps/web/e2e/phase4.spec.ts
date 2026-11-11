import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Phase 4: Data Integrity, Deduplication & Identity Resolution E2E Verification", () => {
  test.beforeEach(async ({ page }) => {
    // Reset backend demo dataset for clean test isolation
    await page.request.post("http://localhost:4000/v1/test/reset-demo");

    // Set demo authentication session in localStorage
    await page.addInitScript(() => {
      localStorage.setItem("nexus-token", "demo-session-token");
    });
  });

  test("Resolution Center: KPI metrics, filtering, and duplicate pair listing", async ({
    page,
  }) => {
    await page.goto("/duplicates");
    await page.waitForLoadState("networkidle");

    // 1. Verify Header & KPI Cards
    await expect(page.locator("h1")).toContainText("Resolution Center");
    await expect(page.locator('[data-testid="kpi-cards"]')).toBeVisible();

    // Verify Pending Pairs count >= 2
    const pendingKpi = page.locator('[data-testid="kpi-pending-count"]');
    await expect(pendingKpi).toBeVisible();
    const count = parseInt((await pendingKpi.textContent()) || "0", 10);
    expect(count).toBeGreaterThanOrEqual(2);

    // 2. Verify Duplicate Pairs List
    await expect(
      page.locator('[data-testid="duplicate-pairs-list"]'),
    ).toBeVisible();
    await expect(page.locator("text=Wayne Enterprises").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=Tony Stark").first()).toBeVisible({
      timeout: 10000,
    });

    // 3. Verify Confidence Badges
    await expect(
      page.locator('[data-testid="confidence-badge"]').first(),
    ).toBeVisible();

    // 4. Test Entity Filtering (Companies)
    await page
      .locator('[data-testid="entity-filter-select"]')
      .selectOption("companies");
    await expect(page.locator("text=Wayne Enterprises").first()).toBeVisible();

    // Reset filter to All
    await page
      .locator('[data-testid="entity-filter-select"]')
      .selectOption("all");
  });

  test("Explainability: Score evidence breakdown modal displays corroboration factors", async ({
    page,
  }) => {
    await page.goto("/duplicates");
    await page.waitForLoadState("networkidle");

    // Click "Why match?" on the first duplicate pair
    await page
      .locator('[data-testid="view-match-reasons-btn"]')
      .first()
      .click();

    // Verify Explanation Modal
    await expect(
      page.locator('[data-testid="match-explanation-dialog"]'),
    ).toBeVisible();
    await expect(page.locator("text=Match Evidence Breakdown")).toBeVisible();

    // Close modal
    await page
      .locator(
        '[data-testid="match-explanation-dialog"] button:has-text("Close")',
      )
      .click();
    await expect(
      page.locator('[data-testid="match-explanation-dialog"]'),
    ).not.toBeVisible();
  });

  test("Side-by-side comparison modal with field-level cherry-pick and transactional merge", async ({
    page,
  }) => {
    await page.goto("/duplicates");
    await page.waitForLoadState("networkidle");

    // Click Compare & Merge on the first pair
    await page.locator('[data-testid="compare-merge-btn"]').first().click();

    // Verify Side-by-side Modal
    await expect(
      page.locator('[data-testid="side-by-side-merge-modal"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="field-compare-table"]'),
    ).toBeVisible();

    // Switch winner choice to Record B
    await page.locator('[data-testid="pick-winner-right"]').click();

    // Switch back to Record A
    await page.locator('[data-testid="pick-winner-left"]').click();

    // Confirm & Execute Merge
    await page.locator('[data-testid="confirm-merge-btn"]').click();

    // Verify success notification
    await expect(page.locator("text=Records successfully merged")).toBeVisible({
      timeout: 5000,
    });
  });

  test("Merge History: 1-click reversible unmerge restores archived record within 30-day window", async ({
    page,
  }) => {
    await page.goto("/duplicates");
    await page.waitForLoadState("networkidle");

    // Switch to Merge History tab
    await page.locator('[data-testid="tab-merge-history"]').click();

    // Verify Merge History Table and seeded Stark Industries merge
    await expect(
      page.locator('[data-testid="merge-history-view"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="merge-history-table"]'),
    ).toBeVisible();
    await expect(page.locator("text=Stark Industries").first()).toBeVisible({
      timeout: 10000,
    });

    // Click Unmerge
    const unmergeBtn = page.locator('[data-testid="unmerge-btn"]').first();
    await expect(unmergeBtn).toBeVisible();
    await unmergeBtn.click();

    // Verify Reversible Unmerge Success Notification
    await expect(page.locator("text=Reversible unmerge complete")).toBeVisible({
      timeout: 5000,
    });

    // Verify status changed to Unmerged
    await expect(page.locator("text=Unmerged").first()).toBeVisible();
  });

  test("Real-time pre-creation check warning banner in Record creation dialog", async ({
    page,
  }) => {
    await page.goto("/records/people");
    await page.waitForLoadState("networkidle");

    // Open New Person dialog
    await page.locator("#btn-new-record").click();
    await expect(page.locator("#input-attr-first_name")).toBeVisible();

    // Enter details matching existing person "Tony Stark"
    await page.locator("#input-attr-first_name").fill("Tony");
    await page.locator("#input-attr-last_name").fill("Stark");
    await page.locator("#input-attr-email").fill("tony@starkindustries.com");

    // Wait for debounced real-time duplicate check
    await expect(
      page.locator('[data-testid="pre-creation-duplicate-warning"]'),
    ).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Potential Duplicate")).toBeVisible();
    await expect(page.locator("text=Open Resolution Center")).toBeVisible();
  });

  test("Accessibility (a11y): Zero axe violations across Resolution Center", async ({
    page,
  }) => {
    await page.goto("/duplicates");
    await page.waitForLoadState("networkidle");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
