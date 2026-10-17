import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Phase 0 — Foundations & Sovereign Currency Acceptance Tests', () => {
  test('Design System page loads and has zero axe-core accessibility violations', async ({ page }) => {
    await page.goto('/design-system');

    // Verify main components render
    await expect(page.locator('h1')).toContainText('Nexus Design System');
    await expect(page.getByText('Semantic Color Tokens')).toBeVisible();

    // Check accessibility with axe-core
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast']) // We test custom contrast programmatically in vitest
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Theme switcher toggles Dark, High-Contrast, and Accent classes without page reload', async ({ page }) => {
    await page.goto('/design-system');

    // Click Dark theme button
    await page.getByRole('button', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Click High Contrast theme button
    await page.getByRole('button', { name: 'Contrast' }).click();
    await expect(page.locator('html')).toHaveClass(/high-contrast/);

    // Click Ocean Blue accent
    await page.getByRole('button', { name: 'Ocean Blue' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-accent', 'sky');

    // Click Compact density
    await page.getByRole('button', { name: 'Compact' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
  });

  test('Sovereign Currency Engine renders Indian Lakh/Crore, In-Words, and Pinned ISO currencies (§4.7)', async ({ page }) => {
    await page.goto('/design-system');

    // Verify Section 7 Sovereign Currency Engine Showcase is present
    await expect(page.getByText('Sovereign Currency Engine & India-First Formatting')).toBeVisible();
    await expect(page.getByText('Rule 8 Enforced')).toBeVisible();

    // Verify Indian standard digit grouping (12,34,567.50)
    await expect(page.getByText('₹12,34,567.50').first()).toBeVisible();

    // Verify Compact Indian Lakh and Crore notation
    await expect(page.getByText('₹25 Cr')).toBeVisible();
    await expect(page.getByText('₹12.50 L')).toBeVisible();

    // Verify legal in-words generation
    await expect(
      page.getByText('Rupees Twelve Lakh Thirty-Four Thousand Five Hundred Sixty-Seven and Fifty Paise Only')
    ).toBeVisible();

    // Verify multi-currency portfolio elements render with appropriate codes
    await expect(page.getByText('INR (Default)')).toBeVisible();
    await expect(page.getByText('USD', { exact: true })).toBeVisible();
    await expect(page.getByText('EUR', { exact: true })).toBeVisible();
    await expect(page.getByText('AED', { exact: true })).toBeVisible();
  });

  test('Dashboard renders with sovereign INR formatting and Indian enterprise deals across viewports', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Executive Sales Overview');

    // Check table and stats render
    await expect(page.getByText('Total Pipeline')).toBeVisible();
    await expect(page.getByText('₹12.80 Cr')).toBeVisible();

    // Verify enterprise accounts and deals
    await expect(page.getByText('Stark Industries')).toBeVisible();
    await expect(page.getByText('Tata Consultancy Services')).toBeVisible();
    await expect(page.getByText('TCS Pan-India CRM Modernization')).toBeVisible();
  });

  test('Mobile viewport (390px) responsive layout check', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/design-system');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText('Nexus Design System')).toBeVisible();
    await expect(page.getByText('Sovereign Currency Engine & India-First Formatting')).toBeVisible();

    const accessibilityScan = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(accessibilityScan.violations).toEqual([]);
  });
});
