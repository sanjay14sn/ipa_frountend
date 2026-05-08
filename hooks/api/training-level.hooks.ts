"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getTrainingLevelsForProgram,
  type TrainingLevel,
} from "@/services/training-level.service";
import { queryKeys } from "./query-keys";
import { getQueryClientBridge } from "./query-client-bridge";

export function useTrainingLevelsForProgram(programId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.trainingLevels.byProgram(programId ?? 0),
    queryFn: () => getTrainingLevelsForProgram(programId!),
    enabled: programId != null && programId > 0,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
  });
}

export async function invalidateTrainingLevelsForProgram(programId: number) {
  try {
    await getQueryClientBridge().invalidateQueries({
      queryKey: queryKeys.trainingLevels.byProgram(programId),
    });
  } catch {
    /* ignore */
  }
}

export type { TrainingLevel };
