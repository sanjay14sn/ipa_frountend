import { api } from "@/lib/axios";
import {
  compactRequestParams,
  getPaginated,
  normalizePaginatedResult,
  unwrapData,
} from "@/lib/unwrap-api";
import { withProgramScope } from "./_scope";
import type { CIAgreementRecord } from "./contracting.service";

export interface Response {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
}

export enum BloodGroup {
  A_POSITIVE = "A+",
  A_NEGATIVE = "A-",
  B_POSITIVE = "B+",
  B_NEGATIVE = "B-",
  AB_POSITIVE = "AB+",
  AB_NEGATIVE = "AB-",
  O_POSITIVE = "O+",
  O_NEGATIVE = "O-",
}


export interface CourseInstructorData {
  id: number;
  franchise: {
    id: string;
    name: string;
    code?: string | null;
  };
  /** Raw franchise FK — for grouping/lookups only, never display. */
  franchiseId: string;
  programId: number;
  instructorId: string;
  name: string;
  dob: Date;
  bloodGroup: BloodGroup;
  address: string;
  city: string;
  phone: string;
  mail: string;
  education: string;
  occupation: string;
  reference: string;
  validFrom?: Date;
  expiryDate?: Date;
  trainingProof?: string;
  /** Application/onboarding review status (Pending/Approved/Rejected/Payment/Training). */
  status: string;
  /** Derived operational standing from the latest CI agreement. */
  operationalStatus?: "valid" | "expired" | "void";
  materialsOrdered?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy: number;
  additionalDetails?: string;
}

/** ipa-new list responses omit legacy envelope fields */
export interface CourseInstructorsResponse {
  result: CourseInstructorData[];
}

export interface CreateCourseInstructorRequest {
  franchise: {
    id: number;
    name: string;
  };
  programId: number;
  instructorId: string;
  name: string;
  dob: Date;
  bloodGroup: BloodGroup;
  address: string;
  city: string;
  phone: string;
  mail: string;
  education: string;
  occupation: string;
  reference: string;
  trainingProof?: string;
  trainingLevelId?: number;
  additionalDetails?: string;
}

/** One row of the training-fee plan sent with a single-call CI approval. */
export interface ApproveCITrainingPlanRow {
  order?: number;
  label?: string;
  levelFrom: number;
  levelTo: number;
  fee: number;
}

/**
 * PATCH /admin/course-instructor/:id/approve — single-call approval: the
 * training-fee plan rides the approval and is snapshotted into the CI
 * agreement's terms at issuance (no follow-up plan-create call).
 */
export interface ApproveCourseInstructorRequest {
  tenure: number;
  trainingPlan?: ApproveCITrainingPlanRow[];
}

/** Same detail view the CI portal receives (server-computed `phase` included). */
export type AdminCourseInstructorAgreementRecord = CIAgreementRecord;

/** Admin UI: grouped instructors for training monitor */
export interface CompleteTrainingRequest {
  marksObtained?: number;
  certificateNumber?: string;
  notes?: string;
}

export interface CITrainingData extends CourseInstructorData {
  isApproved?: boolean;
  instructorName?: string;
  dateOfTraining?: string;
  /** Legacy admin UI fields — optional when API omits curriculum detail */
  trainingLevelName?: string;
  displayOrder?: number;
  amount?: number;
  installmentCount?: number;
  installmentAmount?: number;
  isActive?: boolean;
}

export type CITrainingByFranchise = Record<string, CITrainingData[]>;

export interface CIGraduationRow {
  id?: number;
  instructorName: string;
  instructorCode: string;
  levelName: string;
  graduatedAt?: string;
  graduationDate?: string;
  certificateNumber?: string;
  notes?: string;
  marksObtained?: number;
}

export type CIGraduationsByFranchise = Record<string, CIGraduationRow[]>;

export interface CITrainingProgressLevel {
  id?: number;
  trainingLevelId: number;
  trainingLevelName?: string;
  isCompleted?: boolean;
  isActive?: boolean;
  rank?: number;
  displayOrder?: number;
  paid?: boolean;
  amount?: number;
  marks?: number;
}

