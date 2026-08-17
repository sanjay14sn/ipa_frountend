/**
 * Guided-tour definitions — see docs/guided-tours/ for the architecture record
 * and the per-role step content (edit copy there first, then mirror it here).
 *
 * Mirrors nav-config: frozen constants consumed by the engine, unit-tested
 * against the nav config so a renamed route can't silently orphan a tour step.
 */

export interface TourStep {
  /**
   * CSS selector the step highlights, or null for a centered element-less
   * step (welcome/finish). Steps whose selector matches nothing when the tour
   * starts are dropped, so conditional widgets never strand the tour.
   */
  anchor: string | null;
  title: string;
  body: string;
  /**
   * PageTabs value to activate before highlighting (staff-admin tab-walk).
   * The engine clicks `[data-tour="tab:<value>"]` so the content behind the
   * overlay follows the step.
   */
  tab?: string;
}

export interface TourDefinition {
  /** Server-side completion key — kebab-case, stable across versions. */
  key: string;
  /**
   * Bump to re-show the tour to everyone after a layout-level change (nav
   * items moved/renamed, landing page restructured) — never for copy tweaks.
   */
  version: number;
  /** Pathname the tour runs on; the ? button navigates here first. */
  page: string;
  /** Selector that must exist before auto-start (real data, not skeletons). */
  readyWhen: string;
  /**
   * The page's tab values (PageTabs or hand-anchored raw tabs). Purely for the
   * registry test: every `tab:` anchor and `step.tab` must be listed here.
   */
  tabs?: readonly string[];
  steps: readonly TourStep[];
}

/** Shape of the server-side per-user completion map (`toursCompleted`). */
export type ToursCompletedMap = Record<
  string,
  { version: number; completedAt: string }
>;

/** Sidebar nav-link anchor — derived from the nav item's href, so
 * lib/navigation/nav-config.ts stays the single source of truth. */
export function navAnchor(href: string): string {
  return `[data-tour="nav:${href}"]`;
}

/** PageTabs trigger anchor — derived from the tab value. */
export function tabAnchor(value: string): string {
  return `[data-tour="tab:${value}"]`;
}

/** Page-widget anchor (`data-tour="<kebab-id>"`). */
export function widgetAnchor(id: string): string {
  return `[data-tour="${id}"]`;
}

/** Reuse of an existing kit `data-testid` as a tour anchor. */
export function testIdAnchor(id: string): string {
  return `[data-testid="${id}"]`;
}

export function freezeTour(def: TourDefinition): TourDefinition {
  for (const step of def.steps) Object.freeze(step);
  Object.freeze(def.steps);
  return Object.freeze(def);
}
