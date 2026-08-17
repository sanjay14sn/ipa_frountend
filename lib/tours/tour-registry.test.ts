import { describe, expect, it } from "vitest";

import {
  CI_NAV,
  FRANCHISEE_NAV,
  SUPER_ADMIN_NAV,
  type PortalNavSection,
} from "@/lib/navigation/nav-config";
import {
  ALL_TOURS,
  CI_TOURS,
  FRANCHISEE_TOURS,
  STAFF_ADMIN_TOURS,
  SUPER_ADMIN_TOURS,
  findTourForPage,
  isTourCompleted,
  KNOWN_WIDGET_ANCHORS,
  mainTour,
} from "./tour-registry";
import { navAnchor, tabAnchor, type TourDefinition } from "./tour-types";

const NAV_ANCHOR_RE = /^\[data-tour="nav:(.+)"\]$/;
const TAB_ANCHOR_RE = /^\[data-tour="tab:(.+)"\]$/;

function navHrefs(nav: readonly PortalNavSection[]): Set<string> {
  return new Set(nav.flatMap((section) => section.items.map((i) => i.href)));
}

/** Role lists and the nav config their `nav:` anchors must resolve against. */
const ROLE_LISTS: Array<{
  name: string;
  tours: readonly TourDefinition[];
  navHrefs: Set<string>;
  mainKey: string;
}> = [
  {
    name: "superAdmin",
    tours: SUPER_ADMIN_TOURS,
    navHrefs: navHrefs(SUPER_ADMIN_NAV),
    mainKey: "super-admin-dashboard",
  },
  {
    name: "staffAdmin",
    tours: STAFF_ADMIN_TOURS,
    navHrefs: new Set<string>(), // header-only shell, no sidebar
    mainKey: "staff-admin-operations",
  },
  {
    name: "franchisee",
    tours: FRANCHISEE_TOURS,
    navHrefs: navHrefs(FRANCHISEE_NAV),
    mainKey: "franchisee-dashboard",
  },
  {
    name: "ci",
    tours: CI_TOURS,
    navHrefs: navHrefs(CI_NAV),
    mainKey: "ci-dashboard",
  },
];

