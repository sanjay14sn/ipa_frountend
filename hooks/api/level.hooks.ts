"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getLevelsByProgram,
  getAllLevels,
  getLevelsByStream,
  type Level,
} from "@/services/level.service";
import { queryKeys } from "./query-keys";

export function useLevelsByProgram(programId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.levels.byProgram(programId ?? 0),
    queryFn: () => getLevelsByProgram(programId!),
    enabled: programId != null && programId > 0,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
  });
}

export function useAllLevels() {
  return useQuery({
    queryKey: queryKeys.levels.all,
    queryFn: getAllLevels,
  });
}

export function useLevelsByStream(streamId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.levels.byStream(streamId ?? 0),
    queryFn: () => getLevelsByStream(streamId!),
    enabled: streamId != null && streamId > 0,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
  });
}

export type { Level };
