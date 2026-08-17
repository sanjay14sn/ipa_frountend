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
import { TOURS, isTourCompleted } from "@/lib/tours/tour-registry";
import type { TourDefinition } from "@/lib/tours/tour-types";
import { startTour, stopTour, waitForElement } from "@/lib/tours/tour-engine";

/**
 * Eligibility + auto-start + persistence wiring for the guided tours
 * (docs/guided-tours/). Mounted once per portal via TourHelpButton in
 * PortalHeaderActions; the overlay itself lives in lib/tours/tour-engine.
 */

// Module-level session state: survives re-renders and remounts, resets on a
// full page load. `startedThisSession` stops re-auto-starts (and doubles as
// the strict-mode guard); `pendingStartKey` carries a ?-button click across
// the router.push to the tour's page.
const startedThisSession = new Set<string>();
let pendingStartKey: string | null = null;

interface ResolvedTour {
  def: TourDefinition;
  /** Server completion state has loaded (auto-start waits for it). */
  stateLoaded: boolean;
  completed: boolean;
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
  const [skipStepIndex, setSkipStepIndex] = useState<number | null>(null);
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

  let resolved: ResolvedTour | null = null;
  if (portal === "admin") {
    // adminRole arrives with the profile fetch — no tour until it's known.
    if (user?.role === "admin" && user.adminRole) {
      const def =
        user.adminRole === "super" ? TOURS.superAdmin : TOURS.staffAdmin;
      resolved = {
        def,
        stateLoaded: adminProfileQuery.data !== undefined,
        completed: isTourCompleted(
          adminProfileQuery.data?.toursCompleted,
          def,
        ),
      };
    }
  } else if (portal === "franchisee") {
    // Funnel (pre-agreement) franchisees are excluded by design.
    if (
      user &&
      (user.role === "franchisee" || user.role === "franchise") &&
      isFranchiseOperational(user)
    ) {
      resolved = {
        def: TOURS.franchisee,
        stateLoaded: user.profile != null,
        completed: isTourCompleted(
          user.profile?.toursCompleted,
          TOURS.franchisee,
        ),
      };
    }
  } else if (ciUser && agreementPhase === "SIGNED") {
    // Pre-signature CIs are excluded by design (their header has no actions).
    resolved = {
      def: TOURS.ci,
      stateLoaded: true,
      completed: isTourCompleted(ciUser.toursCompleted, TOURS.ci),
    };
  }

  const def = resolved?.def ?? null;
  const stateLoaded = resolved?.stateLoaded ?? false;
  const completed = resolved?.completed ?? true;

  const markComplete = useCallback(() => {
    if (!def) return;
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
  }, [def, markTourComplete, portal, refreshCI]);

  const launch = useCallback(
    (startAt = 0) => {
      if (!def) return;
      startTour(def, {
        startAt,
        onFinished: markComplete,
        onSkipRequested: (stepIndex) => {
          setSkipNonce((n) => n + 1);
          setSkipStepIndex(stepIndex);
        },
      });
    },
    [def, markComplete],
  );

  // Auto-start: first visit to the tour's page once the server says "not
  // completed" and the page's real data has rendered. A pending ?-click
  // (cross-page start) bypasses the completed/session checks.
  useEffect(() => {
    if (!def || !isDesktop || pathname !== def.page) return;
    const isPendingManualStart = pendingStartKey === def.key;
    if (!isPendingManualStart) {
      if (!stateLoaded || completed || startedThisSession.has(def.key)) return;
    }
    let cancelled = false;
    void waitForElement(def.readyWhen).then((found) => {
      if (cancelled || !found) return;
      if (pendingStartKey === def.key) pendingStartKey = null;
      startedThisSession.add(def.key);
      launch();
    });
    return () => {
      cancelled = true;
    };
  }, [def, isDesktop, pathname, stateLoaded, completed, launch]);

  // Safety nets: a programmatic redirect mid-tour (user navigation is blocked
  // by the overlay) or an unmount must not leave a stranded overlay.
  useEffect(() => {
    if (def && pathname !== def.page) stopTour();
  }, [def, pathname]);
  useEffect(() => () => stopTour(), []);

  const start = useCallback(() => {
    if (!def) return;
    if (pathname !== def.page) {
      pendingStartKey = def.key;
      router.push(def.page);
      return;
    }
    startedThisSession.add(def.key);
    void waitForElement(def.readyWhen).then((found) => {
      if (found) launch();
    });
  }, [def, pathname, router, launch]);

  const confirmSkip = useCallback(() => {
    setSkipStepIndex(null);
    markComplete();
  }, [markComplete]);

  const cancelSkip = useCallback(() => {
    const resumeAt = skipStepIndex ?? 0;
    setSkipStepIndex(null);
    launch(resumeAt);
  }, [skipStepIndex, launch]);

  return {
    available: def != null,
    start,
    skipStepIndex,
    skipNonce,
    confirmSkip,
    cancelSkip,
  };
}
