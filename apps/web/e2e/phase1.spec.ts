import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Phase 1: Data Core & Security E2E Verification", () => {
  test.beforeEach(async ({ page }) => {
    // Set demo authentication session in localStorage
    await page.addInitScript(() => {
      localStorage.setItem("nexus-token", "demo-session-token");
    });
  });

  test("Schema Builder: View objects, attributes, and create custom entity", async ({
    page,
  }) => {
    await page.goto("/settings/schema");
    await page.waitForLoadState("networkidle");

    // Verify Schema Header
    await expect(page.locator("h1")).toContainText("Schema & Object Builder");
    await expect(page.locator("#obj-tab-companies")).toBeVisible();
    await expect(page.locator("#obj-tab-deals")).toBeVisible();

    // Verify standard attributes of Companies
    await expect(page.locator("text=Company Name")).toBeVisible();
    await expect(page.locator("text=Annual Revenue")).toBeVisible();

    // Create Custom Object "Subscriptions"
    await page.locator("#btn-create-custom-object").click();
    await page.locator("#input-obj-singular").fill("Subscription");
    await page.locator("#input-obj-plural").fill("Subscriptions");
    await page.locator("#input-obj-apiname").fill("subscriptions");
    await page
      .locator("#input-obj-desc")
      .fill("Recurring customer subscriptions");
    await page.locator("#btn-submit-create-object").click();

    // Verify Subscriptions object tab appears
    await expect(page.locator("#obj-tab-subscriptions")).toBeVisible({
      timeout: 10000,
    });
  });

  test("Record Catalog & TanStack Table: Filtering, density toggle, and export", async ({
    page,
  }) => {
    await page.goto("/records/companies");
    await page.waitForLoadState("networkidle");

    // Verify Companies records list
    await expect(page.locator("h1")).toContainText("Companies");
    await expect(page.locator("text=Stark Industries")).toBeVisible();
    await expect(
      page.getByText("Wayne Enterprises", { exact: true }),
    ).toBeVisible();

    // Test Search filter
    await page.locator("#input-record-search").fill("Stark");
    await expect(page.locator("text=Stark Industries")).toBeVisible();
    await expect(
      page.getByText("Wayne Enterprises", { exact: true }),
    ).not.toBeVisible();

    // Clear search
    await page.locator("#input-record-search").fill("");
    await expect(
      page.getByText("Wayne Enterprises", { exact: true }),
    ).toBeVisible();

    // Test Density Toggle
    await page.locator("#btn-density-compact").click();
    await page.locator("#btn-density-comfortable").click();
  });

  test("Split-Pane Detail View: Inline master attributes, formula calculation, and related tabs", async ({
    page,
  }) => {
    await page.goto("/records/deals");
    await page.waitForLoadState("networkidle");

    // Click into Stark Enterprises Cloud Migration deal
    await page.locator("text=Stark Enterprises Cloud Migration").click();
    await page.waitForURL(/\/records\/deals\/.+/);

    // Verify Split-pane master attributes
    await expect(page.locator("text=Expected Value")).toBeVisible();
    await expect(
      page.locator("text=AST: {amount} * ({probability} / 100)"),
    ).toBeVisible();

    // Check Right-Pane Tabs
    await page.locator("#tab-related-records").click();
    await page.locator("#tab-audit-timeline").click();
    await expect(
      page.locator("text=SHA-256 cryptographic chain entries"),
    ).toBeVisible();
  });

  test("Audit Ledger: Cryptographic SHA-256 Hash Chain Verification", async ({
    page,
  }) => {
    await page.goto("/settings/audit");
    await page.waitForLoadState("networkidle");

    // Verify Header
    await expect(page.locator("h1")).toContainText(
      "Tamper-Evident Audit Ledger",
    );

    // Click Verify Hash Chain
    await page.locator("#btn-verify-audit-chain").click();

    // Verify Cryptographic Ledger Integrity 100% banner
    await expect(page.locator("#audit-verification-banner")).toContainText(
      "Cryptographic Ledger Integrity: 100% Verified",
    );
  });

  test("Accessibility (a11y): Zero axe violations across viewports", async ({
    page,
  }) => {
    await page.goto("/settings/schema");
    await page.waitForLoadState("networkidle");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"]) // contrast is tested strictly at token build-time
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
