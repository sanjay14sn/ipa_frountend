"use client";

import { useEffect } from "react";
import { create } from "zustand";

/**
 * Dynamic-segment breadcrumb overrides. A detail page (e.g.
 * /admin/franchise/[franchiseId]) registers a human label for its id segment
 * on mount and clears it on unmount, so the breadcrumb reads
 * "… › Sunrise Academy" instead of "… › 42".
 */

interface BreadcrumbState {
  overrides: Record<string, string>;
  setOverride: (segment: string, label: string) => void;
  clearOverride: (segment: string) => void;
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  overrides: {},
  setOverride: (segment, label) =>
    set((state) => ({ overrides: { ...state.overrides, [segment]: label } })),
  clearOverride: (segment) =>
    set((state) => {
      const { [segment]: _removed, ...rest } = state.overrides;
      return { overrides: rest };
    }),
}));

/**
 * Register a display label for a raw path segment while the calling page is
 * mounted. Pass undefined/empty label to register nothing (e.g. data not
 * loaded yet).
 */
export function useBreadcrumbOverride(
  segment: string | undefined,
  label: string | undefined,
): void {
  const setOverride = useBreadcrumbStore((s) => s.setOverride);
  const clearOverride = useBreadcrumbStore((s) => s.clearOverride);

  useEffect(() => {
    if (!segment || !label) return;
    setOverride(segment, label);
    return () => clearOverride(segment);
  }, [segment, label, setOverride, clearOverride]);
}
