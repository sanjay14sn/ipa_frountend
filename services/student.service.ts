export * from "./student-list.service";
export * from "./student-progression.service";
export * from "./student-id.service";

// ---------------------------------------------------------------------------
// Certificate functions remain here until extracted to their own sub-domain.
// Everything above is re-exported so all existing imports continue to work.
// ---------------------------------------------------------------------------

import { api } from "@/lib/axios";
import { getApiBaseUrl } from "@/lib/api-utils";
import {
  compactRequestParams,
  getPaginated,
  normalizePaginatedResult,
  unwrapData,
} from "@/lib/unwrap-api";
import { getAllStudents } from "@/services/student-list.service";

export interface RequestedCertificateDetail {
  id?: number;
  name: string;
  rollNo: string;
  dateOfBirth?: string;
  residentialAddress?: string;
  fatherContactNo?: string;
  motherContactNo?: string;
  franchiseName: string;
  franchiseeAddress?: string;
  marksObtained: number;
  totalMarks: number;
  courseInstructorId: number;
  courseInstructorName?: string;
  certificateIssueDate?: string;
}

export interface RequestedCertificateDetailsByFranchise {
  [franchiseName: string]: RequestedCertificateDetail[];
}

export async function getAllRequestedCertificateDetails(): Promise<RequestedCertificateDetailsByFranchise> {
  return {};
}

export async function getIssuedCertificateDetails(): Promise<RequestedCertificateDetailsByFranchise> {
  return {};
}

export interface AdminCertificateRequest {
  /** The certificate id (per-cert handle — used for reject and view-PDF). */
  id: number;
  /** The owning progression (used for approve — issues all its pending certs). */
  progressionId: number;
  /** The pooled certificate template this cert was issued from. */
  certificateTemplateId: number;
  /** Display name of the certificate template. */
  templateName: string;
  studentId: number;
  instructorId: number;
  franchiseId: string;
  requestDate: string;
  status: "Pending" | "Issued" | "Rejected";
  marksObtained: number;
  totalMarks: number;
  studentName: string;
  studentRollNo: string;
  studentDateOfBirth: string;
  studentSex: string;
  studentStandard: string;
  studentStream: string;
  studentLevel: string;
  /** Level code from program (e.g. stream ladder), when API provides it */
  studentLevelCode?: string;
  studentIsActive: boolean;
  studentDateOfJoining?: string;
  studentIdIssued: string;
  studentIdIssueDate?: string;
  instructorName: string;
  instructorInstructorId: string;
  franchiseName: string;
  levelPassMark: number;
  levelTotalMarks: number;
  certificatePdfPath?: string;
  issueDate?: string;
  dispatchStatus: "Not dispatched" | "Dispatched";
  dispatchedAt: string | null;
  dispatchOrderId: number | null;
}

export interface AdminCertificateRequestsByFranchise {
  [franchiseName: string]: AdminCertificateRequest[];
}

export interface AdminCertificateRequestsResponse {
  result: AdminCertificateRequestsByFranchise;
}

export interface CertificateFranchiseSummary {
  franchiseId: string;
  franchiseName: string;
  totalPending: number;
  totalIssued: number;
  totalRejected: number;
}

export interface CertificatePaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  status?: string;
  programId?: number;
}

