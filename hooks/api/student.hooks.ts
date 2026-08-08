"use client";

import {
  useQuery,
  useQueryClient,
  useMutation,
  type QueryClient,
} from "@tanstack/react-query";
import {
  getAllStudents,
  createStudent,
  updateStudent,
  requestStudentIds,
  issueIdCard,
  getAllRequestedIdDetails,
  getRequestedIdCount,
  getIssuedIdDetails,
  getAllRequestedCertificateDetails,
  getIssuedCertificateDetails,
  getEligibleStudents,
  getAllAdminCertificateRequests,
  approveCertificateRequest,
  rejectCertificateRequest,
  getFranchiseeCertificates,
  bulkRequestCertificates,
  getPaginatedStudents,
  getAdminIdCardSummaries,
  getAdminIdCardDetails,
  getAdminCertificateSummaries,
  getAdminCertificatesByFranchise,
  getAdminStudentLifecycle,
  getFranchiseeStudentLifecycle,
  runStudentLifecycleInvalidation,
  extendStudentLifecycle,
  reactivateStudentLifecycle,
  bulkApproveCertificates,
  bulkDispatchIdCards,
  getPaginatedStudentsAdmin,
  updateStudentAdmin,
  getAdminStudentLifecycleById,
  type StudentData,
  type StudentPaginationParams,
  type CertificatePaginationParams,
  type PaginationMeta,
  type StudentLifecycleRow,
} from "@/services/student.service";
import { getDispatchEligibleOrders } from "@/services/order.service";
import { useProgramId } from "@/hooks/use-scope";
import { queryKeys } from "./query-keys";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";
import { getQueryClientBridge } from "./query-client-bridge";

const STUDENTS_LIST_PREFIX = ["students", "list"] as const;

export { type StudentData } from "@/services/student.service";

function wantsStudentPagination(params?: StudentPaginationParams): boolean {
  if (params == null) return false;
  return (
    params.page != null ||
    params.limit != null ||
    (params.search != null && params.search !== "") ||
    (params.status != null && params.status !== "") ||
    params.sortBy != null ||
    params.sortOrder != null ||
    params.agreementId != null ||
    params.programId != null
  );
}

