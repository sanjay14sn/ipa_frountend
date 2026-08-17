import type { TourDefinition, ToursCompletedMap } from "./tour-types";
import { widgetAnchor, testIdAnchor } from "./tour-types";
import { SUPER_ADMIN_TOUR } from "./super-admin-tour";
import { STAFF_ADMIN_TOUR } from "./staff-admin-tour";
import { FRANCHISEE_TOUR } from "./franchisee-tour";
import { CI_TOUR } from "./ci-tour";
import {
  ADMIN_ADMINS_TOUR,
  ADMIN_BULK_IMPORT_TOUR,
  ADMIN_CI_HUB_TOUR,
  ADMIN_FRANCHISE_HUB_TOUR,
  ADMIN_OPERATIONS_HQ_TOUR,
  ADMIN_PROGRAMS_TOUR,
  ADMIN_REGIONAL_OPERATIONS_TOUR,
  ADMIN_STUDENTS_TOUR,
} from "./admin-page-tours";
import {
  FRANCHISEE_COURSE_INSTRUCTORS_TOUR,
  FRANCHISEE_ORDERS_TOUR,
  FRANCHISEE_STUDENTS_TOUR,
} from "./franchisee-page-tours";
import { CI_AGREEMENT_TOUR, CI_TRAINING_TOUR } from "./ci-page-tours";

/**
 * One frozen tour list per role, MAIN (shell + dashboard) tour first — the ?
 * button falls back to it on pages without their own tour. Page mini-tours
 * resolve by exact pathname via findTourForPage. New tours register here
 * (see docs/guided-tours/README.md).
 *
 * Superadmin and staff admin deliberately get different tours on
 * /admin/operations — membership in these lists is the role gate.
 */
export const SUPER_ADMIN_TOURS: readonly TourDefinition[] = Object.freeze([
  SUPER_ADMIN_TOUR,
  ADMIN_FRANCHISE_HUB_TOUR,
  ADMIN_STUDENTS_TOUR,
  ADMIN_CI_HUB_TOUR,
  ADMIN_OPERATIONS_HQ_TOUR,
  ADMIN_REGIONAL_OPERATIONS_TOUR,
  ADMIN_BULK_IMPORT_TOUR,
  ADMIN_PROGRAMS_TOUR,
  ADMIN_ADMINS_TOUR,
]);

export const STAFF_ADMIN_TOURS: readonly TourDefinition[] = Object.freeze([
  STAFF_ADMIN_TOUR,
]);

export const FRANCHISEE_TOURS: readonly TourDefinition[] = Object.freeze([
  FRANCHISEE_TOUR,
  FRANCHISEE_STUDENTS_TOUR,
  FRANCHISEE_COURSE_INSTRUCTORS_TOUR,
  FRANCHISEE_ORDERS_TOUR,
]);

export const CI_TOURS: readonly TourDefinition[] = Object.freeze([
  CI_TOUR,
  CI_AGREEMENT_TOUR,
  CI_TRAINING_TOUR,
]);

export const ALL_TOURS: readonly TourDefinition[] = Object.freeze([
  ...SUPER_ADMIN_TOURS,
  ...STAFF_ADMIN_TOURS,
  ...FRANCHISEE_TOURS,
  ...CI_TOURS,
]);

/** The role's shell + dashboard tour — the ? button's fallback. */
export function mainTour(tours: readonly TourDefinition[]): TourDefinition {
  return tours[0];
}

/** The tour that runs on this pathname, if any (exact match). */
export function findTourForPage(
  tours: readonly TourDefinition[],
  pathname: string,
): TourDefinition | null {
  return tours.find((def) => def.page === pathname) ?? null;
}

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
  // v1 dashboard/shell widgets
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
  // kit-wide anchors (emitted by PageHeaderCard / PageTabs / DataTable)
  widgetAnchor("page-actions"),
  widgetAnchor("page-tabs-list"),
  widgetAnchor("page-header-extras"),
  widgetAnchor("table-search"),
  widgetAnchor("table-filters"),
  widgetAnchor("table-actions"),
  testIdAnchor("page-header-card"),
  // per-page one-offs
  widgetAnchor("onboard-franchise"),
  widgetAnchor("ci-training-subtabs"),
  widgetAnchor("procurement-subtabs"),
  widgetAnchor("program-sections"),
  widgetAnchor("bulk-import-tiles"),
  widgetAnchor("certificates-subtabs"),
  widgetAnchor("orders-summary"),
  widgetAnchor("receivables-summary"),
  widgetAnchor("ci-agreement-view"),
  testIdAnchor("ci-agreement-picker"),
]);
