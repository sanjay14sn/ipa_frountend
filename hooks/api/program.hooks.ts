"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllPrograms, type Program } from "@/services/program.service";
import { queryKeys } from "./query-keys";
import { getQueryClientBridge } from "./query-client-bridge";

const PROGRAMS_KEY = queryKeys.programs.all;

export function usePrograms() {
  const q = useQuery({
    queryKey: queryKeys.programs.all,
    queryFn: getAllPrograms,
    staleTime: Number.POSITIVE_INFINITY, // never re-fetch automatically
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const programs = useMemo(
    () => q.data ?? ([] as Program[]),
    [q.data],
  );
  return {
    programs,
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

/**
 * Fetches the shared `programs` catalog only after `ensureProgramsRequested()` runs
 * (e.g. first time a dropdown opens). `staleTime: Infinity` keeps a single fetch per cache entry.
 */
export function useProgramsOnDemand() {
  const [enabled, setEnabled] = useState(false);
  const q = useQuery({
    queryKey: queryKeys.programs.all,
    queryFn: getAllPrograms,
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  });

  const ensureProgramsRequested = useCallback(() => {
    setEnabled(true);
  }, []);

  return {
    programs: q.data ?? ([] as Program[]),
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    isError: q.isError,

    error: q.error,
    ensureProgramsRequested,
    hasRequested: enabled,
  };
}

export async function invalidatePrograms() {
  try {
    await getQueryClientBridge().invalidateQueries({
      queryKey: queryKeys.programs.all,
    });
  } catch {
    /* ignore */
  }
}

export type { Program };
