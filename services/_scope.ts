import { getScope } from "@/lib/stores/scope-store";

/**
 * Merge the active `programId` from the global scope store into request
 * params. Call this from franchise-side service functions before sending to
 * the backend. Admin and CI services must NOT use this — they share the same
 * axios instance and must not be silently scoped.
 *
 * Pattern:
 *   api.get('/order', { params: withProgramScope(params) })
 *
 * If the caller already provides a `programId` (e.g. when fetching across
 * scopes intentionally), the caller's value wins.
 */
export function withProgramScope<T extends Record<string, unknown> | undefined>(
  params?: T,
): (T extends undefined ? Record<string, unknown> : T) & {
  programId?: number;
} {
  const { programId } = getScope();
  const base = (params ?? {}) as Record<string, unknown>;
  if (programId == null) {
    return base as (T extends undefined ? Record<string, unknown> : T) & {
      programId?: number;
    };
  }
  if ("programId" in base && base.programId != null) {
    return base as (T extends undefined ? Record<string, unknown> : T) & {
      programId?: number;
    };
  }
  return { ...base, programId } as (T extends undefined
    ? Record<string, unknown>
    : T) & { programId?: number };
}

/**
 * Like {@link withProgramScope}, but merges into a request body (object) for
 * POST/PATCH/PUT endpoints that expect programId in the body, not query.
 */
function withProgramScopeBody<
  T extends Record<string, unknown> | undefined,
>(
  body?: T,
): (T extends undefined ? Record<string, unknown> : T) & {
  programId?: number;
} {
  return withProgramScope(body);
}
