import { describe, expect, it } from "vitest";

import {
  CI_NAV,
  FRANCHISEE_NAV,
  SUPER_ADMIN_NAV,
  type PortalNavSection,
} from "@/lib/navigation/nav-config";
import {
  ALL_TOURS,
  isTourCompleted,
  KNOWN_WIDGET_ANCHORS,
  TOURS,
} from "./tour-registry";
import { STAFF_ADMIN_OPERATIONS_TABS } from "./staff-admin-tour";
import { navAnchor, tabAnchor, type TourDefinition } from "./tour-types";

const NAV_ANCHOR_RE = /^\[data-tour="nav:(.+)"\]$/;
const TAB_ANCHOR_RE = /^\[data-tour="tab:(.+)"\]$/;

function navHrefs(nav: readonly PortalNavSection[]): Set<string> {
  return new Set(nav.flatMap((section) => section.items.map((i) => i.href)));
}

/** The nav config each tour's `nav:` anchors must resolve against. */
const NAV_BY_TOUR: Record<string, Set<string>> = {
  [TOURS.superAdmin.key]: navHrefs(SUPER_ADMIN_NAV),
  [TOURS.staffAdmin.key]: new Set<string>(), // header-only shell, no sidebar
  [TOURS.franchisee.key]: navHrefs(FRANCHISEE_NAV),
  [TOURS.ci.key]: navHrefs(CI_NAV),
};

describe("tour registry", () => {
  it("keys are kebab-case and versions are positive integers", () => {
    for (const def of ALL_TOURS) {
      expect(def.key).toMatch(/^[a-z0-9-]+$/);
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

  it("every nav: anchor resolves to a real href in that role's nav config", () => {
    for (const def of ALL_TOURS) {
      const hrefs = NAV_BY_TOUR[def.key];
      expect(hrefs).toBeDefined();
      for (const step of def.steps) {
        const match = step.anchor?.match(NAV_ANCHOR_RE);
        if (!match) continue;
        expect(
          hrefs.has(match[1]),
          `${def.key}: nav anchor ${step.anchor} has no matching nav-config href`,
        ).toBe(true);
      }
    }
  });

  it("every tab: anchor (and step.tab) is a known operations tab", () => {
    const tabs = new Set<string>(STAFF_ADMIN_OPERATIONS_TABS);
    for (const def of ALL_TOURS) {
      for (const step of def.steps) {
        const match = step.anchor?.match(TAB_ANCHOR_RE);
        if (match) {
          expect(
            tabs.has(match[1]),
            `${def.key}: unknown tab anchor ${step.anchor}`,
          ).toBe(true);
        }
        if (step.tab) {
          expect(tabs.has(step.tab), `${def.key}: unknown step.tab ${step.tab}`).toBe(
            true,
          );
          // A tab step must highlight the trigger it activates (or be centered).
          if (step.anchor != null) expect(step.anchor).toBe(tabAnchor(step.tab));
        }
      }
    }
  });

  it("every widget/testid anchor is registered in KNOWN_WIDGET_ANCHORS", () => {
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
      // readyWhen is either a registered widget anchor or a known tab anchor.
      const readyTab = def.readyWhen.match(TAB_ANCHOR_RE);
      expect(
        readyTab
          ? new Set<string>(STAFF_ADMIN_OPERATIONS_TABS).has(readyTab[1])
          : known.has(def.readyWhen),
        `${def.key}: readyWhen not registered`,
      ).toBe(true);
    }
  });

  it("nav anchors use the same derivation the sidebar renders", () => {
    // portal-sidebar renders data-tour={`nav:${item.href}`} — a divergence in
    // navAnchor() would silently orphan every sidebar step.
    expect(navAnchor("/admin/students")).toBe('[data-tour="nav:/admin/students"]');
  });
});

describe("isTourCompleted", () => {
  const def: TourDefinition = TOURS.franchisee;

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