export function useStudents(params?: StudentPaginationParams) {
  const programId = useProgramId();
  const scopedParams: StudentPaginationParams = {
    ...(params ?? {}),
    programId: params?.programId ?? programId ?? undefined,
  };
  const paginated = wantsStudentPagination(scopedParams);
  const q = useQuery({
    queryKey: queryKeys.students.list(
      scopedParams as Record<string, unknown>,
    ),
    queryFn: async () => {
      if (paginated) {
        return getPaginatedStudents(scopedParams);
      }
      const r = await getAllStudents(scopedParams);
      return {
        data: r.result ?? [],
        meta: undefined as PaginationMeta | undefined,
      };
    },
    placeholderData: (prev) => prev,
  });
  const payload = q.data;
  return {
    students: payload?.data ?? [],
    meta: payload?.meta,
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

/**
 * Open ID-card request count for the admin dashboard (ADM-04). Consumers
 * must hide the count on error/loading — `data` stays undefined; never
 * render a fake 0.
 */
export function useRequestedIdCount() {
  return useQuery({
    queryKey: queryKeys.studentAdmin.requestedIdCount,
    queryFn: getRequestedIdCount,
  });
}

function useRequestedIdDetails() {
  const q = useQuery({
    queryKey: queryKeys.studentAdmin.requestedIds,
    queryFn: getAllRequestedIdDetails,
  });
  return {
    requestedIds: q.data ?? {},
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

function useIssuedIdDetails() {
  const q = useQuery({
    queryKey: queryKeys.studentAdmin.issuedIds,
    queryFn: getIssuedIdDetails,
  });
  return {
    issuedIds: q.data ?? {},
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

function useRequestedCertificateDetails() {
  const q = useQuery({
    queryKey: queryKeys.studentAdmin.requestedCerts,
    queryFn: getAllRequestedCertificateDetails,
  });
  return {
    requestedCertificates: q.data ?? {},
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

function useIssuedCertificateDetails() {
  const q = useQuery({
    queryKey: queryKeys.studentAdmin.issuedCerts,
    queryFn: getIssuedCertificateDetails,
  });
  return {
    issuedCertificates: q.data ?? {},
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

export function useEligibleStudents() {
  const q = useQuery({
    queryKey: queryKeys.studentAdmin.eligible,
    queryFn: async () => (await getEligibleStudents()).result ?? [],
  });
  return {
    eligibleStudents: q.data ?? [],
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

function useAdminCertificateRequests(
  params?: CertificatePaginationParams,
) {
  const q = useQuery({
    queryKey: queryKeys.studentAdmin.adminCertRequests(
      params as Record<string, unknown>,
    ),
    queryFn: async () =>
      (await getAllAdminCertificateRequests(params)).result ?? {},
    placeholderData: (prev) => prev,
  });
  return {
    certificateRequestsByFranchise: q.data ?? {},
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

export function useAdminIdCardSummaries(
  params: Record<string, unknown>,
  refreshKey = 0,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...queryKeys.studentAdmin.idCardSummaries(params), refreshKey],
    queryFn: () => getAdminIdCardSummaries(params),
    placeholderData: (prev) => prev,
    enabled: options?.enabled ?? true,
  });
}

export function useAdminIdCardDetails(
  franchiseId: string | null | undefined,
  params: Record<string, unknown>,
) {
  return useQuery({
    queryKey: queryKeys.studentAdmin.idCardDetails(franchiseId ?? "", params),
    queryFn: () => getAdminIdCardDetails(franchiseId!, params),
    enabled: Boolean(franchiseId?.trim()),
    placeholderData: (prev) => prev,
  });
}

export function useAdminCertificateSummaries(
  params: Record<string, unknown>,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.studentAdmin.certSummaries(params),
    queryFn: () => getAdminCertificateSummaries(params),
    placeholderData: (prev) => prev,
    enabled: options?.enabled ?? true,
  });
}

export function useAdminCertificateDetails(
  franchiseId: string | null | undefined,
  params: CertificatePaginationParams,
) {
  return useQuery({
    queryKey: queryKeys.studentAdmin.certDetails(
      franchiseId ?? "",
      params as Record<string, unknown>,
    ),
    queryFn: () => getAdminCertificatesByFranchise(franchiseId!, params),
    enabled: Boolean(franchiseId?.trim()),
    placeholderData: (prev) => prev,
  });
}

export function useAdminStudentLifecycle(params: StudentPaginationParams) {
  return useQuery({
    queryKey: queryKeys.studentAdmin.lifecycle(params as Record<string, unknown>),
    queryFn: () => getAdminStudentLifecycle(params),
    placeholderData: (prev) => prev,
  });
}

export function useFranchiseeStudentLifecycle(studentId: number | null) {
  return useQuery({
    queryKey:
      studentId != null ? queryKeys.students.lifecycle(studentId) : ["students", "lifecycle", "idle"],
    queryFn: () => getFranchiseeStudentLifecycle(studentId!),
    enabled: studentId != null,
  });
}

export function useAdminStudentLifecycleById(studentId: number | null) {
  return useQuery({
    queryKey: studentId != null
      ? ["students", studentId, "admin-lifecycle"]
      : ["students", "admin-lifecycle", "idle"],
    queryFn: () => getAdminStudentLifecycleById(studentId!),
    enabled: studentId != null,
  });
}

export function useFranchiseeCertificates(
  params?: CertificatePaginationParams,
) {
  const q = useQuery({
    queryKey: queryKeys.studentAdmin.franchiseeCerts(
      params as Record<string, unknown>,
    ),
    queryFn: async () =>
      (await getFranchiseeCertificates(params)).result ?? [],
    placeholderData: (prev) => prev,
  });
  return {
    certificates: q.data ?? [],
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

function invalidateStudentLists(qc: ReturnType<typeof getQueryClientBridge>) {
  void qc.invalidateQueries({ queryKey: STUDENTS_LIST_PREFIX });
  void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.requestedIds });
  void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.issuedIds });
  void qc.invalidateQueries({ queryKey: ["admin-id-card-summaries"] });
  void qc.invalidateQueries({ queryKey: ["admin-id-card-details", "list"] });
}

async function createStudentWithRevalidation(
  studentData: Parameters<typeof createStudent>[0],
) {
  const result = await createStudent(studentData);
  try {
    invalidateStudentLists(getQueryClientBridge());
  } catch {
    /* bridge not mounted (SSR) */
  }
  return result;
}

export function useCreateStudentWithRevalidation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createStudent,
    // AddStudentModal handles errors inline (field-level errors + a single
    // toast), so suppress the global error toast for this mutation.
    meta: { suppressErrorToast: true },
    onSuccess: () => invalidateStudentLists(qc),
  });
}

export async function updateStudentWithRevalidation(
  studentId: number,
  studentData: Partial<StudentData>,
) {
  const result = await updateStudent(studentId, studentData);
  try {
    invalidateStudentLists(getQueryClientBridge());
  } catch {
    /* ignore */
  }
  return result;
}

export async function updateStudentAdminWithRevalidation(
  studentId: number,
  studentData: Partial<StudentData>,
) {
  const result = await updateStudentAdmin(studentId, studentData);
  try {
    const qc = getQueryClientBridge();
    void qc.invalidateQueries({ queryKey: STUDENTS_LIST_PREFIX });
    void qc.invalidateQueries({ queryKey: ["students", studentId] });
    void qc.invalidateQueries({ queryKey: ["admin-students"] });
  } catch {
    /* bridge not mounted */
  }
  return result;
}

export async function requestStudentIdsWithRevalidation(studentIds: number[]) {
  const result = await requestStudentIds(studentIds);
  try {
    invalidateStudentLists(getQueryClientBridge());
  } catch {
    /* ignore */
  }
  return result;
}

export async function issueIdCardWithRevalidation(studentId: number) {
  const result = await issueIdCard(studentId);
  try {
    invalidateStudentLists(getQueryClientBridge());
  } catch {
    /* ignore */
  }
  return result;
}

const CERT_LIST_PREFIX = ["certification", "list"] as const;

export async function approveCertificateRequestWithRevalidation(
  certificateRequestId: number,
) {
  const result = await approveCertificateRequest(certificateRequestId);
  try {
    const qc = getQueryClientBridge();
    void qc.invalidateQueries({ queryKey: CERT_LIST_PREFIX });
    void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.certSummariesPrefix });
    void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.certDetailsPrefix });
  } catch {
    /* ignore */
  }
  return result;
}

