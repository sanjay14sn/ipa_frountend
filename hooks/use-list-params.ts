"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export interface UseListParamsOptions<F extends Record<string, string>> {
  /** Filter keys + default values ("all", ""). */
  filterDefaults: F;
  defaultSortBy?: string;
  /** @default "asc" */
  defaultSortOrder?: "asc" | "desc";
  /** Namespaces every owned key: ?proc.q=… (multi-list pages). */
  prefix?: string;
}

export interface UseListParamsResult<F extends Record<string, string>> {
  search: string;
  setSearch(value: string): void; // ?q=
  page: number;
  setPage(page: number): void; // ?page= (1-based)
  sortBy: string | undefined;
  sortOrder: "asc" | "desc";
  setSort(sortBy: string, sortOrder: "asc" | "desc"): void; // ?sort=field.asc
  filters: F;
  setFilter(key: keyof F & string, value: string): void; // ?<key>=
  /** All owned params back to defaults (cleared from URL). */
  reset(): void;
}

interface ListState<F extends Record<string, string>> {
  search: string;
  page: number;
  sortBy: string | undefined;
  sortOrder: "asc" | "desc";
  filters: F;
}

/**
 * URL-persisted list state (search / page / sort / filters) so filters
 * survive refresh and are shareable.
 *
 * URL writes use `window.history.replaceState` — NOT `router.replace` —
 * modeled exactly on hooks/use-tab-from-url.ts (Next 16 + React 19:
 * router.replace for shallow state triggers a full client re-render/refetch
 * cascade). Unknown params (e.g. ?tab=) are preserved; values equal to their
 * defaults are omitted from the URL; any search/filter change resets page
 * to 1.
 */
export function useListParams<F extends Record<string, string>>(
  options: UseListParamsOptions<F>,
): UseListParamsResult<F> {
  const { defaultSortBy, defaultSortOrder = "asc", prefix } = options;
  // Stabilize filterDefaults so an inline object literal at the call site
  // cannot re-trigger the URL-sync effect every render.
  const [filterDefaults] = useState(options.filterDefaults);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const key = useCallback(
    (k: string) => (prefix ? `${prefix}.${k}` : k),
    [prefix],
  );

  const resolveFromUrl = useCallback((): ListState<F> => {
    const search = searchParams.get(key("q")) ?? "";
    const pageRaw = Number(searchParams.get(key("page")));
    const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

    let sortBy = defaultSortBy;
    let sortOrder = defaultSortOrder;
    const sortRaw = searchParams.get(key("sort"));
    if (sortRaw) {
      const dot = sortRaw.lastIndexOf(".");
      const field = dot > 0 ? sortRaw.slice(0, dot) : "";
      const order = dot > 0 ? sortRaw.slice(dot + 1) : "";
      if (field && (order === "asc" || order === "desc")) {
        sortBy = field;
        sortOrder = order;
      }
    }

    const filters = { ...filterDefaults };
    for (const fk of Object.keys(filterDefaults)) {
      const v = searchParams.get(key(fk));
      if (v !== null) (filters as Record<string, string>)[fk] = v;
    }
    return { search, page, sortBy, sortOrder, filters };
  }, [searchParams, key, defaultSortBy, defaultSortOrder, filterDefaults]);

  const [state, setState] = useState<ListState<F>>(resolveFromUrl);

  // Sync URL → state for external navigation (back/forward, links).
  // replaceState (below) doesn't fire popstate, so this only reacts to
  // genuine router-visible changes.
  useEffect(() => {
    const next = resolveFromUrl();
    setState((prev) =>
      prev.search === next.search &&
      prev.page === next.page &&
      prev.sortBy === next.sortBy &&
      prev.sortOrder === next.sortOrder &&
      Object.keys(filterDefaults).every(
        (fk) => prev.filters[fk] === next.filters[fk],
      )
        ? prev
        : next,
    );
  }, [resolveFromUrl, filterDefaults]);

  const writeUrl = useCallback(
    (next: ListState<F>) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (next.search) params.set(key("q"), next.search);
      else params.delete(key("q"));
      if (next.page > 1) params.set(key("page"), String(next.page));
      else params.delete(key("page"));
      if (
        next.sortBy &&
        !(
          next.sortBy === defaultSortBy &&
          next.sortOrder === defaultSortOrder
        )
      ) {
        params.set(key("sort"), `${next.sortBy}.${next.sortOrder}`);
      } else {
        params.delete(key("sort"));
      }
      for (const fk of Object.keys(filterDefaults)) {
        if (next.filters[fk] !== filterDefaults[fk]) {
          params.set(key(fk), next.filters[fk]);
        } else {
          params.delete(key(fk));
        }
      }
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        qs ? `${pathname}?${qs}` : pathname,
      );
    },
    [key, pathname, defaultSortBy, defaultSortOrder, filterDefaults],
  );

  const commit = useCallback(
    (updater: (prev: ListState<F>) => ListState<F>) => {
      setState((prev) => {
        const next = updater(prev);
        // Next.js patches history.replaceState to sync the Router, so the
        // write must NOT run inside this updater (updaters execute during
        // React's render phase — "Cannot update Router while rendering").
        // A microtask defers it past the commit; the write is idempotent, so
        // StrictMode's double-invoked updaters are harmless.
        queueMicrotask(() => writeUrl(next));
        return next;
      });
    },
    [writeUrl],
  );

  const setSearch = useCallback(
    (value: string) => commit((prev) => ({ ...prev, search: value, page: 1 })),
    [commit],
  );
  const setPage = useCallback(
    (page: number) => commit((prev) => ({ ...prev, page })),
    [commit],
  );
  const setSort = useCallback(
    (sortBy: string, sortOrder: "asc" | "desc") =>
      commit((prev) => ({ ...prev, sortBy, sortOrder })),
    [commit],
  );
  const setFilter = useCallback(
    (fk: keyof F & string, value: string) =>
      commit((prev) => ({
        ...prev,
        filters: { ...prev.filters, [fk]: value },
        page: 1,
      })),
    [commit],
  );
  const reset = useCallback(
    () =>
      commit(() => ({
        search: "",
        page: 1,
        sortBy: defaultSortBy,
        sortOrder: defaultSortOrder,
        filters: { ...filterDefaults },
      })),
    [commit, defaultSortBy, defaultSortOrder, filterDefaults],
  );

  return useMemo(
    () => ({
      search: state.search,
      setSearch,
      page: state.page,
      setPage,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder,
      setSort,
      filters: state.filters,
      setFilter,
      reset,
    }),
    [state, setSearch, setPage, setSort, setFilter, reset],
  );
}
