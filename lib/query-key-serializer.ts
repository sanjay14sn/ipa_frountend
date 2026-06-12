/**
 * Stable serialization for TanStack Query keys so identical filters share one cache entry.
 * Convention: invalidate list families with `queryKey: [scope, "list"]` (partial match).
 */

function serializeListParams(
  params: Record<string, unknown> | undefined | null,
): string {
  if (params == null || typeof params !== "object") return "";
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(params).sort()) {
    const v = params[key];
    if (v === undefined || v === null || v === "") continue;
    sorted[key] = v;
  }
  return JSON.stringify(sorted);
}

/** `['scope', 'list', serialized]` — use partial key `['scope', 'list']` to invalidate all list variants. */
export function listQueryKey(
  scope: string,
  params?: Record<string, unknown> | null,
): readonly [string, "list", string] {
  return [scope, "list", serializeListParams(params)] as const;
}
