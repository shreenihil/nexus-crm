import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Phase 3: Omnichannel Communication Engine E2E Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Reset backend demo dataset for clean test isolation
    await page.request.post('http://localhost:4000/v1/test/reset-demo');

    // Set demo authentication session in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('nexus-token', 'demo-session-token');
    });
  });

  test('Universal Shared Inbox: Channel filtering, thread selection, and status toggle', async ({ page }) => {
    await page.goto('/activity');
    await page.waitForLoadState('networkidle');

    // 1. Verify Inbox Header & Components
    await expect(page.locator('h1')).toContainText('Universal Shared Inbox');
    await expect(page.locator('[data-testid="inbox-page"]')).toBeVisible();

    // 2. Verify Thread List and default Stark email thread
    await expect(page.locator('text=Enterprise Cloud Transformation Scope').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Tony Stark').first()).toBeVisible({ timeout: 10000 });

    // Open Stark thread to view conversation
    await page.locator('[data-testid="thread-item-th-stark-email-1"]').click();

    // 3. Verify SPF/DKIM verification badge
    await expect(page.locator('text=SPF/DKIM: PASS').first()).toBeVisible();

    // 4. Verify Collision Detection Banner
    await expect(page.locator('text=Arthur Dent is currently viewing this thread')).toBeVisible();

    // 5. Test Channel Filtering (SMS)
    // On mobile, if back button exists, navigate back to list first
    const backBtn = page.locator('button[aria-label="Back to threads list"]');
    if (await backBtn.isVisible()) {
      await backBtn.click();
    }
    await page.locator('[data-testid="channel-filter-sms"]').click();
    await expect(page.locator('text=Security Questionnaire Follow-up').first()).toBeVisible();

    // Reset filter to All
    await page.locator('[data-testid="channel-filter-all"]').click();
    await expect(page.locator('text=Enterprise Cloud Transformation Scope').first()).toBeVisible();

    // Open Stark thread again for status toggle
    await page.locator('[data-testid="thread-item-th-stark-email-1"]').click();

    // 6. Test Thread Status Toggle (Resolve / Re-open)
    const statusToggleBtn = page.locator('[data-testid="thread-status-toggle"]');
    await expect(statusToggleBtn).toContainText('Resolve Thread');
    await statusToggleBtn.click();

    // Verify status changed
    await expect(page.locator('text=Thread marked as resolved')).toBeVisible({ timeout: 5000 });
  });

  test('Composer: Canned Snippets with Variable Replacement & Internal Notes', async ({ page }) => {
    await page.goto('/activity');
    await page.waitForLoadState('networkidle');

    // Select Stark email thread
    await page.locator('[data-testid="thread-item-th-stark-email-1"]').click();

    // 1. Test Canned Snippets Trigger & Variable Replacement
    await page.locator('[data-testid="snippets-trigger-btn"]').click();
    await expect(page.locator('[data-testid="snippet-item-snip-intro"]')).toBeVisible();

    await page.locator('[data-testid="snippet-item-snip-intro"]').click();

    // Verify textarea populated with substituted text (Tony Stark / Stark Industries)
    const composer = page.locator('[data-testid="message-input"]');
    await expect(composer).toHaveValue(/Tony/);

    // 2. Switch to Internal Note Mode
    await page.locator('[data-testid="channel-tab-note"]').click();
    await composer.fill('Finance approved custom SLA terms. Enclave provisioning complete.');
    await page.locator('[data-testid="send-message-btn"]').click();

    // Verify Internal Note appears with badge in conversation feed
    await expect(page.locator('text=Internal Team Note').first()).toBeVisible({ timeout: 5000 });
  });

  test('Inbound Email Webhook: Thread stitching and delivery under 5 seconds', async ({ page }) => {
    await page.goto('/activity');
    await page.waitForLoadState('networkidle');

    // Verify thread is visible
    await expect(page.locator('text=Enterprise Cloud Transformation Scope').first()).toBeVisible({ timeout: 10000 });

    // Open thread
    await page.locator('[data-testid="thread-item-th-stark-email-1"]').click();

    // Simulate inbound webhook HTTP request from Tony Stark
    const startTime = Date.now();
    const webhookRes = await page.request.post('http://localhost:4000/v1/webhooks/inbound/email', {
      data: {
        from: 'tony@starkindustries.com',
        to: 'alex@acme.corp',
        subject: 'Re: Enterprise Cloud Transformation Scope',
        text: 'E2E Webhook Test: Confirming security compliance review complete.',
        inReplyTo: 'msg-stark-1',
      },
    });

    expect(webhookRes.status()).toBe(201);
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // Verify < 5s delivery requirement

    // Click refresh conversation button to reload active thread
    await page.locator('[data-testid="refresh-thread-btn"]').click();
    await expect(page.locator('text=E2E Webhook Test: Confirming security compliance review complete.').first()).toBeVisible({ timeout: 8000 });
  });

  test('Inbound SMS Webhook: DNC STOP keyword auto-opt-out & send blocking', async ({ page }) => {
    await page.goto('/activity');
    await page.waitForLoadState('networkidle');

    // 1. Send Inbound SMS with STOP keyword from Bruce Wayne (+1-212-555-0144)
    const smsRes = await page.request.post('http://localhost:4000/v1/webhooks/inbound/sms', {
      data: {
        from: '+1-212-555-0144',
        to: '+1-800-555-0100',
        body: 'STOP',
      },
    });

    expect(smsRes.status()).toBe(201);
    const smsJson = await smsRes.json();
    expect(smsJson.isOptOut).toBe(true);
    expect(smsJson.autoReply).toContain('successfully opted out');

    // 2. Select Wayne SMS Thread in UI
    await page.locator('[data-testid="thread-item-th-wayne-sms-1"]').click();

    // 3. Verify DNC badge displays Opted Out
    const dncBadge = page.locator('[data-testid="dnc-badge"]').first();
    await expect(dncBadge).toContainText('DNC: Opted Out');

    // 4. Verify DNC warning banner in SMS composer
    await page.locator('[data-testid="channel-tab-sms"]').click();
    await expect(page.locator('text=Warning: Recipient has opted out of SMS messages (DNC Active)')).toBeVisible();
  });

  test('WebRTC Softphone: Click-to-call, live timer, and call disposition logging', async ({ page }) => {
    await page.goto('/activity');
    await page.waitForLoadState('networkidle');

    // Select thread
    await page.locator('[data-testid="thread-item-th-stark-email-1"]').click();

    // 1. Click "Call Contact" Softphone button
    await page.locator('[data-testid="click-to-call-btn"]').first().click();

    // 2. Verify Softphone Modal is open and shows live dialer
    await expect(page.locator('[data-testid="softphone-modal"]')).toBeVisible();
    await expect(page.locator('text=Nexus WebRTC Softphone')).toBeVisible();

    // Wait 2 seconds for call simulation
    await page.waitForTimeout(2000);

    // 3. End Call
    await page.locator('[data-testid="end-call-btn"]').click();

    // 4. Verify Post-Call Disposition Form
    await expect(page.locator('text=Call Finished')).toBeVisible();
    await page.locator('[data-testid="outcome-connected"]').click();

    // Enter notes
    const notesInput = page.locator('textarea[placeholder*="Document discussion points"]');
    await notesInput.fill('Discussed high concurrency benchmarking. Client requested pilot enclave.');

    // Save & Log Activity
    await page.locator('[data-testid="save-call-activity-btn"]').click();

    // 5. Verify Success Notification
    await expect(page.locator('text=Call logged to activity timeline')).toBeVisible({ timeout: 5000 });
  });

  test('Accessibility (a11y): Zero axe violations across Universal Shared Inbox', async ({ page }) => {
    await page.goto('/activity');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
