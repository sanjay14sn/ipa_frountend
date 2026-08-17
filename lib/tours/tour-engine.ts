import { driver, type DriveStep, type Driver } from "driver.js";
import type { TourDefinition } from "./tour-types";
import { tabAnchor } from "./tour-types";

/**
 * Pure driver.js wrapper — no React, no context. The hook layer
 * (hooks/use-guided-tour.ts) owns eligibility, persistence and the skip
 * confirmation dialog; this module owns the overlay lifecycle.
 */

export interface StartTourOptions {
  /** Filtered-step index to resume at (skip-cancel flow). */
  startAt?: number;
  /** Fired when the user clicks Finish on the last step. */
  onFinished: () => void;
  /**
   * Fired when the user clicks "Skip tour": the overlay is already torn down;
   * the caller shows the confirm dialog and either marks the tour complete or
   * resumes at the given index.
   */
  onSkipRequested: (stepIndex: number) => void;
}

// Module-level singleton: React strict-mode double effects and the
// help-button/auto-start race both funnel through here — a second start
// while one tour is active is a no-op.
let active: Driver | null = null;

export function isTourActive(): boolean {
  return active != null;
}

/** Tear down without completion side-effects (unmount, route change). */
export function stopTour(): void {
  const instance = active;
  // Clear FIRST so onDestroyed routes this teardown as external.
  active = null;
  instance?.destroy();
}

/** Poll until the selector matches — the auto-start readiness gate. */
export function waitForElement(
  selector: string,
  timeoutMs = 8000,
  intervalMs = 200,
): Promise<boolean> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const check = () => {
      if (document.querySelector(selector)) {
        resolve(true);
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        resolve(false);
        return;
      }
      window.setTimeout(check, intervalMs);
    };
    check();
  });
}

/**
 * Click a tab trigger the way Radix expects: TabsTrigger selects on mousedown
 * (or focus), not on a synthetic `.click()`, so the real activation events are
 * dispatched. Programmatic events bypass `disableActiveInteraction` (that only
 * blocks user pointer events on the highlighted element).
 */
function dispatchTabClick(value: string): boolean {
  const trigger = document.querySelector<HTMLElement>(tabAnchor(value));
  if (!trigger || trigger.getAttribute("data-state") === "active") return false;
  trigger.dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
  );
  trigger.dispatchEvent(
    new MouseEvent("mouseup", { bubbles: true, cancelable: true }),
  );
  trigger.click();
  return true;
}

/** Activate a tab behind the overlay; the content swap changes page height,
 * so the stage is re-measured next frame. */
function activateTab(value: string): void {
  if (dispatchTabClick(value)) {
    requestAnimationFrame(() => active?.refresh());
  }
}

/** Click the tab, give React a frame (+ a beat) to mount the panel, then go. */
function afterTabMount(value: string | undefined, go: () => void): void {
  if (value) dispatchTabClick(value);
  if (!value) {
    go();
    return;
  }
  requestAnimationFrame(() => window.setTimeout(go, 30));
}

/** Expand an icon-collapsed sidebar so nav-link labels are visible. */
function ensureSidebarExpanded(): void {
  const sidebar = document.querySelector('[data-testid="portal-sidebar"]');
  if (sidebar?.getAttribute("data-state") === "collapsed") {
    document.querySelector<HTMLElement>('[data-sidebar="trigger"]')?.click();
  }
}

export function startTour(def: TourDefinition, options: StartTourOptions): void {
  if (active != null) return;

  if (def.steps.some((step) => step.anchor?.includes('data-tour="nav:'))) {
    ensureSidebarExpanded();
  }

  // Conditional widgets (e.g. a card that only renders with data) drop out
  // here so the step counter reflects what the user will actually see.
  // Tab-carrying steps always survive: their anchor may live inside a tab
  // panel that only mounts on activation (some pages even UNMOUNT inactive
  // panels) — navigation below activates the tab before moving, and driver's
  // per-step element wait + skipMissingElement cover the remaining gap.
  const visibleSteps = def.steps.filter(
    (step) =>
      step.anchor === null ||
      step.tab != null ||
      document.querySelector(step.anchor) != null,
  );
  if (visibleSteps.length === 0) return;

  const driveSteps: DriveStep[] = visibleSteps.map((step) => ({
    ...(step.anchor ? { element: step.anchor } : {}),
    // Safety net for resume/jump paths; navigation already pre-activates.
    ...(step.tab
      ? { onHighlightStarted: () => activateTab(step.tab!), waitForElement: 2500 }
      : {}),
    popover: { title: step.title, description: step.body },
  }));

  const finishTour = () => {
    if (active !== instance) return;
    active = null;
    instance.destroy();
    options.onFinished();
  };

  const instance = driver({
    animate: true,
    allowClose: false,
    allowKeyboardControl: false,
    disableActiveInteraction: true,
    skipMissingElement: true,
    // Next/Back are the only way through — overlay clicks do nothing.
    overlayClickBehavior: () => {},
    overlayOpacity: 0.65,
    smoothScroll: true,
    stagePadding: 6,
    stageRadius: 10,
    showProgress: true,
    progressText: "{{current}} of {{total}}",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Finish",
    showButtons: ["next", "previous"],
    popoverClass: "ipa-tour",
    steps: driveSteps,
    // Outcome routing lives in the button handlers, NOT in onDestroyed:
    // driver.js skips its destroy hooks when destroy() lands mid-transition
    // (its internal __activeStep is only set once the ~400ms highlight
    // animation settles), so a fast "Skip tour" click would silently lose the
    // callback and strand the engine. The handlers below clear the singleton
    // and call back unconditionally instead.
    onPopoverRender: (popover) => {
      if (popover.footer.querySelector(".ipa-tour-skip")) return;
      const skip = document.createElement("button");
      skip.type = "button";
      skip.className = "ipa-tour-skip";
      skip.textContent = "Skip tour";
      skip.onclick = () => {
        if (active !== instance) return;
        const stepIndex = instance.getActiveIndex() ?? 0;
        active = null;
        instance.destroy();
        options.onSkipRequested(stepIndex);
      };
      popover.footer.insertBefore(skip, popover.footer.firstChild);
    },
    // Navigation is controlled so the TARGET step's tab activates (and its
    // panel mounts) BEFORE driver looks for the element. Overriding
    // onNextClick means the last step's Finish click also lands here — route
    // it to the finish flow.
    onNextClick: () => {
      if (active !== instance) return;
      if (instance.isLastStep()) {
        finishTour();
        return;
      }
      const index = instance.getActiveIndex() ?? 0;
      afterTabMount(visibleSteps[index + 1]?.tab, () => {
        if (active === instance) instance.moveNext();
      });
    },
    onPrevClick: () => {
      if (active !== instance) return;
      const index = instance.getActiveIndex() ?? 0;
      if (index <= 0) return;
      afterTabMount(visibleSteps[index - 1]?.tab, () => {
        if (active === instance) instance.movePrevious();
      });
    },
    onDoneClick: finishTour,
    onDestroyed: () => {
      // External teardown only (stopTour already cleared `active`); the
      // finished/skip paths run through the handlers above.
      if (active === instance) active = null;
    },
  });

  // Claim the singleton before the (possibly deferred) drive so a concurrent
  // start can't double-launch; a stopTour in the gap makes drive a no-op.
  active = instance;
  const startAt = options.startAt ?? 0;
  afterTabMount(visibleSteps[startAt]?.tab, () => {
    if (active === instance) instance.drive(startAt);
  });
}