export interface PaginatedCertificatesResponse {
  data: AdminCertificateRequest[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface FranchiseeCertificate {
  /** The certificate id (per-cert handle — used for view-PDF). */
  id: number;
  /** The owning progression. */
  progressionId: number;
  /** The pooled certificate template this cert was issued from. */
  certificateTemplateId: number;
  /** Display name of the certificate template. */
  templateName: string;
  studentId: number;
  instructorId: number;
  franchiseId: string;
  requestDate: string;
  status: "Pending" | "Issued" | "Rejected";
  marksObtained: number;
  totalMarks: number;
  issueDate?: string;
  certificatePdfPath?: string;
  studentName: string;
  studentRollNo: string;
  studentDateOfBirth: string;
  studentSex: string;
  studentStandard: string;
  studentStream: string;
  studentLevel: string;
  instructorName: string;
  instructorInstructorId: string;
  levelPassMark: number;
  levelTotalMarks: number;
  dispatchStatus: "Not dispatched" | "Dispatched";
  dispatchedAt: string | null;
  dispatchOrderId: number | null;
}

export interface FranchiseeCertificatesResponse {
  result: FranchiseeCertificate[];
}

export interface StudentCertificate {
  id: number;
  studentId: number;
  instructorId: number;
  franchiseId: string;
  levelId: number;
  requestDate: string;
  status: "Pending" | "Issued" | "Rejected";
  marksObtained: number;
  totalMarks: number;
  issueDate?: string;
  certificatePdfPath?: string;
  studentName: string;
  studentRollNo: string;
  studentLevel: string;
  certificateLevel: string;
  levelDisplayOrder: number;
  levelPassMark: number;
  levelTotalMarks: number;
  instructorName: string;
  instructorInstructorId: string;
}

export interface StudentCertificatesResponse {
  result: StudentCertificate[];
}

interface ApproveAndDispatchClassification {
  approveIds: number[];
  alreadyIssuedIds: number[];
  ineligible: Array<{ id: number; reason: string }>;
}

export interface BulkCertificateRequestStudentEntry {
  studentId: number;
  marksObtained: number;
  completionDate: string;
}

export interface BulkCertificateRequestGroup {
  programId: number;
  levelId: number;
  courseInstructorId: number;
  students: BulkCertificateRequestStudentEntry[];
}

export interface BulkCertificateRequestDto {
  groups: BulkCertificateRequestGroup[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type CertificateRow = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getLevelLabel(level: Record<string, unknown>, fallbackId: unknown): string {
  const name = String(level.name ?? "").trim();
  const code = String(level.code ?? "").trim();
  // Certificate views display the level CODE (e.g. "L1"), not the name.
  if (code) return code;
  if (name) return name;
  const numericId = Number(fallbackId ?? level.id ?? 0);
  return numericId > 0 ? `Level ${numericId}` : "N/A";
}

function mapCertRow(c: CertificateRow): AdminCertificateRequest {
  const student = asRecord(c.student);
  const instructor = asRecord(c.instructor);
  const franchise = asRecord(c.franchise);
  const level = asRecord(c.level);
  const stream = asRecord(level.stream);
  const fid = String(c.franchiseId ?? franchise.id ?? "");
  const fallbackStudentId = Number(c.studentId ?? student.id ?? 0);
  const fallbackInstructorId = Number(c.instructorId ?? instructor.id ?? 0);
  const marksObtained = Number(c.marksObtained ?? 0);
  const totalMarks = Number(c.totalMarks ?? level.totalMarks ?? 0);
  const passMark = Number(level.passMark ?? 0);
  const studentStream = String(stream.name ?? stream.code ?? "");
  const levelCodeRaw = String(level.code ?? "").trim();

  return {
    id: Number(c.id),
    progressionId: Number(c.progressionId ?? c.id ?? 0),
    certificateTemplateId: Number(c.certificateTemplateId ?? 0),
    templateName: String(c.templateName ?? ""),
    studentId: fallbackStudentId,
    instructorId: fallbackInstructorId,
    franchiseId: fid,
    requestDate: String(c.requestDate ?? ""),
    status: (c.status as AdminCertificateRequest["status"]) ?? "Pending",
    marksObtained,
    totalMarks,
    studentName: String(student.name ?? `Student #${fallbackStudentId}`),
    studentRollNo: String(student.rollNo ?? ""),
    studentDateOfBirth: String(student.dateOfBirth ?? ""),
    studentSex: String(student.sex ?? ""),
    studentStandard: String(student.standard ?? ""),
    studentStream,
    studentLevel: getLevelLabel(level, c.levelId),
    studentLevelCode: levelCodeRaw || undefined,
    studentIsActive: (String(student.status ?? "active")) === "active",
    studentDateOfJoining: student.dateOfJoining
      ? String(student.dateOfJoining)
      : undefined,
    studentIdIssued: String(student.idIssued ?? ""),
    studentIdIssueDate: student.idIssueDate ? String(student.idIssueDate) : undefined,
    instructorName: String(instructor.name ?? ""),
    instructorInstructorId: String(instructor.instructorCode ?? fallbackInstructorId),
    franchiseName: String(franchise.name ?? `Franchise ${fid}`),
    levelPassMark: passMark,
    levelTotalMarks: Number(level.totalMarks ?? totalMarks),
    certificatePdfPath: c.certificatePdfPath
      ? String(c.certificatePdfPath)
      : undefined,
    issueDate: c.issueDate ? String(c.issueDate) : undefined,
    dispatchStatus:
      c.dispatchStatus === "Dispatched" ? "Dispatched" : "Not dispatched",
    dispatchedAt: c.dispatchedAt ? String(c.dispatchedAt) : null,
    dispatchOrderId:
      c.dispatchOrderId != null ? Number(c.dispatchOrderId) : null,
  };
}

// ---------------------------------------------------------------------------
// Public API functions — certificates
// ---------------------------------------------------------------------------

export async function getAllAdminCertificateRequests(
  params?: CertificatePaginationParams,
): Promise<AdminCertificateRequestsResponse> {
  const merged = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 5000,
    search: params?.search,
    sortBy: params?.sortBy,
    sortOrder: params?.sortOrder,
    status: params?.status,
    programId: params?.programId,
  };
  const response = await api.get("/admin/certification/requests", {
    params: compactRequestParams(
      merged as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  const result = unwrapData<unknown>(response);
  const { rows: rawRows } = normalizePaginatedResult<unknown>(result);
  const grouped: AdminCertificateRequestsByFranchise = {};
  for (const raw of rawRows) {
    const req = mapCertRow(raw as CertificateRow);
    const gkey = req.franchiseName;
    if (!grouped[gkey]) grouped[gkey] = [];
    grouped[gkey].push(req);
  }
  return { result: grouped };
}

export async function approveCertificateRequest(
  certificateRequestId: number,
): Promise<unknown> {
  const response = await api.patch(
    `/admin/certification/certificate/${certificateRequestId}/approve`,
  );
  return unwrapData(response);
}

export async function rejectCertificateRequest(
  certificateRequestId: number,
  reason = "Rejected by admin",
): Promise<unknown> {
  const response = await api.patch(
    `/admin/certification/certificate/${certificateRequestId}/reject`,
    { reason },
  );
  return unwrapData(response);
}

export async function bulkApproveCertificates(dto: {
  ids: number[];
}): Promise<{ succeeded: number[]; failed: number[] }> {
  const response = await api.post(
    "/admin/certification/certificates/bulk-approve",
    dto,
  );
  return unwrapData(response);
}

export async function previewBulkDispatchPdf(ids: number[]): Promise<Blob> {
  const response = await api.post(
    "/admin/certification/certificates/bulk-dispatch/preview",
    { ids },
    { responseType: "blob" },
  );
  return response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: "application/pdf" });
}

export async function confirmBulkDispatch(
  ids: number[],
  orderId?: number,
): Promise<{ dispatched: number[]; skipped: number[]; orderId: number }> {
  const response = await api.post(
    "/admin/certification/certificates/bulk-dispatch/confirm",
    { ids, orderId },
  );
  return unwrapData(response);
}

export async function getDispatchEligibleCertificates(params: {
  franchiseId?: string;
  programId?: number;
  levelId?: number;
  page?: number;
  limit?: number;
  search?: string;
}) {
  const response = await api.get(
    "/admin/certification/certificates/dispatch-eligible",
    { params },
  );
  return unwrapData(response);
}

async function classifyForApproveAndDispatch(
  ids: number[],
): Promise<ApproveAndDispatchClassification> {
  const response = await api.post(
    "/admin/certification/certificates/dispatch-eligible/classify",
    { ids },
  );
  return unwrapData(response);
}

export async function approveSubsetForDispatch(
  ids: number[],
): Promise<{ approved: number[]; alreadyIssued: number[]; failed: number[] }> {
  const response = await api.post(
    "/admin/certification/certificates/approve-and-dispatch/approve",
    { ids },
  );
  return unwrapData(response);
}

export async function getApproveAndDispatchEligibleCertificates(params: {
  franchiseId?: string;
  programId?: number;
  levelId?: number;
  page?: number;
  limit?: number;
  search?: string;
}) {
  const response = await api.get(
    "/admin/certification/certificates/approve-and-dispatch-eligible",
    { params },
  );
  return unwrapData(response);
}

export async function getAdminCertificateSummaries(
  params: Record<string, unknown>,
): Promise<{
  data: CertificateFranchiseSummary[];
  meta: { total: number; totalPages: number };
}> {
  const normalized = await getPaginated<Record<string, unknown>>(
    "/admin/certification/summary",
    params,
  );
  const data = normalized.rows.map((row) => ({
    franchiseId: String(row.franchiseId ?? ""),
    franchiseName: String(row.franchiseName ?? ""),
    totalPending: Number(row.totalPending ?? 0),
    totalIssued: Number(row.totalIssued ?? 0),
    totalRejected: Number(row.totalRejected ?? 0),
  }));
  const lim = Number(normalized.limit ?? 20) || 20;
  const totalPages = Math.max(1, Math.ceil(normalized.total / lim));
  return { data, meta: { total: normalized.total, totalPages } };
}

export async function getAdminCertificatesByFranchise(
  franchiseId: string,
  params: CertificatePaginationParams,
): Promise<PaginatedCertificatesResponse> {
  const statusParam =
    params.status?.trim().toLowerCase() === "all" ? undefined : params.status;
  const response = await api.get("/admin/certification/requests", {
    params: compactRequestParams({
      franchiseId,
      page: params.page,
      limit: params.limit,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      status: statusParam,
    } as Record<string, string | number | boolean | undefined | null>),
  });
  const result = unwrapData<unknown>(response);
  const { rows: raw, total, page, limit } = normalizePaginatedResult<unknown>(result);
  const data = raw.map((row) => mapCertRow(row as CertificateRow));
  const lim = limit || 20;
  const totalPages = Math.ceil(total / lim) || 1;
  return {
    data,
    meta: { total, page: page || 1, limit: lim, totalPages },
  };
}

async function getPaginatedCertificates(
  params: CertificatePaginationParams,
): Promise<PaginatedCertificatesResponse> {
  const response = await api.get("/admin/certification/requests", {
    params: compactRequestParams({
      page: params.page,
      limit: params.limit,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    } as Record<string, string | number | boolean | undefined | null>),
  });
  const result = unwrapData<unknown>(response);
  const { rows: raw, total, page, limit } = normalizePaginatedResult<unknown>(result);
  const data = raw.map((row) => mapCertRow(row as CertificateRow));
  const lim = limit || 20;
  const totalPages = Math.ceil(total / lim) || 1;
  return {
    data,
    meta: { total, page: page || 1, limit: lim, totalPages },
  };
}

export async function getFranchiseeCertificates(
  params?: CertificatePaginationParams & { status?: string; programId?: number },
): Promise<FranchiseeCertificatesResponse> {
  const response = await api.get("/certification", {
    params: compactRequestParams(
      params as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  const result = unwrapData<unknown>(response);
  const { rows } = normalizePaginatedResult<unknown>(result);
  const list = rows.map((raw) => mapCertRow(raw as CertificateRow));
  return { result: list };
}

function getCertificatePdfUrl(certificatePdfPath: string): string {
  if (!certificatePdfPath) return "";
  const baseUrl = api.defaults.baseURL || getApiBaseUrl();
  const normalized = certificatePdfPath.replace(/\\/g, "/").trim();
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const uploadsIndex = normalized.toLowerCase().indexOf("/uploads/");
  if (uploadsIndex >= 0) {
    return `${baseUrl}${normalized.slice(uploadsIndex)}`;
  }
  if (normalized.startsWith("/uploads/")) return `${baseUrl}${normalized}`;
  if (normalized.startsWith("uploads/")) return `${baseUrl}/${normalized}`;
  return `${baseUrl}/uploads/${normalized.replace(/^\/+/, "")}`;
}

export function getAdminCertificatePdfUrl(certificateId: number): string {
  const baseUrl = api.defaults.baseURL || getApiBaseUrl();
  return `${baseUrl}/admin/certification/certificate/${certificateId}/pdf`;
}

export function getFranchiseeCertificatePdfUrl(certificateId: number): string {
  const baseUrl = api.defaults.baseURL || getApiBaseUrl();
  return `${baseUrl}/certification/${certificateId}/pdf`;
}

export async function bulkRequestCertificates(
  data: BulkCertificateRequestDto,
): Promise<unknown> {
  const response = await api.post("/certification/bulk-request", data);
  return unwrapData(response);
}

export async function requestCertificateForStudent(body: {
  studentId: number;
  programId: number;
  levelId: number;
  marksObtained?: number;
  totalMarks?: number;
  courseInstructorId?: number;
  completionDate: string;
}) {
  const response = await api.post("/certification/request", body);
  return unwrapData(response);
}

export async function getStudentCertificates(
  studentId: number,
): Promise<StudentCertificatesResponse> {
  const response = await api.get(`/certification/student/${studentId}`);
  const result = unwrapData<unknown>(response);
  const { rows } = normalizePaginatedResult<unknown>(result);
  const list = rows.map((row) => {
    const mapped = mapCertRow(row as CertificateRow);
    return {
      id: mapped.id,
      studentId: mapped.studentId,
      instructorId: mapped.instructorId,
      franchiseId: mapped.franchiseId,
      levelId: Number((row as CertificateRow).levelId ?? 0),
      requestDate: mapped.requestDate,
      status: mapped.status,
      marksObtained: mapped.marksObtained,
      totalMarks: mapped.totalMarks,
      issueDate: mapped.issueDate,
      certificatePdfPath: mapped.certificatePdfPath,
      studentName: mapped.studentName,
      studentRollNo: mapped.studentRollNo,
      studentLevel: mapped.studentLevel,
      certificateLevel: mapped.studentLevel,
      levelDisplayOrder: Number(asRecord((row as CertificateRow).level).displayOrder ?? 0),
      levelPassMark: mapped.levelPassMark,
      levelTotalMarks: mapped.levelTotalMarks,
      instructorName: mapped.instructorName,
      instructorInstructorId: mapped.instructorInstructorId,
    } as StudentCertificate;
  });
  return { result: list };
}

export async function getAdminStudentCertificates(
  studentId: number,
): Promise<StudentCertificatesResponse> {
  const response = await api.get(`/admin/certification/student/${studentId}`);
  const result = unwrapData<unknown>(response);
  const { rows } = normalizePaginatedResult<unknown>(result);
  const list = rows.map((row) => {
    const mapped = mapCertRow(row as CertificateRow);
    return {
      id: mapped.id,
      studentId: mapped.studentId,
      instructorId: mapped.instructorId,
      franchiseId: mapped.franchiseId,
      levelId: Number((row as CertificateRow).levelId ?? 0),
      requestDate: mapped.requestDate,
      status: mapped.status,
      marksObtained: mapped.marksObtained,
      totalMarks: mapped.totalMarks,
      issueDate: mapped.issueDate,
      certificatePdfPath: mapped.certificatePdfPath,
      studentName: mapped.studentName,
      studentRollNo: mapped.studentRollNo,
      studentLevel: mapped.studentLevel,
      certificateLevel: mapped.studentLevel,
      levelDisplayOrder: Number(asRecord((row as CertificateRow).level).displayOrder ?? 0),
      levelPassMark: mapped.levelPassMark,
      levelTotalMarks: mapped.levelTotalMarks,
      instructorName: mapped.instructorName,
      instructorInstructorId: mapped.instructorInstructorId,
    } as StudentCertificate;
  });
  return { result: list };
}