export async function rejectCertificateRequestWithRevalidation(
  certificateRequestId: number,
) {
  const result = await rejectCertificateRequest(certificateRequestId);
  try {
    const qc = getQueryClientBridge();
    void qc.invalidateQueries({ queryKey: CERT_LIST_PREFIX });
    void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.certSummariesPrefix });
    void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.certDetailsPrefix });
  } catch {
    /* ignore */
  }
  return result;
}

async function revalidateCertificateRequests() {
  try {
    const qc = getQueryClientBridge();
    void qc.invalidateQueries({ queryKey: CERT_LIST_PREFIX });
  } catch {
    /* ignore */
  }
}

function useApproveCertificateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approveCertificateRequest,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CERT_LIST_PREFIX });
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.certSummariesPrefix });
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.certDetailsPrefix });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

function useRejectCertificateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (certificateRequestId: number) =>
      rejectCertificateRequest(certificateRequestId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CERT_LIST_PREFIX });
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.certSummariesPrefix });
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.certDetailsPrefix });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

function invalidateCertificateRequestDomains(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: CERT_LIST_PREFIX });
  void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.eligible });
  void qc.invalidateQueries({ queryKey: STUDENTS_LIST_PREFIX });
  void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.certSummariesPrefix });
  void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.certDetailsPrefix });
}

function invalidateStudentLifecycleDomains(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ["admin-student-lifecycle", "list"] });
  void qc.invalidateQueries({ queryKey: STUDENTS_LIST_PREFIX });
  void qc.invalidateQueries({ queryKey: CERT_LIST_PREFIX });
  void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.certSummariesPrefix });
  void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.certDetailsPrefix });
}

export function useRunStudentLifecycleInvalidation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: runStudentLifecycleInvalidation,
    onSuccess: () => invalidateStudentLifecycleDomains(qc),
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useExtendStudentLifecycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: extendStudentLifecycle,
    onSuccess: () => invalidateStudentLifecycleDomains(qc),
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useReactivateStudentLifecycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reactivateStudentLifecycle,
    onSuccess: () => invalidateStudentLifecycleDomains(qc),
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useBulkRequestCertificates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bulkRequestCertificates,
    onSuccess: () => invalidateCertificateRequestDomains(qc),
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useDispatchEligibleOrders(franchiseId: string, enabled = false) {
  return useQuery({
    queryKey: queryKeys.orders.dispatchEligible(franchiseId),
    queryFn: () => getDispatchEligibleOrders(franchiseId),
    enabled: enabled && !!franchiseId,
  });
}

function useBulkApproveCertificates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { ids: number[] }) => bulkApproveCertificates(vars),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CERT_LIST_PREFIX });
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.certSummariesPrefix });
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.certDetailsPrefix });
      void qc.invalidateQueries({ queryKey: queryKeys.orders.admin() });
      void qc.invalidateQueries({
        queryKey: ["orders", "dispatch-eligible"],
      });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useBulkDispatchIdCards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bulkDispatchIdCards,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.requestedIds });
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.issuedIds });
      void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.idCardSummaries() });
      void qc.invalidateQueries({ queryKey: ["admin-id-card-details", "list"] });
      void qc.invalidateQueries({ queryKey: queryKeys.orders.admin() });
      void qc.invalidateQueries({
        queryKey: ["orders", "dispatch-eligible"],
      });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

/**
 * Network-wide admin roster (ADM-12): unscoped GET /admin/student —
 * runtime-verified to return rows across all franchises when no franchiseId
 * is sent.
 */
export function useAdminStudentsRoster(
  params?: Omit<StudentPaginationParams, "franchiseId">,
) {
  return useQuery({
    queryKey: ["admin-students", "roster", params ?? null],
    queryFn: () => getPaginatedStudentsAdmin({ ...params }),
    placeholderData: (prev) => prev,
  });
}

export function useAdminStudentsByFranchise(
  franchiseId: string | null,
  params?: Omit<StudentPaginationParams, "franchiseId">,
) {
  return useQuery({
    queryKey: ["admin-students", "by-franchise", franchiseId, params ?? null],
    queryFn: () => getPaginatedStudentsAdmin({ ...params, franchiseId: franchiseId! }),
    enabled: franchiseId != null && franchiseId !== "",
    placeholderData: (prev) => prev,
  });
}