export interface CILevelGraduation {
  id: number;
  levelName?: string;
  graduatedAt?: string;
  graduationDate?: string;
  certificateNumber?: string;
  marksObtained?: number;
  notes?: string;
  trainingLevel?: {
    name: string;
    amount?: number;
    description?: string;
  };
}

export interface AvailableNextTrainingLevelCounts {
  totalNextLevels: number;
  halfOfAvailableCount: number;
  allAvailableCount: number;
}

export interface CITrainingProgress {
  completedLevels?: number;
  totalLevels?: number;
  currentLevelName?: string;
  trainings?: CITrainingProgressLevel[];
  /** Franchisee progress UI */
  totalTrainings?: number;
  completedTrainings?: number;
  progress?: number;
  activeTraining?: {
    trainingLevelName?: string;
    name?: string;
    trainingLevelId?: number;
  };
}

export type AdminCourseInstructorData = CourseInstructorData;

export type AdminCourseInstructorsByStatus = Record<string, CourseInstructorData[]>;

export interface TrainingCourseInstructorData extends CourseInstructorData {
  instructorName?: string;
  trainingLevelName?: string;
  amount?: number;
  paidAmount?: number;
}

export interface CourseInstructorPaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  /** Franchisee list: scope to the active agreement's program. Resolved server-side. */
  agreementId?: number;
}

