"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  getAllCourseInstructors,
  createCourseInstructor,
  updateCourseInstructor,
  deleteCourseInstructor,
  getAllAdminCourseInstructorsByStatus,
  approveCourseInstructor,
  rejectCourseInstructor,
  getAllCITraining,
  approveTraining,
  completeTraining,
  completeTrainingForInstructor,
  getTrainingCourseInstructors,
  getAdminCISummaries,
  getAdminCIDetails,
  type CourseInstructorData,
  type CreateCourseInstructorRequest,
  type AdminCourseInstructorsByStatus,
  type CITrainingByFranchise,
  type ApproveTrainingRequest,
  type TrainingCourseInstructorData,
  type CourseInstructorPaginationParams,
  type CourseInstructorListParams,
  type ApproveCourseInstructorRequest,
  type CIFranchiseSummary,
} from "@/services/course-instructor.service";
import { queryKeys } from "./query-keys";
import { getQueryClientBridge } from "./query-client-bridge";
import {
  listFranchiseeTrainingSessions,
  listWaitingForSession,
  listSessionAssignments,
  bulkAssignToSession,
  type FranchiseeTrainingSession,
  type WaitingCI,
  type SessionAssignedCI,
} from "@/services/ci-training-franchisee.service";

export type { CourseInstructorData, CreateCourseInstructorRequest };

const CI_LIST_PREFIX = ["course-instructors", "list"] as const;
const CI_TRAINING_KEY = queryKeys.courseInstructors.ciTraining;
const TRAINING_COURSE_INSTRUCTORS_KEY = queryKeys.courseInstructors.trainingList;

/** One network request per serialized filter set; pass `search` to scope the key + API params. */
export function useCourseInstructors(
  listParams?: Pick<
    CourseInstructorListParams,
    "search" | "page" | "limit" | "sortBy" | "sortOrder"
  >,
  options?: { enabled?: boolean },
) {
  const q = useQuery({
    queryKey: queryKeys.courseInstructors.franchisee(
      listParams as Record<string, unknown> | undefined,
    ),
    queryFn: async () =>
      (await getAllCourseInstructors({
        page: listParams?.page ?? 1,
        limit: listParams?.limit ?? 10_000,
        search: listParams?.search,
        sortBy: listParams?.sortBy,
        sortOrder: listParams?.sortOrder,
      })).result ?? [],
    placeholderData: (prev) => prev,
    enabled: options?.enabled ?? true,
  });
  return {
    courseInstructors: q.data ?? [],
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

export async function createCourseInstructorWithRevalidation(
  courseInstructorData: CreateCourseInstructorRequest,
): Promise<CourseInstructorData> {
  const created = await createCourseInstructor(courseInstructorData);
  try {
    const qc = getQueryClientBridge();
    void qc.invalidateQueries({ queryKey: CI_LIST_PREFIX });
  } catch {
    /* ignore */
  }
  return created;
}

export async function updateCourseInstructorWithRevalidation(
  id: number,
  updates: Partial<CourseInstructorData>,
) {
  const updated = await updateCourseInstructor(id, updates);
  try {
    const qc = getQueryClientBridge();
    void qc.invalidateQueries({ queryKey: CI_LIST_PREFIX });
  } catch {
    /* ignore */
  }
  return updated;
}

export async function deleteCourseInstructorWithRevalidation(id: number) {
  await deleteCourseInstructor(id);
  try {
    const qc = getQueryClientBridge();
    void qc.invalidateQueries({ queryKey: CI_LIST_PREFIX });
  } catch {
    /* ignore */
  }
}

export function useAdminCourseInstructors() {
  const q = useQuery({
    queryKey: queryKeys.courseInstructors.adminByStatus(),
    queryFn: getAllAdminCourseInstructorsByStatus,
  });
  return {
    courseInstructors: q.data ?? ({} as AdminCourseInstructorsByStatus),
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

export async function approveCourseInstructorWithRevalidation(
  id: number,
  body: ApproveCourseInstructorRequest,
) {
  const r = await approveCourseInstructor(id, body);
  try {
    const qc = getQueryClientBridge();
    void qc.invalidateQueries({ queryKey: CI_LIST_PREFIX });
  } catch {
    /* ignore */
  }
  return r;
}

export async function rejectCourseInstructorWithRevalidation(id: number) {
  const r = await rejectCourseInstructor(id);
  try {
    const qc = getQueryClientBridge();
    void qc.invalidateQueries({ queryKey: CI_LIST_PREFIX });
  } catch {
    /* ignore */
  }
  return r;
}

export function useCITrainingData() {
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

export async function approveTrainingWithRevalidation(
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

export async function completeTrainingWithRevalidation(
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

export function useTrainingCourseInstructors() {
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

/**
 * Client-side status filter + slice. Shares one GET with {@link useCourseInstructors}
 * (same `search` → same cache entry; status/page do not trigger extra requests).
 */
export function usePaginatedFranchiseeCourseInstructors(
  params: CourseInstructorPaginationParams,
) {
  const searchKey =
    params.search && params.search !== ""
      ? { search: params.search }
      : undefined;
  const q = useQuery({
    queryKey: queryKeys.courseInstructors.franchisee(
      searchKey as Record<string, unknown> | undefined,
    ),
    queryFn: async () =>
      (await getAllCourseInstructors({
        page: 1,
        limit: 10_000,
        search: params.search,
      })).result ?? [],
    placeholderData: (prev) => prev,
  });

  const page = useMemo(() => {
    let rows = q.data ?? [];
    if (params.status) {
      rows = rows.filter((c) => c.status === params.status);
    }
    const pageNum = params.page ?? 1;
    const limit = params.limit ?? 20;
    const start = (pageNum - 1) * limit;
    return {
      data: rows.slice(start, start + limit),
      meta: { total: rows.length, page: pageNum, limit },
    };
  }, [q.data, params.page, params.limit, params.status]);

  return {
    courseInstructors: page.data,
    meta: page.meta,
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

export function useCreateCourseInstructor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCourseInstructor,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CI_LIST_PREFIX });
    },
  });
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
    queryKey: ["ci-training-waiting-session", sessionId],
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
    queryKey: ["ci-training-session-assignments", sessionId],
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
      queryKey: ["ci-training-waiting-session", sessionId],
    });
    void qc.invalidateQueries({
      queryKey: ["ci-training-session-assignments", sessionId],
    });
  } catch {
    /* ignore */
  }
  return result;
}

export function useAdminCISummaries(
  params: { page?: number; limit?: number; search?: string },
  refreshKey = 0,
) {
  return useQuery({
    queryKey: ["course-instructors", "admin", "summary", params, refreshKey],
    queryFn: () => getAdminCISummaries(params),
    placeholderData: (prev) => prev,
  });
}

export type { CIFranchiseSummary };

export function useAdminCIDetails(
  franchiseId: string,
  params: { status?: string; page?: number; limit?: number; search?: string },
) {
  return useQuery({
    queryKey: ["course-instructors", "admin", "details", franchiseId, params],
    queryFn: () =>
      getAdminCIDetails(
        franchiseId,
        params as {
          status?: "Pending" | "Approved" | "Rejected" | "all";
          page?: number;
          limit?: number;
          search?: string;
        },
      ),
    enabled: !!franchiseId,
    placeholderData: (prev) => prev,
  });
}
