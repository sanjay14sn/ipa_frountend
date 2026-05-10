"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  getStudentProgressions,
  updateStudentProgression,
  type StudentLevelProgression,
  type UpdateProgressionDto,
} from "@/services/student-progression.service";

const PROGRESSION_KEY = (studentId: number) => ["student-progression", studentId];

export function useStudentProgressions(studentId: number) {
  const q = useQuery({
    queryKey: PROGRESSION_KEY(studentId),
    queryFn: () => getStudentProgressions(studentId),
    enabled: studentId > 0,
  });
  return {
    progressions: q.data ?? [] as StudentLevelProgression[],
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

export function useUpdateStudentProgression(studentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ progressionId, dto }: { progressionId: number; dto: UpdateProgressionDto }) =>
      updateStudentProgression(studentId, progressionId, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROGRESSION_KEY(studentId) });
    },
  });
}
