import { api } from "@/lib/axios";
import { getApiBaseUrl } from "@/lib/api-utils";
import {
  compactRequestParams,
  normalizePaginatedResult,
  unwrapData,
} from "@/lib/unwrap-api";
import { withProgramScope } from "./_scope";

export interface Response {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
}

export enum StudentLevel {
  EL1 = "EL1",
}

export enum StudentStream {
  REGULAR = "Regular",
  SUMMER_CAMP = "Summer Camp",
}

export enum StudentIdStatus {
  NOT_ISSUED = "Not Issued",
  ISSUED = "Issued",
  REQUESTED = "Requested",
}

export interface StudentData {
  id: number;
  franchiseId: string;
  programId: number;
  name: string;
  rollNo: string;
  dateOfBirth: Date;
  sex: string;
  fatherName: string;
  fatherQualification: string;
  fatherOccupation: string;
  motherName: string;
  motherQualification: string;
  motherOccupation: string;
  residentialAddress: string;
  fatherContactNo: string;
  motherContactNo: string;
  mail: string;
  standard: string;
  levelId?: number;
  level: StudentLevel | string | { id: number; name: string; code: string; streamId: number; displayOrder?: number };
  stream: StudentStream | string;
  isActive: boolean;
  idIssued: StudentIdStatus;
  deactivateDate?: Date;
  dateOfJoining?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number;
  updatedBy: number;
  materialsOrdered?: boolean;
}

export interface StudentsResponse {
  result: StudentData[];
}

export interface PreviousLevelProgressionInput {
  levelId: number;
  marks: number;
  theoryMarks: number;
  totalMarks: number;
  completedAt: string;
  instructorId: number;
}

export type CreateStudentInput = Omit<
  StudentData,
  "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
> & {
  existing?: boolean;
  idIssueDate?: string;
  previousLevel?: PreviousLevelProgressionInput;
};

function normalizeStudentIdStatus(value: unknown): StudentIdStatus {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "issued") return StudentIdStatus.ISSUED;
  if (raw === "requested") return StudentIdStatus.REQUESTED;
  return StudentIdStatus.NOT_ISSUED;
}

function normalizeStudentLevel(
  row: Record<string, unknown>,
): StudentData["level"] {
  const rawLevel = row.level;
  if (rawLevel && typeof rawLevel === "object") {
    const level = rawLevel as Record<string, unknown>;
    return {
      id: Number(level.id ?? row.levelId ?? 0),
      name: String(level.name ?? level.code ?? row.levelName ?? "N/A"),
      code: String(level.code ?? level.name ?? row.levelName ?? "N/A"),
      streamId: Number(level.streamId ?? 0),
      displayOrder: level.displayOrder != null ? Number(level.displayOrder) : undefined,
    };
  }

  const levelId = row.levelId != null ? Number(row.levelId) : 0;
  if (row.levelName || row.levelCode || levelId > 0) {
    return {
      id: levelId,
      name: String(row.levelName ?? row.levelCode ?? `Level ${levelId}`),
      code: String(row.levelCode ?? row.levelName ?? `Level ${levelId}`),
      streamId: Number(row.streamId ?? 0),
    };
  }

  return StudentLevel.EL1;
}

function normalizeStudentStream(row: Record<string, unknown>): string {
  const rawLevel = row.level;
  const level =
    rawLevel && typeof rawLevel === "object"
      ? (rawLevel as Record<string, unknown>)
      : undefined;
  const nestedStream =
    level?.stream && typeof level.stream === "object"
      ? (level.stream as Record<string, unknown>)
      : undefined;
  return String(
    row.stream ??
      row.streamName ??
      nestedStream?.name ??
      nestedStream?.code ??
      StudentStream.REGULAR,
  );
}