export interface PaginatedCourseInstructorsResponse {
  data: CourseInstructorData[];
  meta: {
    total: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

function mapRow(row: Record<string, unknown>): CourseInstructorData {
  const dobRaw = row.dob as string | Date | undefined;
  const validFromRaw = row.validFrom as string | Date | undefined;
  const expiryRaw = row.expiryDate as string | Date | undefined;
  const franchiseRaw = row.franchise as
    | { id?: unknown; name?: unknown; code?: unknown }
    | null
    | undefined;
  return {
    id: Number(row.id),
    franchise: {
      id: String(franchiseRaw?.id ?? row.franchiseId ?? ""),
      name: String(franchiseRaw?.name ?? ""),
      code: franchiseRaw?.code != null ? String(franchiseRaw.code) : null,
    },
    franchiseId: String(row.franchiseId ?? ""),
    programId: Number(row.programId ?? 0),
    instructorId: String(row.instructorCode ?? ""),
    name: String(row.name ?? ""),
    dob: dobRaw ? new Date(dobRaw) : new Date(),
    bloodGroup: String(row.bloodGroup ?? BloodGroup.O_POSITIVE) as BloodGroup,
    address: String(row.address ?? ""),
    city: String(row.city ?? ""),
    phone: String(row.phone ?? ""),
    mail: String(row.email ?? ""),
    education: String(row.education ?? ""),
    occupation: String(row.occupation ?? ""),
    reference: String(row.reference ?? ""),
    validFrom: validFromRaw ? new Date(validFromRaw) : undefined,
    expiryDate: expiryRaw ? new Date(expiryRaw) : undefined,
    status: String(row.status ?? ""),
    operationalStatus: row.operationalStatus as
      | "valid"
      | "expired"
      | "void"
      | undefined,
    materialsOrdered: Boolean(row.materialsOrdered ?? false),
    createdAt: String(row.createdAt ?? ""),
    updatedAt: String(row.updatedAt ?? ""),
    createdBy: Number(row.createdBy ?? 0),
    updatedBy: Number(row.updatedBy ?? 0),
  };
}

export interface CourseInstructorListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  status?: string;
  franchiseId?: string;
  /** Active program scope. Auto-injected from the scope store via withProgramScope. */
  programId?: number;
  /** Legacy: agreement-driven scope. Backend resolves to programId. */
  agreementId?: number;
}

export async function getAllCourseInstructors(
  params?: CourseInstructorListParams,
): Promise<CourseInstructorsResponse> {
  const merged: CourseInstructorListParams = withProgramScope({
    page: params?.page ?? 1,
    limit: params?.limit ?? 100,
    ...params,
  });
  const { rows } = await getPaginated("/course-instructor", merged);
  const list = rows.map((r) => mapRow(r as Record<string, unknown>));
  return { result: list };
}

async function getCourseInstructorById(
  courseInstructorId: number,
): Promise<CourseInstructorData> {
  const all = await getAllCourseInstructors();
  const found = all.result?.find((c) => c.id === courseInstructorId);
  if (!found) throw new Error("Course instructor not found");
  return found;
}

export async function getAdminCourseInstructorAgreement(
  courseInstructorId: number,
): Promise<AdminCourseInstructorAgreementRecord | null> {
  const response = await api.get(
    `/admin/course-instructor/${courseInstructorId}/agreement`,
  );
  return unwrapData<AdminCourseInstructorAgreementRecord | null>(response);
}


export async function createCourseInstructor(
  data: CreateCourseInstructorRequest | {
    name: string;
    dob: string;
    programId: number;
    phone?: string;
    email?: string;
    mail?: string;
    address?: string;
    city?: string;
  },
): Promise<CourseInstructorData> {
  const d = data as CreateCourseInstructorRequest;
  const dobRaw = d.dob instanceof Date ? d.dob : new Date(d.dob as string);
  const dob = dobRaw.toISOString().slice(0, 10);
  const response = await api.post("/course-instructor", {
    name: d.name,
    dob,
    programId: d.programId,
    phone: d.phone,
    email: d.mail ?? (d as { email?: string }).email,
    address: d.address,
    city: d.city,
    bloodGroup: d.bloodGroup,
    education: d.education,
    occupation: d.occupation,
    reference: d.reference,
  });
  const row = unwrapData<Record<string, unknown>>(response);
  return mapRow(row);
}

export async function updateCourseInstructor(
  _courseInstructorId: number,
  _data: Partial<CourseInstructorData>,
): Promise<CourseInstructorData> {
  throw new Error("Not supported in ipa-new");
}

export async function deleteCourseInstructor(_id: number): Promise<void> {
  throw new Error("Not supported in ipa-new");
}


export async function getAllAdminCourseInstructors(
  params?: CourseInstructorListParams,
): Promise<CourseInstructorsResponse> {
  // agreementId is a franchisee-list-only filter; the admin route rejects it
  const { agreementId: _agreementId, ...rest } = params ?? {};
  const merged: CourseInstructorListParams = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 100,
    ...rest,
  };
  const { rows } = await getPaginated("/admin/course-instructor", merged);
  const list = rows.map((r) => mapRow(r as Record<string, unknown>));
  return { result: list };
}

/** Admin CI list with pagination metadata (ipa-new). */
export async function getPaginatedAdminCourseInstructors(
  params?: CourseInstructorListParams,
): Promise<PaginatedCourseInstructorsResponse> {
  // agreementId is a franchisee-list-only filter; the admin route rejects it
  const { agreementId: _agreementId, ...rest } = params ?? {};
  const merged: CourseInstructorListParams = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    ...rest,
  };
  const { rows: raw, total, page, limit } = await getPaginated(
    "/admin/course-instructor",
    merged,
  );
  const data = raw.map((r) => mapRow(r as Record<string, unknown>));
  const lim = limit || 20;
  const pageNum = page || 1;
  const totalPages = Math.ceil(total / lim) || 1;
  return {
    data,
    meta: {
      total,
      page: pageNum,
      limit: lim,
      totalPages,
    },
  };
}

function groupAdminByStatus(list: CourseInstructorData[]): AdminCourseInstructorsByStatus {
  const g: AdminCourseInstructorsByStatus = {
    Pending: [],
    Approved: [],
    Rejected: [],
    Payment: [],
    Training: [],
    Active: [],
    Inactive: [],
  };
  for (const ci of list) {
    const k = ci.status as keyof typeof g;
    if (g[k]) g[k].push(ci);
    else g.Pending.push(ci);
  }
  return g;
}

