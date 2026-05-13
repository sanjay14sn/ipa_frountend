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
  deleteStudent,
  requestStudentIds,
  issueIdCard,
  getAllRequestedIdDetails,
  getIssuedIdDetails,
  getAllRequestedCertificateDetails,
  getIssuedCertificateDetails,
  issueCertificate,
  getEligibleStudents,
  getAllAdminCertificateRequests,
  approveCertificateRequest,
  rejectCertificateRequest,
  getFranchiseeCertificates,
  requestCertificateForStudent,
  bulkRequestCertificates,
  getPaginatedStudents,
  getAdminIdCardSummaries,
  getAdminIdCardDetails,
  getAdminCertificateSummaries,
  getAdminCertificatesByFranchise,
  bulkDispatchCertificates,
  bulkDispatchIdCards,
  type StudentData,
  type StudentPaginationParams,
  type CertificatePaginationParams,
  type PaginationMeta,
} from "@/services/student.service";
import { getDispatchEligibleOrders } from "@/services/order.service";
import { queryKeys } from "./query-keys";
import { getQueryClientBridge } from "./query-client-bridge";

export {
  type StudentData,
  type RequestedIdDetailsByFranchise,
  type RequestedCertificateDetailsByFranchise,
  type EligibleStudent,
  type AdminCertificateRequest,
  type AdminCertificateRequestsByFranchise,
  type FranchiseeCertificate,
} from "@/services/student.service";

function wantsStudentPagination(params?: StudentPaginationParams): boolean {
  if (params == null) return false;
  return (
    params.page != null ||
    params.limit != null ||
    (params.search != null && params.search !== "") ||
    (params.status != null && params.status !== "") ||
    params.sortBy != null ||
    params.sortOrder != null
  );
}

/** Prefix for invalidating all student list cache variants. */
export const STUDENTS_LIST_PREFIX = ["students", "list"] as const;
export const REQUESTED_IDS_KEY = queryKeys.studentAdmin.requestedIds;
export const ISSUED_IDS_KEY = queryKeys.studentAdmin.issuedIds;
export const REQUESTED_CERTIFICATES_KEY = queryKeys.studentAdmin.requestedCerts;
export const ISSUED_CERTIFICATES_KEY = queryKeys.studentAdmin.issuedCerts;
export const ELIGIBLE_STUDENTS_KEY = queryKeys.studentAdmin.eligible;
/** @deprecated Use queryKeys.studentAdmin.adminCertRequests(params) or invalidate certification lists. */
export const ADMIN_CERTIFICATE_REQUESTS_KEY =
  queryKeys.studentAdmin.adminCertRequests();
/** @deprecated Use queryKeys.studentAdmin.franchiseeCerts(params) or invalidate certification lists. */
export const FRANCHISEE_CERTIFICATES_KEY = queryKeys.studentAdmin.franchiseeCerts();
/** @deprecated Use STUDENTS_LIST_PREFIX or queryKeys.students.list(params). */
export const STUDENTS_KEY = queryKeys.students.list();

export function useStudents(params?: StudentPaginationParams) {
  const paginated = wantsStudentPagination(params);
  const q = useQuery({
    queryKey: queryKeys.students.list(params as Record<string, unknown>),
    queryFn: async () => {
      if (paginated) {
        return getPaginatedStudents(params!);
      }
      const r = await getAllStudents();
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

export function useRequestedIdDetails() {
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

export function useIssuedIdDetails() {
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

export function useRequestedCertificateDetails() {
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

export function useIssuedCertificateDetails() {
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

export function useAdminCertificateRequests(
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
) {
  return useQuery({
    queryKey: [...queryKeys.studentAdmin.idCardSummaries(params), refreshKey],
    queryFn: () => getAdminIdCardSummaries(params),
    placeholderData: (prev) => prev,
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

export function useAdminCertificateSummaries(params: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.studentAdmin.certSummaries(params),
    queryFn: () => getAdminCertificateSummaries(params),
    placeholderData: (prev) => prev,
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

export async function createStudentWithRevalidation(
  studentData: Omit<
    StudentData,
    "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
  >,
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

export async function deleteStudentWithRevalidation(studentId: number) {
  await deleteStudent(studentId);
  try {
    invalidateStudentLists(getQueryClientBridge());
  } catch {
    /* ignore */
  }
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

export async function issueCertificateWithRevalidation(studentId: number) {
  const result = await issueCertificate(studentId);
  try {
    const qc = getQueryClientBridge();
    void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.requestedCerts });
    void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.issuedCerts });
    void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.eligible });
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
    void qc.invalidateQueries({ queryKey: ["admin-cert-summaries"] });
    void qc.invalidateQueries({ queryKey: ["admin-cert-details", "list"] });
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
    void qc.invalidateQueries({ queryKey: ["admin-cert-summaries"] });
    void qc.invalidateQueries({ queryKey: ["admin-cert-details", "list"] });
  } catch {
    /* ignore */
  }
  return result;
}

export async function revalidateCertificateRequests() {
  try {
    const qc = getQueryClientBridge();
    void qc.invalidateQueries({ queryKey: CERT_LIST_PREFIX });
  } catch {
    /* ignore */
  }
}

export function useApproveCertificateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approveCertificateRequest,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CERT_LIST_PREFIX });
      void qc.invalidateQueries({ queryKey: ["admin-cert-summaries"] });
      void qc.invalidateQueries({ queryKey: ["admin-cert-details", "list"] });
    },
  });
}

export function useRejectCertificateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (certificateRequestId: number) =>
      rejectCertificateRequest(certificateRequestId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CERT_LIST_PREFIX });
      void qc.invalidateQueries({ queryKey: ["admin-cert-summaries"] });
      void qc.invalidateQueries({ queryKey: ["admin-cert-details", "list"] });
    },
  });
}

function invalidateCertificateRequestDomains(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: CERT_LIST_PREFIX });
  void qc.invalidateQueries({ queryKey: queryKeys.studentAdmin.eligible });
  void qc.invalidateQueries({ queryKey: STUDENTS_LIST_PREFIX });
  void qc.invalidateQueries({ queryKey: ["admin-cert-summaries"] });
  void qc.invalidateQueries({ queryKey: ["admin-cert-details", "list"] });
}

export function useRequestCertificateForStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: requestCertificateForStudent,
    onSuccess: () => invalidateCertificateRequestDomains(qc),
  });
}

export function useBulkRequestCertificates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bulkRequestCertificates,
    onSuccess: () => invalidateCertificateRequestDomains(qc),
  });
}

export function useDispatchEligibleOrders(franchiseId: string, enabled = false) {
  return useQuery({
    queryKey: queryKeys.orders.dispatchEligible(franchiseId),
    queryFn: () => getDispatchEligibleOrders(franchiseId),
    enabled: enabled && !!franchiseId,
  });
}

export function useBulkDispatchCertificates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bulkDispatchCertificates,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CERT_LIST_PREFIX });
      void qc.invalidateQueries({ queryKey: ["admin-cert-summaries"] });
      void qc.invalidateQueries({ queryKey: ["admin-cert-details", "list"] });
      void qc.invalidateQueries({ queryKey: queryKeys.orders.admin() });
      void qc.invalidateQueries({
        queryKey: ["orders", "dispatch-eligible"],
      });
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
  });
}
