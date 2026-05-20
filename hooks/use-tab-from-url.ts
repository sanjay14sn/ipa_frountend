"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Tab state synced to a `?tab=` query param.
 *
 * Drives `tab` from local React state instead of `useSearchParams()` directly.
 * Reason: on Next.js 16 + React 19, calling `router.replace()` to update a
 * search param on a statically-renderable client page started via full HTTP
 * load (i.e. a browser reload) does not always trigger a re-render of the
 * `useSearchParams()` subscriber. The address bar would not update and the
 * controlled `<Tabs value={tab}>` would freeze on the old value, making the
 * tab buttons appear unresponsive even though Radix received the click.
 *
 * Local state + `window.history.replaceState` decouples the tab UI from the
 * router so a click always re-renders, while keeping the URL shareable and
 * keeping back/forward navigation in sync via the `useSearchParams` effect.
 */
export function useTabFromUrl<const TAllowed extends readonly string[]>(
  defaultTab: TAllowed[number],
  allowed: TAllowed,
) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const resolveFromUrl = useCallback((): TAllowed[number] => {
    const raw = searchParams.get("tab");
    return raw && (allowed as readonly string[]).includes(raw)
      ? (raw as TAllowed[number])
      : defaultTab;
  }, [searchParams, allowed, defaultTab]);

  const [tab, setTabState] = useState<TAllowed[number]>(resolveFromUrl);

  // Sync URL → state for external URL changes (browser back/forward, links).
  // `window.history.replaceState` (used in setTab below) does not fire
  // popstate, so this effect only fires for genuine external navigation.
  useEffect(() => {
    setTabState(resolveFromUrl());
  }, [resolveFromUrl]);

  const setTab = useCallback(
    (value: string) => {
      const next = (allowed as readonly string[]).includes(value)
        ? (value as TAllowed[number])
        : defaultTab;
      setTabState(next);
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        params.set("tab", next);
        window.history.replaceState(
          null,
          "",
          `${pathname}?${params.toString()}`,
        );
      }
    },
    [pathname, allowed, defaultTab],
  );

  return [tab, setTab] as const;
}
