"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/context/user-context";
import { useCIAuth } from "@/context/ci-auth-context";
import { isFranchiseOperational } from "@/lib/auth";
import { getAdminProfile } from "@/services/auth.service";
import { queryKeys } from "@/hooks/api/query-keys";
import { useMarkTourComplete, type TourPortal } from "@/hooks/api/tours.hooks";
import {
  CI_TOURS,
  FRANCHISEE_TOURS,
  STAFF_ADMIN_TOURS,
  SUPER_ADMIN_TOURS,
  findTourForPage,
  isTourCompleted,
  mainTour,
} from "@/lib/tours/tour-registry";
import type { TourDefinition, ToursCompletedMap } from "@/lib/tours/tour-types";
import { startTour, stopTour, waitForElement } from "@/lib/tours/tour-engine";

/**
 * Eligibility + auto-start + persistence wiring for the guided tours
 * (docs/guided-tours/). Mounted once per portal via TourHelpButton in
 * PortalHeaderActions; the overlay itself lives in lib/tours/tour-engine.
 *
 * Each role has a list of tours (main shell tour first + per-page mini-tours).
 * The current page's tour auto-starts on first visit; the ? button replays the
 * current page's tour, falling back to the main tour elsewhere.
 */

// Module-level session state: survives re-renders and remounts, resets on a
// full page load. `startedThisSession` stops re-auto-starts (and doubles as
// the strict-mode guard); `pendingStartKey` carries a ?-button click across
// the router.push to the target tour's page.
const startedThisSession = new Set<string>();
let pendingStartKey: string | null = null;

interface PendingSkip {
  def: TourDefinition;
  stepIndex: number;
}

export interface GuidedTourControls {
  /** An eligible tour exists for this user — the ? button renders only then. */
  available: boolean;
  /** Manual (re)start from the ? button; navigates to the tour page first. */
  start: () => void;
  /** Non-null while the skip-confirm dialog is open (the paused step index). */
  skipStepIndex: number | null;
  /**
   * Bumped on every skip request — used as the ConfirmDialog's React key so a
   * rapid skip → cancel → skip re-open mounts a FRESH Radix AlertDialog.
   * Re-opening the same one inside its exit animation trips Radix Presence:
   * the content mounts data-state="closed" and unmounts while open=true.
   */
  skipNonce: number;
  confirmSkip: () => void;
  cancelSkip: () => void;
}

