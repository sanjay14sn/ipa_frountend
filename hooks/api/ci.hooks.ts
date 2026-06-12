"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  getAllCourseInstructors,
  createCourseInstructor,
  updateCourseInstructor,
  deleteCourseInstructor,
  getAllAdminCourseInstructorsByStatus,
  getAdminCISummaries,
  getAdminCIDetails,
  type CourseInstructorData,
  type CreateCourseInstructorRequest,
  type AdminCourseInstructorsByStatus,
  type CourseInstructorPaginationParams,
  type CourseInstructorListParams,
  type CIFranchiseSummary,
} from "@/services/course-instructor.service";
import { useProgramId } from "@/hooks/use-scope";
import { queryKeys } from "@/hooks/api/query-keys";
import { getQueryClientBridge } from "@/hooks/api/query-client-bridge";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

export type { CourseInstructorData, CreateCourseInstructorRequest, CIFranchiseSummary };

const CI_LIST_PREFIX = ["course-instructors", "list"] as const;

/** One network request per serialized filter set; pass `search` to scope the key + API params. */
export function useCourseInstructors(
  listParams?: Pick<
    CourseInstructorListParams,
    "search" | "page" | "limit" | "sortBy" | "sortOrder" | "agreementId" | "programId"
  >,
  options?: { enabled?: boolean },
) {
  const programId = useProgramId();
  const scopedParams = {
    page: listParams?.page ?? 1,
    limit: listParams?.limit ?? 10_000,
    search: listParams?.search,
    sortBy: listParams?.sortBy,
    sortOrder: listParams?.sortOrder,
    agreementId: listParams?.agreementId,
    programId: listParams?.programId ?? programId ?? undefined,
  } satisfies CourseInstructorListParams;
  const q = useQuery({
    queryKey: queryKeys.courseInstructors.franchisee(
      scopedParams as Record<string, unknown>,
    ),
    queryFn: async () => (await getAllCourseInstructors(scopedParams)).result ?? [],
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

async function createCourseInstructorWithRevalidation(
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

async function updateCourseInstructorWithRevalidation(
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

function useAdminCourseInstructors() {
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

/**
 * Client-side status filter + slice. Shares one GET with {@link useCourseInstructors}
 * (same `search` → same cache entry; status/page do not trigger extra requests).
 */
function usePaginatedFranchiseeCourseInstructors(
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
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useAdminCISummaries(
  params: { page?: number; limit?: number; search?: string },
  refreshKey = 0,
) {
  return useQuery({
    queryKey: queryKeys.courseInstructors.adminSummary(params as Record<string, unknown>, String(refreshKey)),
    queryFn: () => getAdminCISummaries(params),
    placeholderData: (prev) => prev,
  });
}

export function useAdminCIDetails(
  franchiseId: string,
  params: { status?: string; page?: number; limit?: number; search?: string },
) {
  return useQuery({
    queryKey: queryKeys.courseInstructors.adminDetails(franchiseId, params as Record<string, unknown>),
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
