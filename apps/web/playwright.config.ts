import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Desktop (1440px)',
      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'Tablet (820px)',
      use: {
        viewport: { width: 820, height: 1180 },
      },
    },
    {
      name: 'Mobile (390px)',
      use: {
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @nexus/api dev',
      port: 4000,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: 'pnpm --filter @nexus/web dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
