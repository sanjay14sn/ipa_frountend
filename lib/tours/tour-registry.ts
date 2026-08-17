import type { TourDefinition, ToursCompletedMap } from "./tour-types";
import { widgetAnchor, testIdAnchor } from "./tour-types";
import { SUPER_ADMIN_TOUR } from "./super-admin-tour";
import { STAFF_ADMIN_TOUR } from "./staff-admin-tour";
import { FRANCHISEE_TOUR } from "./franchisee-tour";
import { CI_TOUR } from "./ci-tour";

/** All tours, keyed by audience. New tours register here (see docs/guided-tours/). */
export const TOURS = Object.freeze({
  superAdmin: SUPER_ADMIN_TOUR,
  staffAdmin: STAFF_ADMIN_TOUR,
  franchisee: FRANCHISEE_TOUR,
  ci: CI_TOUR,
});

export const ALL_TOURS: readonly TourDefinition[] = Object.freeze(
  Object.values(TOURS),
);

/**
 * Completed ⇔ an entry exists at >= the tour's current version. An `undefined`
 * map (old backend, profile not loaded yet) counts as completed — fail-open,
 * the tour never auto-starts on uncertainty and never nags.
 */
export function isTourCompleted(
  toursCompleted: ToursCompletedMap | null | undefined,
  def: TourDefinition,
): boolean {
  if (toursCompleted == null) return true;
  const entry = toursCompleted[def.key];
  return entry != null && entry.version >= def.version;
}

/**
 * Every widget/testid anchor a tour may target — the registry test asserts all
 * non-nav/tab anchors are listed here, so a typo'd selector fails in CI
 * instead of silently dropping the step. Add new anchors when adding steps.
 */
export const KNOWN_WIDGET_ANCHORS: readonly string[] = Object.freeze([
  widgetAnchor("dashboard-header"),
  widgetAnchor("dashboard-stats"),
  widgetAnchor("dashboard-quick-access"),
  widgetAnchor("pending-actions"),
  widgetAnchor("recent-orders"),
  widgetAnchor("header-notifications"),
  widgetAnchor("header-profile"),
  testIdAnchor("agreement-hero"),
  testIdAnchor("franchise-rail"),
  testIdAnchor("stat-cell"),
]);
