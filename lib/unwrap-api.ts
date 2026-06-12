import { api } from "@/lib/axios";

/** Axios interceptor sets `response.data` to `{ result: T }` for JSON. */
export function unwrapData<T>(response: { data: unknown }): T {
  const d = response.data as {
    result?: T;
    success?: unknown;
    data?: unknown;
  };
  if (d && typeof d === "object" && "result" in d) {
    return d.result as T;
  }
  /** ipa-new / legacy `{ success: true, data: T }` when interceptor did not normalize. */
  if (
    d &&
    typeof d === "object" &&
    d.success === true &&
    "data" in d
  ) {
    return d.data as T;
  }
  return d as T;
}

/** ipa-new paginated list shape inside `result`. */
export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Normalize ipa-new list responses (`{ rows, total, page, limit }`) or legacy bare arrays.
 */
export function normalizePaginatedResult<T>(result: unknown): PaginatedResult<T> {
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as PaginatedResult<T>).rows)
  ) {
    const r = result as PaginatedResult<T>;
    const rows = r.rows;
    const limit = Number(r.limit ?? 20) || 20;
    return {
      rows,
      total: Number(r.total ?? rows.length),
      page: Number(r.page ?? 1),
      limit,
    };
  }
  if (Array.isArray(result)) {
    const rows = result as T[];
    return {
      rows,
      total: rows.length,
      page: 1,
      limit: rows.length || 20,
    };
  }
  return { rows: [], total: 0, page: 1, limit: 20 };
}

/** Omit empty values so axios does not send `undefined` as string. */
export function compactRequestParams(
  p?: Record<string, string | number | boolean | undefined | null>,
): Record<string, string | number | boolean> | undefined {
  if (!p) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v as string | number | boolean;
  }
  return Object.keys(out).length ? out : undefined;
}

/** GET `url` with compacted query params and unwrap the response envelope. */
async function getUnwrapped<T>(url: string, params?: object): Promise<T> {
  const response = await api.get(url, {
    params: compactRequestParams(
      params as
        | Record<string, string | number | boolean | undefined | null>
        | undefined,
    ),
  });
  return unwrapData<T>(response);
}

/** GET a paginated list endpoint and normalize to `{ rows, total, page, limit }`. */
export async function getPaginated<T = unknown>(
  url: string,
  params?: object,
): Promise<PaginatedResult<T>> {
  return normalizePaginatedResult<T>(await getUnwrapped<unknown>(url, params));
}
