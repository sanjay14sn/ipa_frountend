"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAllStreams,
  getStreamsByProgram,
  type Stream,
} from "@/services/stream.service";
import { queryKeys } from "./query-keys";
import { getQueryClientBridge } from "./query-client-bridge";

function useStreams() {
  return useQuery({
    queryKey: queryKeys.streams.all,
    queryFn: getAllStreams,
  });
}

export function useStreamsByProgram(programId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.streams.byProgram(programId ?? 0),
    queryFn: () => getStreamsByProgram(programId!),
    enabled: programId != null && programId > 0,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export async function invalidateStreamsByProgram(programId: number) {
  try {
    await getQueryClientBridge().invalidateQueries({
      queryKey: queryKeys.streams.byProgram(programId),
    });
  } catch {
    /* ignore */
  }
}

export type { Stream };
