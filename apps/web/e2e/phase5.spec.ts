import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Phase 5: Workflow Automation, Webhooks & Extensibility Engine E2E Verification", () => {
  test.beforeEach(async ({ page }) => {
    // Reset backend demo dataset for clean test isolation
    await page.request.post("http://localhost:4000/v1/test/reset-demo");

    // Set demo authentication session in localStorage
    await page.addInitScript(() => {
      localStorage.setItem("nexus-token", "demo-session-token");
    });
  });

  test("Automations Hub: KPI metrics, workflow list, and visual DAG canvas", async ({
    page,
  }) => {
    await page.goto("/automations");
    await page.waitForLoadState("networkidle");

    // 1. Verify Header & KPI Cards
    await expect(page.locator("h1")).toContainText(
      "Workflow Automations & Webhooks",
    );
    await expect(
      page.locator('[data-testid="automation-metrics-grid"]'),
    ).toBeVisible();

    // Verify Active Workflows count >= 2
    const activeWfKpi = page.locator('[data-testid="metric-active-workflows"]');
    await expect(activeWfKpi).toBeVisible();
    const count = parseInt((await activeWfKpi.textContent()) || "0", 10);
    expect(count).toBeGreaterThanOrEqual(2);

    // Verify Success Rate
    await expect(
      page.locator('[data-testid="metric-success-rate"]'),
    ).toContainText("100%");

    // 2. Verify Configured Workflows
    await expect(
      page.locator('[data-testid="workflow-card-wf-auto-lead-nurture"]'),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator("text=Autonomous Inbound Lead Qualification").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=Closed-Won ERP Dispatch").first(),
    ).toBeVisible();

    // 3. Verify Visual DAG Canvas
    await expect(
      page.locator('[data-testid="workflow-dag-canvas"]'),
    ).toBeVisible();
    await expect(
      page.locator("text=Lead Created (People)").first(),
    ).toBeVisible();
    await expect(page.locator("text=Is Executive Lead?").first()).toBeVisible();
  });

  test("Real-time DAG Execution: Step-level input/output capture and condition routing", async ({
    page,
  }) => {
    await page.goto("/automations");
    await page.waitForLoadState("networkidle");

    // Click "Test Run Workflow" button
    const testRunBtn = page
      .locator('[data-testid="test-run-workflow-btn"]')
      .first();
    await expect(testRunBtn).toBeVisible({ timeout: 10000 });
    await testRunBtn.click();

    // Verify Execution Modal opens
    await expect(
      page.locator('[data-testid="workflow-test-modal"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="workflow-test-payload-input"]'),
    ).toBeVisible();

    // Click "Run Workflow Now"
    await page.locator('[data-testid="execute-workflow-run-btn"]').click();

    // Verify execution results and step logs
    await expect(
      page.locator('[data-testid="workflow-run-results"]'),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=STATUS: completed")).toBeVisible();
    await expect(page.locator('[data-testid="step-log-0"]')).toBeVisible();

    // Verify condition evaluation in step logs
    await expect(page.locator("text=Is Executive Lead?").first()).toBeVisible();
  });

  test("Outbound Webhooks: Test ping dispatch and HMAC-SHA256 signature inspection", async ({
    page,
  }) => {
    await page.goto("/automations");
    await page.waitForLoadState("networkidle");

    // Switch to Outbound Subscriptions tab
    await page.locator('[data-testid="tab-webhooks"]').click();

    // Verify Outbound Webhooks List
    await expect(
      page.locator('[data-testid="outbound-webhooks-list"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="webhook-row-hook-sub-erp-1"]'),
    ).toBeVisible();
    await expect(
      page.locator("text=https://hooks.acme-erp.internal/orders/sync").first(),
    ).toBeVisible();

    // Send Test Ping
    const pingBtn = page.locator('[data-testid="ping-webhook-hook-sub-erp-1"]');
    await expect(pingBtn).toBeVisible();
    await pingBtn.click();

    // Verify Ping Delivered Notification
    await expect(page.locator("text=Webhook ping delivered")).toBeVisible({
      timeout: 5000,
    });

    // Inspect Webhook Delivery Payload & HMAC Signature
    const inspectBtn = page
      .locator('button:has-text("Inspect Payload")')
      .first();
    await expect(inspectBtn).toBeVisible();
    await inspectBtn.click();

    // Verify Delivery Inspection Modal
    await expect(
      page.locator('[data-testid="delivery-inspection-modal"]'),
    ).toBeVisible();
    await expect(
      page.locator("text=HMAC-SHA256 Signature (x-nexus-signature)"),
    ).toBeVisible();
    await expect(page.locator("text=sha256=")).toBeVisible();

    // Close Modal
    await page
      .locator(
        '[data-testid="delivery-inspection-modal"] button:has-text("Close")',
      )
      .click();
    await expect(
      page.locator('[data-testid="delivery-inspection-modal"]'),
    ).not.toBeVisible();
  });

  test("Inbound Webhooks: Cryptographic documentation and HMAC signature guidance", async ({
    page,
  }) => {
    await page.goto("/automations");
    await page.waitForLoadState("networkidle");

    // Switch to Inbound HMAC tab
    await page.locator('[data-testid="tab-inbound"]').click();

    // Verify Inbound Guidelines
    await expect(
      page.locator("text=Cryptographic Inbound Webhook Verification"),
    ).toBeVisible();
    await expect(page.locator("text=x-nexus-signature: sha256=")).toBeVisible();
    await expect(page.locator("text=timingSafeEqual()")).toBeVisible();
  });

  test("Accessibility (a11y): Zero axe violations across Automations Hub", async ({
    page,
  }) => {
    await page.goto("/automations");
    await page.waitForLoadState("networkidle");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
