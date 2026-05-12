"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useTabFromUrl<const TAllowed extends readonly string[]>(
  defaultTab: TAllowed[number],
  allowed: TAllowed,
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get("tab");
  const tab: TAllowed[number] =
    raw && (allowed as readonly string[]).includes(raw)
      ? (raw as TAllowed[number])
      : defaultTab;

  const setTab = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return [tab, setTab] as const;
}
