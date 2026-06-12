"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAllCITraining,
  approveTraining,
  completeTrainingForInstructor,
  getTrainingCourseInstructors,
  type CITrainingByFranchise,
  type ApproveTrainingRequest,
  type TrainingCourseInstructorData,
  completeTraining,
} from "@/services/course-instructor.service";
import { queryKeys } from "@/hooks/api/query-keys";
import { getQueryClientBridge } from "@/hooks/api/query-client-bridge";
import {
  listFranchiseeTrainingSessions,
  listWaitingForSession,
  listSessionAssignments,
  bulkAssignToSession,
  type FranchiseeTrainingSession,
  type WaitingCI,
  type SessionAssignedCI,
} from "@/services/ci-training-franchisee.service";

const CI_LIST_PREFIX = ["course-instructors", "list"] as const;
const CI_TRAINING_KEY = queryKeys.courseInstructors.ciTraining;
const TRAINING_COURSE_INSTRUCTORS_KEY = queryKeys.courseInstructors.trainingList;

function useCITrainingData() {
  const q = useQuery({
    queryKey: CI_TRAINING_KEY,
    queryFn: getAllCITraining,
  });
  return {
    trainingData: q.data ?? ({} as CITrainingByFranchise),
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

async function approveTrainingWithRevalidation(
  instructorId: string,
  trainingData?: ApproveTrainingRequest,
) {
  if (trainingData) {
    await approveTraining(Number(instructorId), trainingData);
  }
  try {
    const qc = getQueryClientBridge();
    void qc.invalidateQueries({ queryKey: CI_TRAINING_KEY });
  } catch {
    /* ignore */
  }
}

async function completeTrainingWithRevalidation(
  instructorId: number,
  data?: Parameters<typeof completeTraining>[1],
) {
  await completeTrainingForInstructor(instructorId, data);
  try {
    const qc = getQueryClientBridge();
    void qc.invalidateQueries({ queryKey: CI_TRAINING_KEY });
    void qc.invalidateQueries({ queryKey: CI_LIST_PREFIX });
  } catch {
    /* ignore */
  }
}

function useTrainingCourseInstructors() {
  const q = useQuery({
    queryKey: TRAINING_COURSE_INSTRUCTORS_KEY,
    queryFn: async () => (await getTrainingCourseInstructors()).result ?? [],
  });
  return {
    trainingCourseInstructors: q.data ?? ([] as TrainingCourseInstructorData[]),
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

export function useFranchiseeTrainingSessions(params?: {
  trainingLevelId?: number;
  programId?: number;
  fromDate?: string;
  toDate?: string;
}) {
  const q = useQuery({
    queryKey: queryKeys.courseInstructors.franchiseeSessions(
      params as Record<string, unknown> | undefined,
    ),
    queryFn: () => listFranchiseeTrainingSessions(params),
    placeholderData: (prev) => prev,
  });
  return {
    sessions: q.data ?? ([] as FranchiseeTrainingSession[]),
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

export function useWaitingForSession(sessionId: number | null) {
  const q = useQuery({
    queryKey: queryKeys.courseInstructors.waitingSession(sessionId as number),
    queryFn: () => listWaitingForSession(sessionId!),
    enabled: sessionId != null,
    placeholderData: (prev) => prev,
  });
  return {
    waiting: q.data ?? ([] as WaitingCI[]),
    isLoading: q.isLoading,
    error: q.error,
    refetch: q.refetch,
  };
}

export function useSessionAssignments(sessionId: number | null) {
  const q = useQuery({
    queryKey: queryKeys.courseInstructors.sessionAssignments(sessionId as number),
    queryFn: () => listSessionAssignments(sessionId!),
    enabled: sessionId != null,
    placeholderData: (prev) => prev,
  });
  return {
    assigned: q.data ?? ([] as SessionAssignedCI[]),
    isLoading: q.isLoading,
    error: q.error,
    refetch: q.refetch,
  };
}

export async function bulkAssignToSessionWithRevalidation(
  sessionId: number,
  assignmentIds: number[],
) {
  const result = await bulkAssignToSession(sessionId, assignmentIds);
  try {
    const qc = getQueryClientBridge();
    void qc.invalidateQueries({
      queryKey: queryKeys.courseInstructors.franchiseeSessions(),
    });
    void qc.invalidateQueries({
      queryKey: queryKeys.courseInstructors.waitingSession(sessionId),
    });
    void qc.invalidateQueries({
      queryKey: queryKeys.courseInstructors.sessionAssignments(sessionId),
    });
  } catch {
    /* ignore */
  }
  return result;
}
