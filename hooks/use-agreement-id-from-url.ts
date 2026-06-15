"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Selected agreement id synced to an `?agreementId=` query param so an open
 * agreement detail is shareable and survives a reload.
 *
 * Same approach as `useTabFromUrl`: local state is the source of truth and the
 * URL is updated via `window.history.replaceState` (NOT `router.replace`) to
 * avoid the Next 16 / React 19 stale `useSearchParams` subscriber bug. Param
 * edits operate on a COPY of the live querystring so coexisting params (e.g.
 * `tab` on the franchise-details page) are preserved.
 */
export function useAgreementIdFromUrl() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const resolveFromUrl = useCallback((): number | null => {
    const raw = searchParams.get("agreementId");
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [searchParams]);

  const [agreementId, setAgreementIdState] = useState<number | null>(
    resolveFromUrl,
  );

  // Sync URL → state for genuine external navigation (back/forward, links).
  // `replaceState` does not emit popstate, so this only fires for real nav.
  useEffect(() => {
    setAgreementIdState(resolveFromUrl());
  }, [resolveFromUrl]);

  const setAgreementId = useCallback(
    (id: number | null) => {
      setAgreementIdState(id);
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (id == null) {
          params.delete("agreementId");
        } else {
          params.set("agreementId", String(id));
        }
        const qs = params.toString();
        window.history.replaceState(
          null,
          "",
          qs ? `${pathname}?${qs}` : pathname,
        );
      }
    },
    [pathname],
  );

  return [agreementId, setAgreementId] as const;
}