function mapStudentRow(row: Record<string, unknown>): StudentData {
  const idIssued = normalizeStudentIdStatus(row.idIssued);

  return {
    id: Number(row.id),
    franchiseId: String(row.franchiseId ?? ""),
    programId: Number(row.programId ?? 0),
    name: String(row.name ?? ""),
    rollNo: String(row.rollNo ?? ""),
    dateOfBirth: new Date(String(row.dateOfBirth ?? "")),
    sex: String(row.sex ?? ""),
    fatherName: String(row.fatherName ?? ""),
    fatherQualification: String(row.fatherQualification ?? ""),
    fatherOccupation: String(row.fatherOccupation ?? ""),
    motherName: String(row.motherName ?? ""),
    motherQualification: String(row.motherQualification ?? ""),
    motherOccupation: String(row.motherOccupation ?? ""),
    residentialAddress: String(row.residentialAddress ?? ""),
    fatherContactNo: String(row.fatherContactNo ?? ""),
    motherContactNo: String(row.motherContactNo ?? ""),
    mail: String(row.email ?? row.mail ?? ""),
    standard: String(row.standard ?? ""),
    levelId: row.levelId != null ? Number(row.levelId) : undefined,
    level: normalizeStudentLevel(row),
    stream: normalizeStudentStream(row),
    isActive: Boolean(row.isActive ?? true),
    idIssued,
    dateOfJoining: row.dateOfJoining
      ? new Date(String(row.dateOfJoining))
      : undefined,
    createdAt: new Date(String(row.createdAt ?? "")),
    updatedAt: new Date(String(row.updatedAt ?? "")),
    createdBy: Number(row.createdBy ?? 0),
    updatedBy: Number(row.updatedBy ?? 0),
    materialsOrdered: Boolean(row.materialsOrdered ?? false),
  };
}

