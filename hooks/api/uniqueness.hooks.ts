import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { queryKeys } from "./query-keys";

export type UniquenessStatus = "idle" | "checking" | "available" | "taken";

export interface UseUniquenessCheckOptions {
  /** Key parts identifying entity+field, e.g. `["franchisee", "email"]`. */
  keyParts: readonly unknown[];
  /** Raw (undebounced) input value. */
  value: string;
  /**
   * Gate: fire only when the value is locally format-valid and any required
   * scope ids are present. Defaults to true.
   */
  enabled?: boolean;
  /** Exclude this record (self) when editing. */
  excludeId?: number | string;
  /** Scope values that change what "unique" means (programId, streamId…). */
  scope?: Record<string, string | number | undefined>;
  /** Service probe from `services/uniqueness.service.ts`. */
  fetcher: (
    value: string,
    opts: { excludeId?: number | string; signal?: AbortSignal },
  ) => Promise<boolean>;
  /** Inline error copy shown when the value is taken. */
  takenMessage: string;
  debounceMs?: number;
}

export interface UniquenessCheckResult {
  status: UniquenessStatus;
  isTaken: boolean;
  isChecking: boolean;
  /** `takenMessage` when taken, else undefined — merge into field errors. */
  error: string | undefined;
}

/**
 * Debounced, advisory as-you-type uniqueness probe. Fail-open by design:
 * the queryFn must never throw (the global QueryCache onError would toast),
 * and a network failure reports "available" — the hardened submit path is
 * the real guarantee. Block submission only on a confirmed `taken`.
 */
export function useUniquenessCheck({
  keyParts,
  value,
  enabled = true,
  excludeId,
  scope,
  fetcher,
  takenMessage,
  debounceMs = 500,
}: UseUniquenessCheckOptions): UniquenessCheckResult {
  const trimmed = value.trim();
  const debounced = useDebouncedValue(trimmed, debounceMs);
  const active = enabled && debounced.length > 0;

  const query = useQuery({
    queryKey: queryKeys.uniqueness.check(keyParts, {
      value: debounced,
      excludeId: excludeId ?? null,
      ...scope,
    }),
    enabled: active,
    staleTime: 30_000,
    gcTime: 60_000,
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        return await fetcher(debounced, { excludeId, signal });
      } catch {
        return true;
      }
    },
  });

  if (!active || trimmed.length === 0) {
    return { status: "idle", isTaken: false, isChecking: false, error: undefined };
  }
  if (trimmed !== debounced || query.isFetching || query.isPending) {
    return { status: "checking", isTaken: false, isChecking: true, error: undefined };
  }
  if (query.data === false) {
    return { status: "taken", isTaken: true, isChecking: false, error: takenMessage };
  }
  return { status: "available", isTaken: false, isChecking: false, error: undefined };
}
