/**
 * tests/e2e/smoke.test.ts — Playwright E2E smoke tests.
 *
 * These tests validate the most critical user journeys against a running dev
 * or staging server. They are not unit tests — a live backend is required.
 *
 * Setup: `npx playwright install` (installs browser binaries)
 * Run: `pnpm test:e2e`
 *
 * @see playwright.config.ts
 */

import { test, expect } from "@playwright/test";

/**
 * Smoke test 1: Admin login page renders.
 *
 * Does not require valid credentials — just confirms the login form exists.
 */
test("admin login page renders", async ({ page }) => {
  await page.goto("/admin-login");
  await expect(page.locator("form")).toBeVisible();
  await expect(page.locator("input[type='email'], input[name='email'], input[name='username']")).toBeVisible();
});

/**
 * Smoke test 2: Franchisee login page renders.
 */
test("franchisee login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("form")).toBeVisible();
});

/**
 * Smoke test 3: Unauthenticated access to /admin redirects to login.
 */
test("unauthenticated /admin redirects to login", async ({ page }) => {
  await page.goto("/admin");
  // Should end up on a login page (either /admin-login or /login)
  await expect(page).toHaveURL(/login/);
});

/**
 * Smoke test 4: Unauthenticated access to /franchisee redirects to login.
 */
test("unauthenticated /franchisee redirects to login", async ({ page }) => {
  await page.goto("/franchisee");
  await expect(page).toHaveURL(/login/);
});

/**
 * Smoke test 5: CI login renders at /ci-login; the legacy /ci/login URL
 * (still baked into old credential emails) 307s to it.
 */
test("ci login page renders and legacy /ci/login redirects", async ({ page }) => {
  await page.goto("/ci/login");
  await expect(page).toHaveURL(/\/ci-login/);
  await expect(page.locator("form")).toBeVisible();
});

/**
 * Smoke test 6: Unauthenticated access to the CI portal redirects to /ci-login.
 */
test("unauthenticated /ci redirects to ci login", async ({ page }) => {
  await page.goto("/ci/dashboard");
  await expect(page).toHaveURL(/\/ci-login/);
});

/**
 * Smoke test 7: 404 page renders for unknown routes.
 */
test("unknown route shows 404 page", async ({ page }) => {
  const response = await page.goto("/this-route-does-not-exist-at-all");
  // Either a 404 status or a branded not-found page
  const status = response?.status();
  const bodyText = await page.textContent("body");
  const has404 = status === 404 || (bodyText?.toLowerCase().includes("not found") ?? false);
  expect(has404).toBe(true);
});
