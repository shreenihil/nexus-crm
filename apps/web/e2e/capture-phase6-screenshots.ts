import { chromium } from "@playwright/test";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // Reset demo
  await page.request.post("http://localhost:4000/v1/test/reset-demo");
  await page.addInitScript(() => {
    localStorage.setItem("nexus-token", "demo-session-token");
  });

  await page.goto("http://localhost:3000/settings/platform");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // 1. Initial overview
  await page.screenshot({
    path: "/Users/shreenihilvijayan/.gemini/antigravity-ide/brain/de73bd5d-14a4-463f-ba0f-53ec05089e80/platform_sovereignty_overview.png",
  });

  // 2. Open modal
  await page.locator("#btn-rotate-master-key").click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "/Users/shreenihilvijayan/.gemini/antigravity-ide/brain/de73bd5d-14a4-463f-ba0f-53ec05089e80/byok_rotation_modal.png",
  });

  // 3. Confirm rotation
  await page.locator("#btn-confirm-rotation").click();
  await page.waitForSelector("#kms-rotation-success-banner", {
    timeout: 10000,
  });
  await page.waitForTimeout(500);

  // 4. Rotated v2 active
  await page.screenshot({
    path: "/Users/shreenihilvijayan/.gemini/antigravity-ide/brain/de73bd5d-14a4-463f-ba0f-53ec05089e80/byok_rotated_v2_active.png",
  });

  await browser.close();
  console.log("Phase 6 screenshots captured successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
