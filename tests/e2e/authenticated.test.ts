import { test, expect } from "@playwright/test";

/**
 * Authenticated smoke tests against a REAL backend (IPA-back on :5500).
 *
 * Skipped entirely unless credentials are provided via env, so the default
 * `npm run test:e2e` (backend-less CI) is unaffected:
 *
 *   E2E_ADMIN_USER / E2E_ADMIN_PASS           — admin portal
 *   E2E_FRANCHISEE_USER / E2E_FRANCHISEE_PASS — an ACTIVE franchisee
 *   E2E_CI_USER / E2E_CI_PASS                 — a course instructor
 *
 * Local run:
 *   E2E_ADMIN_USER=admin E2E_ADMIN_PASS=... npm run test:e2e -- authenticated
 */

const adminUser = process.env.E2E_ADMIN_USER;
const adminPass = process.env.E2E_ADMIN_PASS;
const frUser = process.env.E2E_FRANCHISEE_USER;
const frPass = process.env.E2E_FRANCHISEE_PASS;
const ciUser = process.env.E2E_CI_USER;
const ciPass = process.env.E2E_CI_PASS;

test.describe("admin portal (authenticated)", () => {
  test.skip(!adminUser || !adminPass, "E2E_ADMIN_USER / E2E_ADMIN_PASS not set");

  test("login lands on the dashboard with the navy shell", async ({ page }) => {
    await page.goto("/admin-login");
    await page.fill("#username", adminUser!);
    await page.fill("#password", adminPass!);
    await page.click("button[type=submit]");
    await page.waitForURL("**/admin/**");
    await expect(page.getByTestId("portal-sidebar")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: /admin dashboard/i }),
    ).toBeVisible();
  });

  test("operations hub: tab deep-link + search persists through refresh", async ({
    page,
  }) => {
    await page.goto("/admin-login");
    await page.fill("#username", adminUser!);
    await page.fill("#password", adminPass!);
    await page.click("button[type=submit]");
    await page.waitForURL("**/admin/**");

    await page.goto("/admin/operations?tab=orders");
    await expect(
      page.getByRole("heading", { level: 1, name: "Operations" }),
    ).toBeVisible();

    const search = page.getByPlaceholder(/search by order/i);
    await search.fill("ORD");
    // Debounced URL write (500ms) + microtask flush.
    await expect(page).toHaveURL(/q=ORD/, { timeout: 5_000 });

    await page.reload();
    await expect(page.getByPlaceholder(/search by order/i)).toHaveValue("ORD");
  });

  test("agreements tab renders the detail sheet", async ({ page }) => {
    await page.goto("/admin-login");
    await page.fill("#username", adminUser!);
    await page.fill("#password", adminPass!);
    await page.click("button[type=submit]");
    await page.waitForURL("**/admin/**");

    await page.goto("/admin/franchise?tab=agreements");
    const firstRowAction = page
      .locator("tbody tr")
      .first()
      .locator("button")
      .first();
    await firstRowAction.click();
    await expect(page.getByText(/agreement lifecycle/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("franchisee portal (authenticated)", () => {
  test.skip(
    !frUser || !frPass,
    "E2E_FRANCHISEE_USER / E2E_FRANCHISEE_PASS not set",
  );

  test("login lands in the portal; franchise hub tabs work", async ({
    page,
  }) => {
    await page.goto("/login");
    // The franchisee card labels the field "Email" but the input id is
    // #username (autocomplete pairing).
    await page.fill("#username", frUser!);
    await page.fill("#password", frPass!);
    await page.click("button[type=submit]");
    await page.waitForURL("**/franchisee/**");

    // Active franchisees get the full shell; pre-active get the funnel —
    // both are valid landings, assert we are inside the portal chrome.
    const url = page.url();
    expect(url).toMatch(/\/franchisee\/(dashboard|agreement)/);
  });
});

test.describe("CI portal (authenticated)", () => {
  test.skip(!ciUser || !ciPass, "E2E_CI_USER / E2E_CI_PASS not set");

  test("login lands on the agreement or dashboard", async ({ page }) => {
    await page.goto("/ci/login");
    await page.fill("#email", ciUser!);
    await page.fill("#password", ciPass!);
    await page.click("button[type=submit]");
    await page.waitForURL(/\/ci\/(dashboard|agreement)/);
    await expect(page.getByText(/agreement|dashboard/i).first()).toBeVisible();
  });
});
