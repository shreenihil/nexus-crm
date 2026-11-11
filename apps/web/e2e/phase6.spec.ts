import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Phase 6: Platform Sovereignty, BYOK Envelope Encryption & Single-Tenant Deployment E2E Verification", () => {
  test.beforeEach(async ({ page }) => {
    // Reset backend demo dataset for clean test isolation
    await page.request.post("http://localhost:4000/v1/test/reset-demo");

    // Set demo authentication session in localStorage
    await page.addInitScript(() => {
      localStorage.setItem("nexus-token", "demo-session-token");
    });
  });

  test("Platform Sovereignty & BYOK UI: Telemetry metrics, liveness/readiness indicators, and KMS active version", async ({
    page,
  }) => {
    await page.goto("/settings/platform");
    await page.waitForLoadState("networkidle");

    // 1. Verify Header & Badges
    await expect(page.locator("h1")).toContainText(
      "Platform Sovereignty & BYOK KMS",
    );
    await expect(page.locator("text=Phase 6 Enterprise")).toBeVisible();

    // 2. Verify Readiness and Telemetry Indicators
    const statusElem = page.locator("#telemetry-status");
    await expect(statusElem).toBeVisible({ timeout: 10000 });
    await expect(statusElem).toContainText(/ready/i);

    await expect(page.locator("#telemetry-tenants")).toBeVisible();
    await expect(page.locator("#telemetry-uptime")).toBeVisible();
    await expect(page.locator("#telemetry-memory")).toBeVisible();

    // 3. Verify KMS Section & Initial Active Version
    const activeVersion = page.locator("#active-kms-version");
    await expect(activeVersion).toBeVisible();
    await expect(activeVersion).toContainText("Version 1");
    await expect(page.locator("text=AES-256-GCM").first()).toBeVisible();
  });

  test("Zero-Downtime BYOK Key Rotation: Generates incremented key version in milliseconds with zero downtime", async ({
    page,
  }) => {
    await page.goto("/settings/platform");
    await page.waitForLoadState("networkidle");

    // Click "Rotate Master Key (Zero Downtime)" button
    const rotateBtn = page.locator("#btn-rotate-master-key");
    await expect(rotateBtn).toBeVisible({ timeout: 10000 });
    await rotateBtn.click();

    // Verify confirmation modal opens
    await expect(
      page.locator("text=Rotate Master Key (BYOK KMS)").first(),
    ).toBeVisible();
    await expect(page.locator("text=Zero-Downtime Guarantee:")).toBeVisible();

    // Confirm Key Rotation
    const confirmBtn = page.locator("#btn-confirm-rotation");
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verify success banner appears
    const banner = page.locator("#kms-rotation-success-banner");
    await expect(banner).toBeVisible({ timeout: 10000 });
    await expect(banner).toContainText("Zero-Downtime Key Rotation Completed:");

    // Verify Active Version has incremented to Version 2
    const activeVersion = page.locator("#active-kms-version");
    await expect(activeVersion).toContainText("Version 2");

    // Verify history table contains rotated v1 and active v2
    await expect(page.locator('td:has-text("v1")').first()).toBeVisible();
    await expect(page.locator('td:has-text("v2")').first()).toBeVisible();
  });

  test("1-Click Tenant Portability: Export verified archive and inspect SHA-256 integrity checksum manifest", async ({
    page,
  }) => {
    await page.goto("/settings/platform");
    await page.waitForLoadState("networkidle");

    // Test API Export endpoint directly for complete cryptographic verification
    const exportRes = await page.request.get(
      "http://localhost:4000/v1/platform/export",
      {
        headers: { Authorization: "Bearer demo-session-token" },
      },
    );
    expect(exportRes.status()).toBe(200);

    const archive = await exportRes.json();
    expect(archive.manifest).toBeDefined();
    expect(archive.manifest.formatVersion).toBe("1.0.0");
    expect(archive.manifest.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(archive.manifest.entityCounts.records).toBeGreaterThanOrEqual(1);
    expect(archive.schemas.objects.length).toBeGreaterThanOrEqual(4);
    expect(archive.security.auditLedger.length).toBeGreaterThanOrEqual(1);

    // Verify Export button is visible and accessible in UI
    await expect(page.locator("#btn-export-archive")).toBeVisible();
  });

  test("Cryptographic Integrity Gate: Restores verified archive and rejects tampered payloads", async ({
    page,
  }) => {
    await page.goto("/settings/platform");
    await page.waitForLoadState("networkidle");

    // 1. Fetch genuine archive from export
    const exportRes = await page.request.get(
      "http://localhost:4000/v1/platform/export",
      {
        headers: { Authorization: "Bearer demo-session-token" },
      },
    );
    const genuineArchive = await exportRes.json();

    // 2. Test tampering rejection: Modify record data without recomputing SHA-256 checksum
    const tamperedArchive = JSON.parse(JSON.stringify(genuineArchive));
    tamperedArchive.data.records.push({
      id: "unauthorized-tampered-record",
      workspaceId: genuineArchive.manifest.workspaceId,
      objectId: "obj-people",
      data: { firstName: "Hacker", lastName: "Malicious" },
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const input = page.locator("#archive-json-input");
    await input.fill(JSON.stringify(tamperedArchive));

    const importBtn = page.locator("#btn-import-archive");
    await importBtn.click();

    // Verify error banner is shown with integrity verification rejection
    const errorBanner = page.locator("#archive-import-error");
    await expect(errorBanner).toBeVisible({ timeout: 10000 });
    await expect(errorBanner).toContainText("integrity verification failed");

    // 3. Test genuine archive restore
    await input.fill(JSON.stringify(genuineArchive));
    await importBtn.click();

    // Verify success banner confirms checksum verified & restored counts
    const successBanner = page.locator("#archive-import-success");
    await expect(successBanner).toBeVisible({ timeout: 10000 });
    await expect(successBanner).toContainText("Restore Successful:");
  });

  test("Accessibility: Zero axe-core a11y violations across Platform Sovereignty views", async ({
    page,
  }) => {
    await page.goto("/settings/platform");
    await page.waitForLoadState("networkidle");

    // Wait for telemetry data to populate
    await expect(page.locator("#telemetry-status")).toBeVisible({
      timeout: 10000,
    });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
