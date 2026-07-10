import { describe, expect, it } from "vitest";

import {
  ADMIN_NAV,
  CI_NAV,
  FRANCHISEE_NAV,
  getAdminNav,
  isNavItemActive,
  SUPER_ADMIN_NAV,
  type PortalNavItem,
} from "./nav-config";

function findItem(
  nav: readonly { title: string; items: readonly PortalNavItem[] }[],
  title: string,
): PortalNavItem {
  for (const section of nav) {
    const hit = section.items.find((item) => item.title === title);
    if (hit) return hit;
  }
  throw new Error(`nav item not found: ${title}`);
}

describe("isNavItemActive", () => {
  it("exact items activate only on an exact pathname match", () => {
    const dashboard = findItem(ADMIN_NAV, "Dashboard");
    expect(isNavItemActive("/admin/dashboard", dashboard)).toBe(true);
    expect(isNavItemActive("/admin/dashboard/anything", dashboard)).toBe(false);
    expect(isNavItemActive("/admin", dashboard)).toBe(false);
  });

  it("prefix items match themselves and true sub-paths only", () => {
    const franchise = findItem(ADMIN_NAV, "Franchise");
    expect(isNavItemActive("/admin/franchise", franchise)).toBe(true);
    expect(isNavItemActive("/admin/franchise/42", franchise)).toBe(true);
    // `/` boundary: no false match on a sibling sharing the prefix string.
    expect(isNavItemActive("/admin/franchise-other", franchise)).toBe(false);
  });

  it("operations does not false-match regional-operations", () => {
    const hq = findItem(SUPER_ADMIN_NAV, "HQ");
    const regional = findItem(SUPER_ADMIN_NAV, "Regional");
    expect(isNavItemActive("/admin/regional-operations", hq)).toBe(false);
    expect(isNavItemActive("/admin/regional-operations", regional)).toBe(true);
    expect(isNavItemActive("/admin/operations", hq)).toBe(true);
    expect(isNavItemActive("/admin/operations", regional)).toBe(false);
  });

  it("ignores querystrings baked into hrefs", () => {
    const item: PortalNavItem = {
      title: "X",
      href: "/admin/operations?tab=orders",
      icon: findItem(ADMIN_NAV, "Operations").icon,
    };
    expect(isNavItemActive("/admin/operations", item)).toBe(true);
  });
});

describe("getAdminNav composition", () => {
  it("staff (and unknown roles) get the base admin nav", () => {
    expect(getAdminNav("staff")).toBe(ADMIN_NAV);
    expect(getAdminNav(undefined)).toBe(ADMIN_NAV);
  });

  it("super gets Programs + Admins in Overview and an Operations group", () => {
    expect(getAdminNav("super")).toBe(SUPER_ADMIN_NAV);
    const overview = SUPER_ADMIN_NAV[0];
    expect(overview.items.map((i) => i.title)).toEqual([
      "Dashboard",
      "Programs & Levels",
      "Admins",
    ]);
    const management = SUPER_ADMIN_NAV[1];
    expect(management.items.some((i) => i.href === "/admin/operations")).toBe(
      false,
    );
    const operations = SUPER_ADMIN_NAV[2];
    expect(operations.title).toBe("Operations");
    expect(operations.items.map((i) => i.href)).toEqual([
      "/admin/operations",
      "/admin/regional-operations",
    ]);
  });
});

describe("CI nav (CI-04 collapse)", () => {
  it("has exactly three items: Dashboard, My Agreement, Training", () => {
    const titles = CI_NAV.flatMap((s) => s.items.map((i) => i.title));
    expect(titles).toEqual(["Dashboard", "My Agreement", "Training"]);
  });

  it("Training is active on the hub and any of its tabs", () => {
    const training = findItem(CI_NAV, "Training");
    expect(isNavItemActive("/ci/training", training)).toBe(true);
    // ?tab= lives in the querystring — pathname stays /ci/training.
    expect(isNavItemActive("/ci/dashboard", training)).toBe(false);
  });
});

describe("frozen-ness", () => {
  it("nav constants are deeply frozen", () => {
    for (const nav of [ADMIN_NAV, SUPER_ADMIN_NAV, FRANCHISEE_NAV, CI_NAV]) {
      expect(Object.isFrozen(nav)).toBe(true);
      for (const section of nav) {
        expect(Object.isFrozen(section)).toBe(true);
        expect(Object.isFrozen(section.items)).toBe(true);
        for (const item of section.items) {
          expect(Object.isFrozen(item)).toBe(true);
        }
      }
    }
  });
});