export function useGuidedTour(portal: TourPortal): GuidedTourControls {
  const { user } = useUser();
  const { user: ciUser, agreementPhase, refresh: refreshCI } = useCIAuth();
  const pathname = usePathname();
  const router = useRouter();
  const markTourComplete = useMarkTourComplete(portal);
  const [pendingSkip, setPendingSkip] = useState<PendingSkip | null>(null);
  const [skipNonce, setSkipNonce] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  // Same key + queryFn as the UserProvider's admin query — shared cache, no
  // extra fetch; this is where `toursCompleted` is read for admins (the user
  // context copies only mail/adminRole/state onto the user object).
  const adminProfileQuery = useQuery({
    queryKey: queryKeys.auth.adminProfile(),
    queryFn: getAdminProfile,
    enabled:
      typeof window !== "undefined" &&
      portal === "admin" &&
      user?.role === "admin",
    staleTime: 60_000,
  });

  // Tours are desktop-only (the sidebar collapses into a sheet below md).
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // Resolve the role's tour list + completion source.
  let roleTours: readonly TourDefinition[] | null = null;
  let stateLoaded = false;
  let toursCompleted: ToursCompletedMap | undefined;
  if (portal === "admin") {
    // adminRole arrives with the profile fetch — no tours until it's known.
    if (user?.role === "admin" && user.adminRole) {
      roleTours =
        user.adminRole === "super" ? SUPER_ADMIN_TOURS : STAFF_ADMIN_TOURS;
      stateLoaded = adminProfileQuery.data !== undefined;
      toursCompleted = adminProfileQuery.data?.toursCompleted;
    }
  } else if (portal === "franchisee") {
    // Funnel (pre-agreement) franchisees are excluded by design.
    if (
      user &&
      (user.role === "franchisee" || user.role === "franchise") &&
      isFranchiseOperational(user)
    ) {
      roleTours = FRANCHISEE_TOURS;
      stateLoaded = user.profile != null;
      toursCompleted = user.profile?.toursCompleted;
    }
  } else if (ciUser && agreementPhase === "SIGNED") {
    // Pre-signature CIs are excluded by design (their header has no actions).
    roleTours = CI_TOURS;
    stateLoaded = true;
    toursCompleted = ciUser.toursCompleted;
  }

  const pageTour = roleTours ? findTourForPage(roleTours, pathname) : null;
  const fallbackTour = roleTours ? mainTour(roleTours) : null;
  const pageTourCompleted = pageTour
    ? isTourCompleted(toursCompleted, pageTour)
    : true;

  const markComplete = useCallback(
    (def: TourDefinition) => {
      markTourComplete.mutate(
        { tourKey: def.key, version: def.version },
        {
          onSuccess: () => {
            if (portal === "ci") void refreshCI();
          },
        },
      );
      // Belt-and-braces: even if the write fails, don't re-offer this session.
      startedThisSession.add(def.key);
    },
    // mutate is referentially stable in react-query v5.
    [markTourComplete.mutate, portal, refreshCI],
  );

  const launch = useCallback(
    (def: TourDefinition, startAt = 0) => {
      startTour(def, {
        startAt,
        onFinished: () => markComplete(def),
        onSkipRequested: (stepIndex) => {
          setSkipNonce((n) => n + 1);
          setPendingSkip({ def, stepIndex });
        },
      });
    },
    [markComplete],
  );

  // Safety net FIRST (declaration order = run order per commit): a route
  // change mid-tour (programmatic redirect — user navigation is blocked by
  // the overlay) must not leave a stranded overlay. No-ops when idle.
  useEffect(() => {
    stopTour();
  }, [pathname]);
  useEffect(() => () => stopTour(), []);

  // Auto-start: first visit to a tour's page once the server says "not
  // completed" and the page's real data has rendered. A pending ?-click
  // (cross-page start) bypasses the completed/session checks.
  useEffect(() => {
    if (!pageTour || !isDesktop || pathname !== pageTour.page) return;
    const isPendingManualStart = pendingStartKey === pageTour.key;
    if (!isPendingManualStart) {
      if (
        !stateLoaded ||
        pageTourCompleted ||
        startedThisSession.has(pageTour.key)
      ) {
        return;
      }
    }
    let cancelled = false;
    void waitForElement(pageTour.readyWhen).then((found) => {
      if (cancelled || !found) return;
      if (pendingStartKey === pageTour.key) pendingStartKey = null;
      startedThisSession.add(pageTour.key);
      launch(pageTour);
    });
    return () => {
      cancelled = true;
    };
  }, [pageTour, isDesktop, pathname, stateLoaded, pageTourCompleted, launch]);

  const start = useCallback(() => {
    const target = pageTour ?? fallbackTour;
    if (!target) return;
    if (pathname !== target.page) {
      pendingStartKey = target.key;
      router.push(target.page);
      return;
    }
    startedThisSession.add(target.key);
    void waitForElement(target.readyWhen).then((found) => {
      if (found) launch(target);
    });
  }, [pageTour, fallbackTour, pathname, router, launch]);

  const confirmSkip = useCallback(() => {
    if (pendingSkip) markComplete(pendingSkip.def);
    setPendingSkip(null);
  }, [pendingSkip, markComplete]);

  const cancelSkip = useCallback(() => {
    const paused = pendingSkip;
    setPendingSkip(null);
    if (paused) launch(paused.def, paused.stepIndex);
  }, [pendingSkip, launch]);

  return {
    available: roleTours != null,
    start,
    skipStepIndex: pendingSkip?.stepIndex ?? null,
    skipNonce,
    confirmSkip,
    cancelSkip,
  };
}