export async function getAllAdminCourseInstructorsByStatus(): Promise<AdminCourseInstructorsByStatus> {
  const { result } = await getAllAdminCourseInstructors();
  return groupAdminByStatus(result ?? []);
}

export async function getAllCITraining(): Promise<CITrainingByFranchise> {
  const { result } = await getAllAdminCourseInstructors();
  const list = result ?? [];
  const grouped: CITrainingByFranchise = {};
  for (const ci of list) {
    if (ci.status !== "Training" && ci.operationalStatus !== "valid") continue;
    const fname = ci.franchise.name || "Franchise";
    if (!grouped[fname]) grouped[fname] = [];
    const row: CITrainingData = {
      ...ci,
      instructorName: ci.name,
      dateOfTraining: ci.createdAt,
      isApproved: ci.operationalStatus === "valid",
    };
    grouped[fname].push(row);
  }
  return grouped;
}

export async function approveCourseInstructor(
  courseInstructorId: number,
  body: ApproveCourseInstructorRequest,
) {
  const response = await api.patch(
    `/admin/course-instructor/${courseInstructorId}/approve`,
    body,
  );
  return unwrapData(response);
}

export async function rejectCourseInstructor(courseInstructorId: number) {
  const response = await api.patch(
    `/admin/course-instructor/${courseInstructorId}/reject`,
  );
  return unwrapData(response);
}

async function resendCourseInstructorCredentialsEmail(
  courseInstructorId: number,
): Promise<void> {
  await api.post(
    `/admin/course-instructor/${courseInstructorId}/resend-credentials-email`,
  );
}


export async function getTrainingCourseInstructors(): Promise<{
  result: TrainingCourseInstructorData[];
}> {
  const res = await getAllAdminCourseInstructors();
  const mapped = (res.result ?? []).map((ci) => ({
    ...ci,
    instructorName: ci.name,
  }));
  return { result: mapped };
}

