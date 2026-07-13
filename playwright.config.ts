/**
 * playwright.config.ts — Playwright E2E test configuration.
 *
 * Run E2E tests with: `pnpm test:e2e`
 * UI mode: `pnpm test:e2e:ui`
 *
 * Tests live in `tests/e2e/`. The dev server is started automatically if
 * `webServer.reuseExistingServer` is true and a server is already running on
 * port 3000; otherwise Playwright starts it for you.
 *
 * @see https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // Retry on CI to reduce flake impact
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