describe("tour registry", () => {
  it("keys are unique, kebab-case, ≤64 chars; versions are positive integers", () => {
    const keys = new Set<string>();
    for (const def of ALL_TOURS) {
      expect(def.key).toMatch(/^[a-z0-9-]+$/);
      expect(def.key.length).toBeLessThanOrEqual(64);
      expect(keys.has(def.key), `duplicate key ${def.key}`).toBe(false);
      keys.add(def.key);
      expect(Number.isInteger(def.version)).toBe(true);
      expect(def.version).toBeGreaterThanOrEqual(1);
      expect(def.steps.length).toBeGreaterThan(0);
      expect(def.page.startsWith("/")).toBe(true);
    }
  });

  it("definitions are frozen", () => {
    for (const def of ALL_TOURS) {
      expect(Object.isFrozen(def)).toBe(true);
      expect(Object.isFrozen(def.steps)).toBe(true);
      for (const step of def.steps) expect(Object.isFrozen(step)).toBe(true);
    }
  });

  it("each role list has unique pages with the main tour first", () => {
    for (const { name, tours, mainKey } of ROLE_LISTS) {
      expect(mainTour(tours).key, `${name}: main tour`).toBe(mainKey);
      const pages = tours.map((def) => def.page);
      expect(new Set(pages).size, `${name}: duplicate page`).toBe(pages.length);
    }
  });

  it("findTourForPage resolves exact pages and misses unknown ones", () => {
    expect(findTourForPage(SUPER_ADMIN_TOURS, "/admin/students")?.key).toBe(
      "admin-students",
    );
    expect(findTourForPage(SUPER_ADMIN_TOURS, "/admin/profile")).toBeNull();
    expect(findTourForPage(STAFF_ADMIN_TOURS, "/admin/operations")?.key).toBe(
      "staff-admin-operations",
    );
    expect(findTourForPage(FRANCHISEE_TOURS, "/franchisee/orders")?.key).toBe(
      "franchisee-orders",
    );
  });

  it("every nav: anchor resolves to a real href in that role's nav config", () => {
    for (const { name, tours, navHrefs: hrefs } of ROLE_LISTS) {
      for (const def of tours) {
        for (const step of def.steps) {
          const match = step.anchor?.match(NAV_ANCHOR_RE);
          if (!match) continue;
          expect(
            hrefs.has(match[1]),
            `${name}/${def.key}: nav anchor ${step.anchor} has no matching nav-config href`,
          ).toBe(true);
        }
      }
    }
  });

  it("every tab: anchor (and step.tab) is declared in that tour's tabs", () => {
    for (const def of ALL_TOURS) {
      const tabs = new Set<string>(def.tabs ?? []);
      for (const step of def.steps) {
        const match = step.anchor?.match(TAB_ANCHOR_RE);
        if (match) {
          expect(
            tabs.has(match[1]),
            `${def.key}: tab anchor ${step.anchor} not in def.tabs`,
          ).toBe(true);
        }
        if (step.tab) {
          expect(
            tabs.has(step.tab),
            `${def.key}: step.tab ${step.tab} not in def.tabs`,
          ).toBe(true);
          // A tab-activating step highlights its own trigger, a widget on
          // that tab, or is centered — never another tab's trigger.
          const anchorTab = step.anchor?.match(TAB_ANCHOR_RE)?.[1];
          if (anchorTab != null) expect(anchorTab).toBe(step.tab);
        }
      }
    }
  });

  it("every widget/testid anchor (and readyWhen) is registered", () => {
    const known = new Set(KNOWN_WIDGET_ANCHORS);
    for (const def of ALL_TOURS) {
      for (const step of def.steps) {
        if (step.anchor == null) continue;
        if (NAV_ANCHOR_RE.test(step.anchor) || TAB_ANCHOR_RE.test(step.anchor)) {
          continue;
        }
        expect(
          known.has(step.anchor),
          `${def.key}: anchor ${step.anchor} missing from KNOWN_WIDGET_ANCHORS`,
        ).toBe(true);
      }
      // readyWhen is either a registered widget anchor or a declared tab anchor.
      const readyTab = def.readyWhen.match(TAB_ANCHOR_RE);
      expect(
        readyTab
          ? new Set(def.tabs ?? []).has(readyTab[1])
          : known.has(def.readyWhen),
        `${def.key}: readyWhen not registered`,
      ).toBe(true);
    }
  });

  it("nav anchors use the same derivation the sidebar renders", () => {
    // portal-sidebar renders data-tour={`nav:${item.href}`} — a divergence in
    // navAnchor() would silently orphan every sidebar step.
    expect(navAnchor("/admin/students")).toBe('[data-tour="nav:/admin/students"]');
    expect(tabAnchor("roster")).toBe('[data-tour="tab:roster"]');
  });
});

describe("isTourCompleted", () => {
  const def: TourDefinition = mainTour(FRANCHISEE_TOURS);

  it("fails open: missing map counts as completed", () => {
    expect(isTourCompleted(undefined, def)).toBe(true);
    expect(isTourCompleted(null, def)).toBe(true);
  });

  it("empty map means not completed", () => {
    expect(isTourCompleted({}, def)).toBe(false);
  });

  it("an entry at or above the current version completes; below re-shows", () => {
    const at = { [def.key]: { version: def.version, completedAt: "2026-08-17" } };
    const above = {
      [def.key]: { version: def.version + 1, completedAt: "2026-08-17" },
    };
    const below = { [def.key]: { version: 0, completedAt: "2026-08-17" } };
    expect(isTourCompleted(at, def)).toBe(true);
    expect(isTourCompleted(above, def)).toBe(true);
    expect(isTourCompleted(below, def)).toBe(false);
  });

  it("other tours' entries don't complete this one", () => {
    expect(
      isTourCompleted({ "some-other-tour": { version: 9, completedAt: "x" } }, def),
    ).toBe(false);
  });
});
