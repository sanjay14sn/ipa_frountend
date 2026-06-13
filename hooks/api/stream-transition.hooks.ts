"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getTransitionsByProgram,
  type StreamTransition,
} from "@/services/stream-transition.service";
import { queryKeys } from "./query-keys";
import { getQueryClientBridge } from "./query-client-bridge";

export function useStreamTransitionsByProgram(programId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.streams.transitionsByProgram(programId ?? 0),
    queryFn: () => getTransitionsByProgram(programId!),
    enabled: programId != null && programId > 0,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export async function invalidateStreamTransitionsByProgram(programId: number) {
  try {
    await getQueryClientBridge().invalidateQueries({
      queryKey: queryKeys.streams.transitionsByProgram(programId),
    });
  } catch {
    /* ignore */
  }
}

