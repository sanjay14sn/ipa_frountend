"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  getAllCourseInstructors,
  createCourseInstructor,
  updateCourseInstructor,
  getAllAdminCourseInstructorsByStatus,
  getPaginatedAdminCourseInstructors,
  uploadCourseInstructorPhoto,
  removeCourseInstructorPhoto,
  deleteCourseInstructorAdmin,
  type CourseInstructorData,
  type CreateCourseInstructorRequest,
  type AdminCourseInstructorsByStatus,
  type CourseInstructorPaginationParams,
  type CourseInstructorListParams,
} from "@/services/course-instructor.service";
import { useProgramId } from "@/hooks/use-scope";
import { queryKeys } from "@/hooks/api/query-keys";
import { getQueryClientBridge } from "@/hooks/api/query-client-bridge";
import { toast as sonnerToast } from "sonner";

const CI_LIST_PREFIX = ["course-instructors", "list"] as const;

/** Invalidation prefix covering every admin status-scoped CI list
 *  (Applications / Active CIs / Rejected tabs). */
export const ADMIN_CI_STATUS_PREFIX = [
  "course-instructors",
  "admin",
  "status",
] as const;

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
    limit: listParams?.limit ?? 100,
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
        limit: 100,
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
    // The AddCourseInstructorModal handles errors inline (field-level errors +
    // a single toast), so suppress the global error toast for this mutation.
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CI_LIST_PREFIX });
    },
  });
}

/**
 * Upload/remove a CI's profile photo. `mode` picks the audience route
 * (admin vs franchisee). The bare ["course-instructors"] prefix covers every
 * list variant (franchisee list, admin roster, status tabs).
 */
export function useCourseInstructorPhotoMutations(
  mode: "admin" | "franchisee",
) {
  const qc = useQueryClient();

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["course-instructors"] });
  };

  const upload = useMutation({
    mutationFn: ({ ciId, file }: { ciId: number; file: File }) =>
      uploadCourseInstructorPhoto(ciId, file, mode),
    onSuccess: () => {
      invalidate();
      sonnerToast.success("Photo updated");
    },
  });

  const remove = useMutation({
    mutationFn: ({ ciId }: { ciId: number }) =>
      removeCourseInstructorPhoto(ciId, mode),
    onSuccess: () => {
      invalidate();
      sonnerToast.success("Photo removed");
    },
  });

  return { upload, remove };
}

/**
 * Admin CI list scoped to one status — "Pending" / "Rejected" review statuses
 * or the derived "valid" operational filter (Active CIs). All filtering is
 * server-side (GET /admin/course-instructor). Keys share
 * {@link ADMIN_CI_STATUS_PREFIX} so one invalidation refreshes all three tabs.
 */
/**
 * Superadmin hard delete. The bare ["course-instructors"] prefix covers every
 * CI list variant (franchisee list + all admin status tabs); agreements and
 * the hub summary counters are invalidated alongside.
 */
export function useDeleteCourseInstructorAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseInstructorId: number) =>
      deleteCourseInstructorAdmin(courseInstructorId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["course-instructors"] });
      void queryClient.invalidateQueries({ queryKey: ["ci-agreements", "admin"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-ci-count"] });
    },
  });
}

export function useAdminCIListByStatus(
  status: "Pending" | "Rejected" | "valid",
  params: {
    page?: number;
    limit?: number;
    search?: string;
    franchiseId?: string;
    programId?: number;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
  },
) {
  return useQuery({
    queryKey: [...ADMIN_CI_STATUS_PREFIX, status, params],
    queryFn: () =>
      getPaginatedAdminCourseInstructors({
        status,
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
        franchiseId: params.franchiseId || undefined,
        programId: params.programId,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      }),
    placeholderData: (prev) => prev,
  });
}

/**
 * Admin CI list for one franchise with NO status filter (admin create-on-behalf
 * order flow). Deliberately unfiltered server-side: the order dialog applies the
 * franchisee eligibility predicate client-side — `operationalStatus === "valid"
 * OR status === "Training"` — which a single server status filter can't express.
 */
export function useAdminCIsByFranchise(
  franchiseId: string | null,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...ADMIN_CI_STATUS_PREFIX, "all", franchiseId],
    queryFn: () =>
      getPaginatedAdminCourseInstructors({
        page: 1,
        limit: 100,
        franchiseId: franchiseId!,
      }),
    enabled: !!franchiseId && (opts?.enabled ?? true),
    placeholderData: (prev) => prev,
  });
}
