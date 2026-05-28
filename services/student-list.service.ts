import { api } from "@/lib/axios";
import {
  compactRequestParams,
  normalizePaginatedResult,
  unwrapData,
} from "@/lib/unwrap-api";
import { withProgramScope } from "@/services/_scope";

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

export type StudentStatus = "active" | "inactive" | "completed";

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
  status: StudentStatus;
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
  /** Obtained marks. The level's intrinsic `totalMarks` is the cap and lives
   *  on the Level — no longer captured per progression. */
  marks: number;
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

export interface StudentPaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  /** Admin list: scope to franchise (ipa-new). */
  franchiseId?: string;
  levelId?: number;
  idStatus?: string;  // "Not Issued" | "Requested" | "Issued"
  /** Active program scope. Auto-injected from the scope store via withProgramScope. */
  programId?: number;
  /** Legacy: agreement-driven scope. Backend resolves to programId. */
  agreementId?: number;
}

// ---------------------------------------------------------------------------
// Internal normalisers
// ---------------------------------------------------------------------------

export function normalizeStudentStatus(value: unknown): StudentStatus {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "inactive") return "inactive";
  if (raw === "completed") return "completed";
  return "active";
}

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

export function mapStudentRow(row: Record<string, unknown>): StudentData {
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
    status: normalizeStudentStatus(row.status),
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

function mapStudentDataToUpdateBody(data: Partial<StudentData>): Record<string, unknown> {
  const drop = new Set(["id", "franchiseId", "rollNo", "createdAt", "updatedAt", "createdBy", "updatedBy", "materialsOrdered"]);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (drop.has(key) || value === undefined) continue;
    if (key === "level" && typeof value === "object" && value !== null) continue; // drop nested level object
    if (key === "stream") continue; // always drop; backend derives stream from levelId
    if (key === "mail") {
      out["email"] = value; // alias mail → email
      continue;
    }
    if ((key === "dateOfBirth" || key === "dateOfJoining") && value != null) {
      // format as YYYY-MM-DD
      const d = value instanceof Date ? value : new Date(String(value));
      out[key] = isNaN(d.getTime()) ? String(value).slice(0, 10) : d.toISOString().slice(0, 10);
      continue;
    }
    out[key] = value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

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
  studentId: number,
  studentData: Partial<StudentData>,
): Promise<StudentData> {
  const body = mapStudentDataToUpdateBody(studentData);
  const response = await api.patch(`/student/${studentId}`, body);
  return mapStudentRow(unwrapData<Record<string, unknown>>(response));
}

export async function deleteStudent(_studentId: number): Promise<void> {
  throw new Error("Student delete not available in ipa-new");
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

export async function updateStudentAdmin(
  studentId: number,
  studentData: Partial<StudentData>,
): Promise<StudentData> {
  const body = mapStudentDataToUpdateBody(studentData);
  const response = await api.patch(`/admin/student/${studentId}`, body);
  return mapStudentRow(unwrapData<Record<string, unknown>>(response));
}
