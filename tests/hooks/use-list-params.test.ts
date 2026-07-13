// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useListParams } from "@/hooks/use-list-params";

// The hook reads next/navigation for the initial state and pathname; writes
// go through window.history.replaceState (the use-tab-from-url technique).
// The mock must return a STABLE object until `currentSearch` changes — the
// real useSearchParams doesn't change identity on replaceState writes, and
// the hook's URL→state sync effect relies on that.
let currentSearch = "";
let cached: URLSearchParams | null = null;
let cachedFor = "";
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/operations",
  useSearchParams: () => {
    if (!cached || cachedFor !== currentSearch) {
      cached = new URLSearchParams(currentSearch);
      cachedFor = currentSearch;
    }
    return cached;
  },
}));

function url(): string {
  return `${window.location.pathname}${window.location.search}`;
}

beforeEach(() => {
  currentSearch = "";
  window.history.replaceState(null, "", "/admin/operations");
});

describe("useListParams", () => {
  it("round-trips state to the URL and omits defaults", async () => {
    const { result } = renderHook(() =>
      useListParams({ filterDefaults: { status: "all" } }),
    );

    expect(result.current.search).toBe("");
    expect(result.current.page).toBe(1);
    expect(result.current.filters.status).toBe("all");
    // Defaults are omitted — URL stays clean.
    expect(url()).toBe("/admin/operations");

    await act(async () => result.current.setSearch("kits"));
    await act(async () => result.current.setFilter("status", "pending"));
    await act(async () => result.current.setSort("createdAt", "desc"));
    expect(window.location.search).toContain("q=kits");
    expect(window.location.search).toContain("status=pending");
    expect(window.location.search).toContain("sort=createdAt.desc");
    // page=1 never appears
    expect(window.location.search).not.toContain("page=");
  });

  it("hydrates from the URL, including sort parsing", () => {
    currentSearch = "q=abc&page=3&sort=name.desc&status=failed";
    const { result } = renderHook(() =>
      useListParams({ filterDefaults: { status: "all" } }),
    );
    expect(result.current.search).toBe("abc");
    expect(result.current.page).toBe(3);
    expect(result.current.sortBy).toBe("name");
    expect(result.current.sortOrder).toBe("desc");
    expect(result.current.filters.status).toBe("failed");
  });

  it("search/filter changes reset page to 1", async () => {
    currentSearch = "page=3";
    const { result } = renderHook(() =>
      useListParams({ filterDefaults: { status: "all" } }),
    );
    expect(result.current.page).toBe(3);
    await act(async () => result.current.setFilter("status", "paid"));
    expect(result.current.page).toBe(1);
  });

  it("preserves unknown params like ?tab=", async () => {
    window.history.replaceState(null, "", "/admin/operations?tab=orders");
    const { result } = renderHook(() =>
      useListParams({ filterDefaults: { status: "all" } }),
    );
    await act(async () => result.current.setSearch("abc"));
    expect(window.location.search).toContain("tab=orders");
    expect(window.location.search).toContain("q=abc");
    await act(async () => result.current.reset());
    expect(url()).toBe("/admin/operations?tab=orders");
  });

  it("prefix namespaces every owned key", async () => {
    const { result } = renderHook(() =>
      useListParams({ filterDefaults: { status: "all" }, prefix: "proc" }),
    );
    await act(async () => result.current.setSearch("abc"));
    await act(async () => result.current.setFilter("status", "open"));
    await act(async () => result.current.setPage(2));
    expect(window.location.search).toContain("proc.q=abc");
    expect(window.location.search).toContain("proc.status=open");
    expect(window.location.search).toContain("proc.page=2");
  });

  it("reset returns all owned params to defaults", async () => {
    const { result } = renderHook(() =>
      useListParams({
        filterDefaults: { status: "all" },
        defaultSortBy: "createdAt",
        defaultSortOrder: "desc",
      }),
    );
    await act(async () => result.current.setSearch("x"));
    await act(async () => result.current.setSort("name", "asc"));
    await act(async () => result.current.reset());
    expect(result.current.search).toBe("");
    expect(result.current.sortBy).toBe("createdAt");
    expect(result.current.sortOrder).toBe("desc");
    expect(url()).toBe("/admin/operations");
  });
});