export async function getAllStudents(
  params?: StudentPaginationParams,
): Promise<StudentsResponse> {
  const merged: StudentPaginationParams = withProgramScope({
    page: params?.page ?? 1,
    limit: params?.limit ?? 10_000,
    ...params,
  });
  const response = await api.get("/student", {
    params: compactRequestParams(
      merged as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  const result = unwrapData<unknown>(response);
  const { rows } = normalizePaginatedResult<unknown>(result);
  const list = rows.map((r) => mapStudentRow(r as Record<string, unknown>));
  return { result: list };
}

export async function getStudentById(studentId: number): Promise<StudentData> {
  const response = await api.get(`/student/${studentId}`);
  const row = unwrapData<Record<string, unknown>>(response);
  return mapStudentRow(row);
}

export async function createStudent(
  studentData: CreateStudentInput,
): Promise<StudentData> {
  const dob =
    studentData.dateOfBirth instanceof Date
      ? studentData.dateOfBirth.toISOString().slice(0, 10)
      : String(studentData.dateOfBirth).slice(0, 10);
  const response = await api.post("/student", {
    programId: Number(studentData.programId),
    levelId: Number(studentData.levelId),
    name: studentData.name,
    rollNo: studentData.rollNo,
    sex: studentData.sex,
    dateOfBirth: dob,
    fatherName: studentData.fatherName,
    fatherQualification: studentData.fatherQualification,
    fatherOccupation: studentData.fatherOccupation,
    motherName: studentData.motherName,
    motherQualification: studentData.motherQualification,
    motherOccupation: studentData.motherOccupation,
    residentialAddress: studentData.residentialAddress,
    fatherContactNo: studentData.fatherContactNo,
    motherContactNo: studentData.motherContactNo,
    email: studentData.mail,
    standard: studentData.standard,
    dateOfJoining:
      studentData.dateOfJoining instanceof Date
        ? studentData.dateOfJoining.toISOString().slice(0, 10)
        : studentData.dateOfJoining
          ? String(studentData.dateOfJoining).slice(0, 10)
          : undefined,
    existing: studentData.existing ?? false,
    idIssued: studentData.idIssued,
    idIssueDate: studentData.idIssueDate,
    previousLevel: studentData.previousLevel,
  });
  const row = unwrapData<Record<string, unknown>>(response);
  return mapStudentRow(row);
}

export async function updateStudent(
  _studentId: number,
  _studentData: Partial<StudentData>,
): Promise<StudentData> {
  throw new Error("Student update not available in ipa-new");
}

export async function deleteStudent(_studentId: number): Promise<void> {
  throw new Error("Student delete not available in ipa-new");
}


export async function issueStudentId(_studentId: number): Promise<StudentData> {
  const row = await issueIdCard(_studentId);
  return mapStudentRow(row as Record<string, unknown>);
}

export async function requestStudentIds(studentIds: number[]): Promise<Response> {
  const unique = [
    ...new Set(studentIds.filter((id) => Number.isInteger(id) && id > 0)),
  ];
  for (const studentId of unique) {
    await api.post("/id-card/request", { studentId });
  }
  return {
    statusCode: 200,
    timeStamp: new Date().toISOString(),
    method: "POST",
    path: "/id-card/request",
    message: "ID card requests submitted",
  };
}

export interface RequestedIdDetail {
  id?: number;
  name: string;
  rollNo: string;
  dateOfBirth?: string;
  idRequestedAt?: string;
  residentialAddress?: string;
  fatherContactNo?: string;
  motherContactNo?: string;
  franchiseName?: string;
  franchiseeAddress?: string;
  idIssueDate?: string;
  /** Present when listing mixed Requested/Issued rows (admin id-card "all"). */
  idIssued?: string;
  franchise?: {
    id: string;
    name: string;
    address?: string;
  };
}

export interface RequestedIdDetailsByFranchise {
  [franchiseName: string]: RequestedIdDetail[];
}

function mapRequestedIdDetail(row: Record<string, unknown>): RequestedIdDetail {
  const franchiseRaw =
    row.franchise && typeof row.franchise === "object"
      ? (row.franchise as Record<string, unknown>)
      : undefined;
  const franchiseId = String(
    row.franchiseId ?? franchiseRaw?.id ?? row.franchiseID ?? "",
  );
  const franchiseName = String(
    row.franchiseName ??
      franchiseRaw?.name ??
      (franchiseId ? `Franchise ${franchiseId}` : "Franchise"),
  );
  const franchiseAddress = String(
    row.franchiseeAddress ?? row.franchiseAddress ?? franchiseRaw?.address ?? "",
  );

  return {
    id: row.id != null ? Number(row.id) : undefined,
    name: String(row.name ?? ""),
    rollNo: String(row.rollNo ?? ""),
    dateOfBirth: row.dateOfBirth ? String(row.dateOfBirth) : undefined,
    residentialAddress: row.residentialAddress
      ? String(row.residentialAddress)
      : undefined,
    fatherContactNo: row.fatherContactNo
      ? String(row.fatherContactNo)
      : undefined,
    motherContactNo: row.motherContactNo
      ? String(row.motherContactNo)
      : undefined,
    franchiseName,
    franchiseeAddress: franchiseAddress || undefined,
    idIssueDate: row.idIssueDate ? String(row.idIssueDate) : undefined,
    idIssued: row.idIssued != null ? String(row.idIssued) : undefined,
    idRequestedAt: row.idRequestedAt
      ? String(row.idRequestedAt)
      : undefined,
    franchise: {
      id: franchiseId,
      name: franchiseName,
      address: franchiseAddress || undefined,
    },
  };
}

function groupRequestedIdDetails(
  rows: Record<string, unknown>[],
): RequestedIdDetailsByFranchise {
  const grouped: RequestedIdDetailsByFranchise = {};
  for (const row of rows) {
    const detail = mapRequestedIdDetail(row);
    const groupName = detail.franchiseName || "Franchise";
    if (!grouped[groupName]) grouped[groupName] = [];
    grouped[groupName].push(detail);
  }
  return grouped;
}

export async function getAllRequestedIdDetails(): Promise<RequestedIdDetailsByFranchise> {
  return (await getPaginatedRequestedIdDetails({ page: 1, limit: 5000 })).data;
}

export async function issueIdCard(studentId: number): Promise<unknown> {
  const response = await api.patch(`/admin/id-card/${studentId}/issue`);
  return unwrapData(response);
}

export async function getIssuedIdDetails(): Promise<RequestedIdDetailsByFranchise> {
  return (await getPaginatedIssuedIds({ page: 1, limit: 5000 })).data;
}

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


export interface EligibleStudent {
  id: number;
  programId: number;
  levelId: number;
  name: string;
  rollNo: string;
  dateOfBirth: string;
  sex: string;
  standard: string;
  stream: string;
  levelName: string;
  /** Duration in months of the student's current level — used to compute the
   *  15-day "duration exceeded" buffer on the eligibility badge. */
  durationInMonths: number;
  isActive: boolean;
  lastCertIssuedAt: string | null;
  eligibilityReason: "no_certificate" | "duration_exceeded";
}

export interface EligibleStudentsResponse {
  result: EligibleStudent[];
}

export async function getEligibleStudents(): Promise<EligibleStudentsResponse> {
  const response = await api.get("/student/eligible");
  const list = unwrapData<unknown[]>(response) ?? [];
  const mapped: EligibleStudent[] = list.map((r) => {
    const s = r as Record<string, unknown>;
    const level = s.level as Record<string, unknown> | null | undefined;
    const levelStream = level?.stream && typeof level.stream === "object"
      ? (level.stream as Record<string, unknown>)
      : undefined;
    return {
      id: s.id as number,
      programId: s.programId as number,
      levelId: s.levelId as number,
      name: s.name as string,
      rollNo: s.rollNo as string,
      dateOfBirth: String(s.dateOfBirth ?? ""),
      sex: s.sex as string,
      standard: (s.standard as string) ?? "",
      stream: String(levelStream?.name ?? (s.stream as string) ?? StudentStream.REGULAR),
      levelName: level?.name ? String(level.name) : String(s.levelId ?? ""),
      durationInMonths: Number(level?.durationInMonths ?? 0),
      isActive: Boolean(s.isActive),
      lastCertIssuedAt: (s.lastCertIssuedAt as string | null) ?? null,
      eligibilityReason: (s.eligibilityReason as "no_certificate" | "duration_exceeded") ?? "no_certificate",
    };
  });
  return { result: mapped };
}

export interface AdminCertificateRequest {
  id: number;
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

type CertificateRow = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getLevelLabel(level: Record<string, unknown>, fallbackId: unknown): string {
  const name = String(level.name ?? "").trim();
  const code = String(level.code ?? "").trim();
  if (name) return name;
  if (code) return code;
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
    studentIsActive: Boolean(student.isActive ?? true),
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

export interface ApproveAndDispatchClassification {
  approveIds: number[];
  alreadyIssuedIds: number[];
  ineligible: Array<{ id: number; reason: string }>;
}

export async function classifyForApproveAndDispatch(
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

export async function bulkDispatchIdCards(dto: {
  studentIds: number[];
  orderId?: number;
}): Promise<{ succeeded: number[]; failed: number[] }> {
  const response = await api.post("/admin/id-card/bulk-dispatch", dto);
  return unwrapData(response);
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedStudentsResponse {
  data: StudentData[];
  meta: PaginationMeta;
}

export interface GroupedIdDetailsData {
  [franchiseName: string]: RequestedIdDetail[];
}

export interface PaginatedIdDetailsResponse {
  data: GroupedIdDetailsData;
  meta: PaginationMeta;
}

export interface StudentPaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  /** Admin list: scope to franchise (ipa-new). */
  franchiseId?: string;
  levelId?: number;   // NEW
  idStatus?: string;  // NEW — "Not Issued" | "Requested" | "Issued"
  /** Active program scope. Auto-injected from the scope store via withProgramScope. */
  programId?: number;
  /** Legacy: agreement-driven scope. Backend resolves to programId. */
  agreementId?: number;
}

export type StudentLifecycleStatus =
  | "ACTIVE"
  | "AT_RISK"
  | "EXTENDED"
  | "INVALIDATED"
  | "REACTIVATED";

export interface StudentLifecycleRow {
  id: number;
  studentId: number;
  name: string;
  rollNo: string;
  franchiseId: string;
  franchiseName: string;
  levelId: number;
  levelName: string;
  levelCode: string;
  durationInMonths: number | null;
  isActive: boolean;
  dateOfJoining: string | null;
  certificateStatus: string;
  progressionStatus: string | null;
  lifecycleStatus: StudentLifecycleStatus;
  isAtRisk: boolean;
  lifecycleDeadline: string | null;
  lifecycleExtendedUntil: string | null;
  lifecycleInvalidatedAt: string | null;
  lifecycleInvalidationReason: string | null;
  lifecycleReactivatedAt: string | null;
  lifecycleManagedBy: number | null;
}

export interface PaginatedStudentLifecycleResponse {
  data: StudentLifecycleRow[];
  meta: PaginationMeta;
}

export interface StudentLifecycleRunResult {
  success: boolean;
  invalidatedCount: number;
  studentIds: number[];
  runAt: string;
}

export async function getPaginatedStudents(
  params: StudentPaginationParams,
): Promise<PaginatedStudentsResponse> {
  const response = await api.get("/student", {
    params: compactRequestParams(
      withProgramScope({
        page: params.page,
        limit: params.limit,
        search: params.search,
        status: params.status,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        levelId: params.levelId,
        idStatus: params.idStatus,
        agreementId: params.agreementId,
        programId: params.programId,
      }) as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  const result = unwrapData<unknown>(response);
  const { rows: raw, total, page, limit } = normalizePaginatedResult<unknown>(result);
  const data = raw.map((r) => mapStudentRow(r as Record<string, unknown>));
  const lim = limit || 20;
  const totalPages = Math.ceil(total / lim) || 1;
  const pageNum = page || 1;
  return {
    data,
    meta: {
      total,
      page: pageNum,
      limit: lim,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1,
    },
  };
}

/** Admin: paginated students; pass franchiseId to scope (ipa-new GET /admin/student). */
export async function getPaginatedStudentsAdmin(
  params: StudentPaginationParams,
): Promise<PaginatedStudentsResponse> {
  const response = await api.get("/admin/student", {
    params: compactRequestParams({
      page: params.page,
      limit: params.limit,
      search: params.search,
      status: params.status,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      franchiseId: params.franchiseId,
    } as Record<string, string | number | boolean | undefined | null>),
  });
  const result = unwrapData<unknown>(response);
  const { rows: raw, total, page, limit } = normalizePaginatedResult<unknown>(result);
  const data = raw.map((r) => mapStudentRow(r as Record<string, unknown>));
  const lim = limit || 20;
  const totalPages = Math.ceil(total / lim) || 1;
  const pageNum = page || 1;
  return {
    data,
    meta: {
      total,
      page: pageNum,
      limit: lim,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1,
    },
  };
}

function mapLifecycleRow(row: Record<string, unknown>): StudentLifecycleRow {
  return {
    id: Number(row.id ?? row.studentId ?? 0),
    studentId: Number(row.studentId ?? row.id ?? 0),
    name: String(row.name ?? ""),
    rollNo: String(row.rollNo ?? ""),
    franchiseId: String(row.franchiseId ?? ""),
    franchiseName: String(row.franchiseName ?? ""),
    levelId: Number(row.levelId ?? 0),
    levelName: String(row.levelName ?? ""),
    levelCode: String(row.levelCode ?? ""),
    durationInMonths:
      row.durationInMonths == null ? null : Number(row.durationInMonths),
    isActive: Boolean(row.isActive),
    dateOfJoining: row.dateOfJoining ? String(row.dateOfJoining) : null,
    certificateStatus: String(row.certificateStatus ?? "NONE"),
    progressionStatus: row.progressionStatus ? String(row.progressionStatus) : null,
    lifecycleStatus: (String(row.lifecycleStatus ?? "ACTIVE") as StudentLifecycleStatus),
    isAtRisk: Boolean(row.isAtRisk),
    lifecycleDeadline: row.lifecycleDeadline ? String(row.lifecycleDeadline) : null,
    lifecycleExtendedUntil: row.lifecycleExtendedUntil
      ? String(row.lifecycleExtendedUntil)
      : null,
    lifecycleInvalidatedAt: row.lifecycleInvalidatedAt
      ? String(row.lifecycleInvalidatedAt)
      : null,
    lifecycleInvalidationReason: row.lifecycleInvalidationReason
      ? String(row.lifecycleInvalidationReason)
      : null,
    lifecycleReactivatedAt: row.lifecycleReactivatedAt
      ? String(row.lifecycleReactivatedAt)
      : null,
    lifecycleManagedBy:
      row.lifecycleManagedBy == null ? null : Number(row.lifecycleManagedBy),
  };
}

export async function getAdminStudentLifecycle(
  params: StudentPaginationParams,
): Promise<PaginatedStudentLifecycleResponse> {
  const response = await api.get("/admin/student/lifecycle", {
    params: compactRequestParams({
      page: params.page,
      limit: params.limit,
      search: params.search,
      status: params.status,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      franchiseId: params.franchiseId,
    } as Record<string, string | number | boolean | undefined | null>),
  });
  const result = unwrapData<unknown>(response);
  const { rows: raw, total, page, limit } = normalizePaginatedResult<unknown>(result);
  const data = raw.map((r) => mapLifecycleRow(r as Record<string, unknown>));
  const lim = limit || 20;
  const totalPages = Math.ceil(total / lim) || 1;
  const pageNum = page || 1;
  return {
    data,
    meta: {
      total,
      page: pageNum,
      limit: lim,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1,
    },
  };
}

export async function getFranchiseeStudentLifecycle(
  studentId: number,
): Promise<StudentLifecycleRow> {
  const response = await api.get(`/student/${studentId}/lifecycle`);
  const raw = unwrapData<Record<string, unknown>>(response);
  return mapLifecycleRow(raw);
}

export async function runStudentLifecycleInvalidation(): Promise<StudentLifecycleRunResult> {
  const response = await api.post("/admin/student/lifecycle/run-invalidation");
  return unwrapData<StudentLifecycleRunResult>(response);
}

export async function extendStudentLifecycle(input: {
  studentId: number;
  extendedUntil: string;
}): Promise<unknown> {
  const response = await api.patch(
    `/admin/student/${input.studentId}/lifecycle/extend`,
    { extendedUntil: input.extendedUntil },
  );
  return unwrapData(response);
}

export async function reactivateStudentLifecycle(input: {
  studentId: number;
  extendedUntil: string;
}): Promise<unknown> {
  const response = await api.patch(
    `/admin/student/${input.studentId}/lifecycle/reactivate`,
    { extendedUntil: input.extendedUntil },
  );
  return unwrapData(response);
}

function buildIdMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit) || 0;
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export async function getPaginatedRequestedIdDetails(
  params: StudentPaginationParams,
): Promise<PaginatedIdDetailsResponse> {
  const response = await api.get("/admin/id-card", {
    params: compactRequestParams({
      status: "Requested",
      page: params.page,
      limit: params.limit,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    } as Record<string, string | number | boolean | undefined | null>),
  });
  const result = unwrapData<unknown>(response);
  const { rows, total, page, limit } = normalizePaginatedResult<unknown>(result);
  const rawRows = rows as Record<string, unknown>[];
  return {
    data: groupRequestedIdDetails(rawRows),
    meta: buildIdMeta(total, page || 1, limit || 20),
  };
}

export async function getPaginatedIssuedIds(
  params: StudentPaginationParams,
): Promise<PaginatedIdDetailsResponse> {
  const response = await api.get("/admin/id-card", {
    params: compactRequestParams({
      status: "Issued",
      page: params.page,
      limit: params.limit,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    } as Record<string, string | number | boolean | undefined | null>),
  });
  const result = unwrapData<unknown>(response);
  const { rows, total, page, limit } = normalizePaginatedResult<unknown>(result);
  return {
    data: groupRequestedIdDetails(rows as Record<string, unknown>[]),
    meta: buildIdMeta(total, page || 1, limit || 20),
  };
}

export interface IdCardFranchiseSummary {
  franchiseId: string;
  franchiseName: string;
  totalRequested: number;
  totalIssued: number;
}

export interface CertificateFranchiseSummary {
  franchiseId: string;
  franchiseName: string;
  totalPending: number;
  totalIssued: number;
  totalRejected: number;
}

export async function getAdminIdCardSummaries(
  params: Record<string, unknown>,
): Promise<{
  data: IdCardFranchiseSummary[];
  meta: { total: number; totalPages: number };
}> {
  const response = await api.get("/admin/id-card/summary", {
    params: compactRequestParams(
      params as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  const result = unwrapData<unknown>(response);
  const normalized = normalizePaginatedResult<Record<string, unknown>>(result);
  const data = normalized.rows.map((row) => ({
    franchiseId: String(row.franchiseId ?? ""),
    franchiseName: String(row.franchiseName ?? ""),
    totalRequested: Number(row.totalRequested ?? 0),
    totalIssued: Number(row.totalIssued ?? 0),
  }));
  const lim = Number(normalized.limit ?? 20) || 20;
  const totalPages = Math.max(1, Math.ceil(normalized.total / lim));
  return { data, meta: { total: normalized.total, totalPages } };
}

export async function getAdminIdCardDetails(
  franchiseId: string,
  params: Record<string, unknown>,
): Promise<{
  data: RequestedIdDetail[];
  meta: { total: number; totalPages: number };
}> {
  const response = await api.get("/admin/id-card", {
    params: compactRequestParams({
      franchiseId,
      ...(params as Record<string, string | number | boolean | undefined | null>),
    }),
  });
  const result = unwrapData<unknown>(response);
  const { rows, total, page, limit } = normalizePaginatedResult<unknown>(result);
  const lim = Number(limit || 20) || 20;
  const data = (rows as Record<string, unknown>[]).map((row) =>
    mapRequestedIdDetail(row),
  );
  const totalPages = Math.max(1, Math.ceil(total / lim));
  return { data, meta: { total, totalPages } };
}

export async function getAdminCertificateSummaries(
  params: Record<string, unknown>,
): Promise<{
  data: CertificateFranchiseSummary[];
  meta: { total: number; totalPages: number };
}> {
  const response = await api.get("/admin/certification/summary", {
    params: compactRequestParams(
      params as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  const result = unwrapData<unknown>(response);
  const normalized = normalizePaginatedResult<Record<string, unknown>>(result);
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

export async function getPaginatedCertificates(
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

export interface FranchiseeCertificate {
  id: number;
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

export function getCertificatePdfUrl(certificatePdfPath: string): string {
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

export interface BulkCertificateRequestItem {
  studentId: number;
  marksObtained: number;
}

export interface BulkCertificateRequestDto {
  courseInstructorId: number;
  students: BulkCertificateRequestItem[];
}

export async function bulkRequestCertificates(
  data: BulkCertificateRequestDto,
): Promise<unknown[]> {
  const out: unknown[] = [];
  const students = await getAllStudents();
  const byId = new Map((students.result ?? []).map((s) => [s.id, s]));
  for (const s of data.students) {
    const st = byId.get(s.studentId);
    if (!st) continue;
    const res = await api.post("/certification/request", {
      studentId: s.studentId,
      programId: st.programId,
      levelId: st.levelId,
      marksObtained: s.marksObtained,
      courseInstructorId: data.courseInstructorId,
    });
    out.push(unwrapData(res));
  }
  return out;
}

export async function requestCertificateForStudent(body: {
  studentId: number;
  programId: number;
  levelId: number;
  marksObtained?: number;
  totalMarks?: number;
  courseInstructorId?: number;
}) {
  const response = await api.post("/certification/request", body);
  return unwrapData(response);
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