export async function getPaginatedCourseInstructors(
  status: string,
  params: Record<string, unknown>,
): Promise<{
  data: CourseInstructorData[];
  meta: { total: number; totalPages: number };
}> {
  const page = Number(params.page ?? 1) || 1;
  const limit = Number(params.limit ?? 10) || 10;
  const sortBy = typeof params.sortBy === "string" ? params.sortBy : undefined;
  const sortOrder =
    params.sortOrder === "ASC" || params.sortOrder === "DESC"
      ? params.sortOrder
      : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;

  const paginated = await getPaginatedAdminCourseInstructors({
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    status,
  });

  let rows = paginated.data;
  // "valid" is the derived operational filter (active CIs). The backend filters
  // and paginates it server-side, so trust its rows + meta rather than the
  // review-status client filter below (rows carry a review status, not "valid").
  if (status === "valid") {
    return {
      data: rows,
      meta: {
        total: paginated.meta.total ?? rows.length,
        totalPages: paginated.meta.totalPages ?? 1,
      },
    };
  }
  if (rows.some((ci) => ci.status !== status)) {
    rows = rows.filter((ci) => ci.status === status);
  }
  const total = rows.length;
  return {
    data: rows,
    meta: { total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

async function getPaginatedFranchiseeCourseInstructors(
  params: CourseInstructorPaginationParams,
): Promise<PaginatedCourseInstructorsResponse> {
  const all = await getAllCourseInstructors({ agreementId: params.agreementId });
  let rows = all.result ?? [];
  if (params.search) {
    const q = params.search.toLowerCase();
    rows = rows.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.instructorId.toLowerCase().includes(q),
    );
  }
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const start = (page - 1) * limit;
  return {
    data: rows.slice(start, start + limit),
    meta: { total: rows.length, page, limit },
  };
}

async function getCIGraduations(
  _instructorId: number,
): Promise<CILevelGraduation[]> {
  return [];
}

async function getAllCIGraduations(): Promise<CIGraduationsByFranchise> {
  return {};
}

export async function getCITrainingProgress(
  instructorId: number,
): Promise<CITrainingProgress | null> {
  const response = await api.get(`/course-instructor/${instructorId}/training-progress`);
  const raw = unwrapData<any>(response);

  const trainings: CITrainingProgressLevel[] = (raw.trainings ?? []).map((t: any) => ({
    id: t.id,
    trainingLevelId: t.trainingLevelId,
    trainingLevelName:
      t.trainingLevel?.name ??
      (t.displayOrder != null ? `Level ${t.displayOrder}` : "Training level"),
    displayOrder: t.displayOrder,
    paid: t.paid,
    isCompleted: t.isCompleted,
    isActive: t.isActive,
    marks: t.marks ?? undefined,
    amount: t.trainingLevel?.fee ?? 0,
  }));

  const totalTrainings = trainings.length;
  const completedTrainings = trainings.filter((t) => t.isCompleted).length;
  const progress = totalTrainings > 0 ? (completedTrainings / totalTrainings) * 100 : 0;
  const activeLevel = trainings.find((t) => t.isActive && !t.isCompleted);

  return {
    trainings,
    totalTrainings,
    completedTrainings,
    progress,
    totalLevels: totalTrainings,
    completedLevels: completedTrainings,
    activeTraining: activeLevel
      ? {
          trainingLevelId: activeLevel.trainingLevelId,
          trainingLevelName: activeLevel.trainingLevelName,
          name: activeLevel.trainingLevelName,
        }
      : undefined,
  };
}

export async function getAdminCITrainingProgress(
  instructorId: number,
): Promise<CITrainingProgress | null> {
  const response = await api.get(`/admin/ci-training/instructors/${instructorId}/progress`);
  const raw = unwrapData<any>(response);

  const trainings: CITrainingProgressLevel[] = (raw.trainings ?? []).map((t: any) => ({
    id: t.id,
    trainingLevelId: t.trainingLevelId,
    trainingLevelName:
      t.trainingLevel?.name ??
      (t.displayOrder != null ? `Level ${t.displayOrder}` : "Training level"),
    displayOrder: t.displayOrder,
    paid: t.paid,
    isCompleted: t.isCompleted,
    isActive: t.isActive,
    marks: t.marks ?? undefined,
    amount: t.trainingLevel?.fee ?? 0,
  }));

  const totalTrainings = trainings.length;
  const completedTrainings = trainings.filter((t) => t.isCompleted).length;
  const progress = totalTrainings > 0 ? (completedTrainings / totalTrainings) * 100 : 0;
  const activeLevel = trainings.find((t) => t.isActive && !t.isCompleted);

  return {
    trainings,
    totalTrainings,
    completedTrainings,
    progress,
    totalLevels: totalTrainings,
    completedLevels: completedTrainings,
    activeTraining: activeLevel
      ? {
          trainingLevelId: activeLevel.trainingLevelId,
          trainingLevelName: activeLevel.trainingLevelName,
          name: activeLevel.trainingLevelName,
        }
      : undefined,
  };
}


/** Legacy UI: synchronous count from instructor row (ipa-new has no embedded levels). */
function getInstructorTrainingLevelCount(
  _instructor: CourseInstructorData,
): number {
  return 0;
}

function getInstructorTrainingLevels(
  _instructor: CourseInstructorData,
): Array<{
  id: number;
  name?: string;
  rank?: number;
  displayOrder?: number;
}> {
  return [];
}

async function getAvailableTrainingLevelsForCI(
  _instructorId: number,
): Promise<AvailableNextTrainingLevelCounts> {
  void _instructorId;
  return {
    totalNextLevels: 0,
    halfOfAvailableCount: 0,
    allAvailableCount: 0,
  };
}

async function getActiveTrainingLevelForCi(ciId: number) {
  const response = await api.get(
    `/course-instructor/${ciId}/active-training-level`,
  );
  return unwrapData(response);
}

export async function getEligibleCourseInstructorsForCertificate(
  levelIds: number[],
  programId?: number,
): Promise<CourseInstructorData[]> {
  const unique = [...new Set(levelIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (!unique.length) return [];
  const params = new URLSearchParams();
  if (programId && Number.isInteger(programId) && programId > 0) {
    params.set("programId", String(programId));
  }
  if (unique.length === 1) {
    params.set("levelId", String(unique[0]));
  } else {
    unique.forEach((id) => params.append("levelIds", String(id)));
  }
  const response = await api.get('/course-instructor/eligible-for-certificate', {
    params,
  });
  const result = unwrapData<unknown>(response);
  const rows = Array.isArray(result)
    ? result
    : normalizePaginatedResult<unknown>(result).rows;
  return rows.map((row) => mapRow(row as Record<string, unknown>));
}

export interface CIFranchiseSummary {
  franchiseId: string;
  franchiseName: string;
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
}

// GET /admin/course-instructor/summary
export async function getAdminCISummaries(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{
  data: CIFranchiseSummary[];
  meta: { total: number; totalPages: number; page: number; limit: number };
}> {
  const normalized = await getPaginated<Record<string, unknown>>(
    "/admin/course-instructor/summary",
    params,
  );
  const data = normalized.rows.map((row) => ({
    franchiseId: String(row.franchiseId ?? ""),
    franchiseName: String(row.franchiseName ?? ""),
    totalPending: Number(row.totalPending ?? 0),
    totalApproved: Number(row.totalApproved ?? 0),
    totalRejected: Number(row.totalRejected ?? 0),
  }));
  const lim = Number(normalized.limit ?? 10) || 10;
  const totalPages = Math.max(1, Math.ceil(normalized.total / lim));
  return {
    data,
    meta: { total: normalized.total, totalPages, page: normalized.page, limit: lim },
  };
}

// GET /admin/course-instructor?franchiseId=...&status=...
export async function getAdminCIDetails(
  franchiseId: string,
  params: {
    status?: "Pending" | "Approved" | "Rejected" | "all";
    page?: number;
    limit?: number;
    search?: string;
  },
): Promise<PaginatedCourseInstructorsResponse> {
  const response = await api.get("/admin/course-instructor", {
    params: compactRequestParams({
      franchiseId,
      ...(params as Record<string, string | number | boolean | undefined | null>),
    }),
  });
  const result = unwrapData<unknown>(response);
  const { rows: raw, total, page, limit } =
    normalizePaginatedResult<unknown>(result);
  const data = raw.map((r) => mapRow(r as Record<string, unknown>));
  const lim = Number(limit ?? 10) || 10;
  const pageNum = Number(page ?? 1) || 1;
  const totalPages = Math.max(1, Math.ceil(total / lim));
  return {
    data,
    meta: { total, page: pageNum, limit: lim, totalPages },
  };
}

// ---------------------------------------------------------------------------
// Setup Existing Course Instructor (admin back-fill wizard)
// ---------------------------------------------------------------------------

export interface SetupExistingCIReceivable {
  levelFrom: number;
  levelTo: number;
  fee: number;
  label?: string;
  paid: boolean;
}

export interface SetupExistingCIPayload {
  franchiseId: string;
  programId: number;
  ci: {
    name: string;
    dob: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state?: string;
    bloodGroup: string;
    education: string;
    occupation: string;
    reference: string;
  };
  tenure: number;
  agreementSignedAt: string;
  completedThrough: number | null;
  receivables?: SetupExistingCIReceivable[];
}

export interface SetupExistingCIResponse {
  courseInstructorId: number;
  instructorCode: string;
  agreementId: number;
  assignedReceivableIds?: number[];
}
export async function setupExistingCourseInstructor(
  payload: SetupExistingCIPayload,
): Promise<SetupExistingCIResponse> {
  const response = await api.post("/admin/ci-setup/existing", payload);
  return unwrapData<SetupExistingCIResponse>(response);
}

