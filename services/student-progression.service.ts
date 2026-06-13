import { api } from "@/lib/axios";
import { getPaginated, unwrapData } from "@/lib/unwrap-api";
import {
  PaginationMeta,
  StudentPaginationParams,
  StudentStatus,
  StudentStream,
  normalizeStudentStatus,
} from "@/services/student-list.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  status: StudentStatus;
  lastCertIssuedAt: string | null;
  eligibilityReason: "no_certificate" | "duration_exceeded";
  minCompletionDate: string;
}

export interface EligibleStudentsResponse {
  result: EligibleStudent[];
}

// ---------------------------------------------------------------------------
// Internal mappers
// ---------------------------------------------------------------------------

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
    isActive: (String(row.status ?? "active")) === "active",
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

// ---------------------------------------------------------------------------
// Student level progression types + functions
// ---------------------------------------------------------------------------

interface StudentLevelProgression {
  id: number;
  studentId: number;
  levelId: number;
  levelName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

interface UpdateProgressionDto {
  status?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

async function getStudentProgressions(
  studentId: number,
): Promise<StudentLevelProgression[]> {
  const response = await api.get(`/student/${studentId}/progressions`);
  const list = unwrapData<unknown[]>(response) ?? [];
  return list.map((r) => {
    const s = r as Record<string, unknown>;
    const level = s.level as Record<string, unknown> | null | undefined;
    return {
      id: Number(s.id ?? 0),
      studentId: Number(s.studentId ?? studentId),
      levelId: Number(s.levelId ?? level?.id ?? 0),
      levelName: String(level?.name ?? s.levelName ?? ""),
      status: String(s.status ?? ""),
      startDate: s.startDate ? String(s.startDate) : null,
      endDate: s.endDate ? String(s.endDate) : null,
      notes: s.notes ? String(s.notes) : null,
    };
  });
}

async function updateStudentProgression(
  studentId: number,
  progressionId: number,
  dto: UpdateProgressionDto,
): Promise<StudentLevelProgression> {
  const response = await api.patch(
    `/student/${studentId}/progressions/${progressionId}`,
    dto,
  );
  const s = unwrapData<Record<string, unknown>>(response);
  const level = s?.level as Record<string, unknown> | null | undefined;
  return {
    id: Number(s?.id ?? progressionId),
    studentId: Number(s?.studentId ?? studentId),
    levelId: Number(s?.levelId ?? level?.id ?? 0),
    levelName: String(level?.name ?? s?.levelName ?? ""),
    status: String(s?.status ?? ""),
    startDate: s?.startDate ? String(s.startDate) : null,
    endDate: s?.endDate ? String(s.endDate) : null,
    notes: s?.notes ? String(s.notes) : null,
  };
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

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
      // Eligible-student (certificate request) views display the level CODE.
      levelName: level?.code
        ? String(level.code)
        : level?.name
          ? String(level.name)
          : String(s.levelId ?? ""),
      durationInMonths: Number(level?.durationInMonths ?? 0),
      status: normalizeStudentStatus(s.status),
      lastCertIssuedAt: (s.lastCertIssuedAt as string | null) ?? null,
      eligibilityReason: (s.eligibilityReason as "no_certificate" | "duration_exceeded") ?? "no_certificate",
      minCompletionDate: s.minCompletionDate ? String(s.minCompletionDate).slice(0, 10) : "",
    };
  });
  return { result: mapped };
}

export async function getAdminStudentLifecycle(
  params: StudentPaginationParams,
): Promise<PaginatedStudentLifecycleResponse> {
  const { rows: raw, total, page, limit } = await getPaginated(
    "/admin/student/lifecycle",
    {
      page: params.page,
      limit: params.limit,
      search: params.search,
      status: params.status,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      franchiseId: params.franchiseId,
    },
  );
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

export async function getAdminStudentLifecycleById(
  studentId: number,
): Promise<StudentLifecycleRow> {
  const response = await api.get(`/admin/student/${studentId}/lifecycle`);
  const raw = unwrapData<Record<string, unknown>>(response);
  return mapLifecycleRow(raw);
}
