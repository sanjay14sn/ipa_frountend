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


/** One franchise attachment of a multi-franchise CI (admin detail reads). */
export interface CIFranchiseAttachment {
  franchiseId: string;
  franchiseName: string | null;
  franchiseCode?: string | null;
  /** Whether this attachment is the handler (owner) franchise. */
  isHandler: boolean;
  status: string;
  attachedAt?: string;
  agreement?: { id: number; status?: string; phase?: string } | null;
}

export interface CourseInstructorData {
  id: number;
  /** The HANDLER (owner) franchise — attachments live in `franchises`. */
  franchise: {
    id: string;
    name: string;
    code?: string | null;
  };
  /** Raw handler-franchise FK — for grouping/lookups only, never display. */
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
  /**
   * Franchisee rows only: whether MY franchise is this CI's handler.
   * `false` = partner-franchise CI (visible + certificate-eligible, but not
   * orderable / session-assignable here). Absent on older payloads.
   */
  isHandler?: boolean;
  /** Admin detail only: all franchise attachments (handler included). */
  franchises?: CIFranchiseAttachment[];
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
    // Multi-franchise fields: defensively mapped so pre-multi-franchise
    // payloads (missing fields) yield undefined rather than throwing.
    isHandler: row.isHandler != null ? Boolean(row.isHandler) : undefined,
    franchises: Array.isArray(row.franchises)
      ? (row.franchises as Record<string, unknown>[]).map((f) => ({
          franchiseId: String(f.franchiseId ?? ""),
          franchiseName: f.franchiseName != null ? String(f.franchiseName) : null,
          franchiseCode: f.franchiseCode != null ? String(f.franchiseCode) : null,
          isHandler: Boolean(f.isHandler ?? false),
          status: String(f.status ?? ""),
          attachedAt: f.attachedAt != null ? String(f.attachedAt) : undefined,
          agreement:
            f.agreement && typeof f.agreement === "object"
              ? {
                  id: Number((f.agreement as Record<string, unknown>).id ?? 0),
                  status:
                    (f.agreement as Record<string, unknown>).status != null
                      ? String((f.agreement as Record<string, unknown>).status)
                      : undefined,
                  phase:
                    (f.agreement as Record<string, unknown>).phase != null
                      ? String((f.agreement as Record<string, unknown>).phase)
                      : undefined,
                }
              : null,
        }))
      : undefined,
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

// ── multi-franchise membership (admin) ───────────────────────────────────────

/** GET /admin/course-instructor/:id/franchises — all attachments, handler first. */
export async function listCIFranchises(
  courseInstructorId: number,
): Promise<CIFranchiseAttachment[]> {
  const response = await api.get(
    `/admin/course-instructor/${courseInstructorId}/franchises`,
  );
  const rows = unwrapData<CIFranchiseAttachment[]>(response) ?? [];
  return [...rows].sort(
    (a, b) => Number(b.isHandler ?? false) - Number(a.isHandler ?? false),
  );
}

/**
 * POST /admin/course-instructor/:id/franchises — attach; issues a
 * per-franchise agreement. `agreementStartDate` (today/past) back-fills a CI
 * who already worked there: back-signed on that date, active immediately.
 * Omitted → full sign flow (CI signs, franchisee countersigns).
 */
export async function attachCIFranchise(
  courseInstructorId: number,
  body: { franchiseId: string; tenure: number; agreementStartDate?: string },
): Promise<{ agreementId: number }> {
  const response = await api.post(
    `/admin/course-instructor/${courseInstructorId}/franchises`,
    body,
  );
  return unwrapData<{ agreementId: number }>(response);
}

/** DELETE /admin/course-instructor/:id/franchises/:franchiseId — detach a secondary franchise (voids its agreement). */
export async function detachCIFranchise(
  courseInstructorId: number,
  franchiseId: string,
): Promise<{ ok: true; voidedAgreementId: number | null }> {
  const response = await api.delete(
    `/admin/course-instructor/${courseInstructorId}/franchises/${franchiseId}`,
  );
  return unwrapData<{ ok: true; voidedAgreementId: number | null }>(response);
}

/** POST /admin/course-instructor/:id/transfer — move the handler role (old handler fully detached, agreement voided; unpaid training fees carry over). */
export async function transferCIHandler(
  courseInstructorId: number,
  body: { franchiseId: string; tenure?: number },
): Promise<{ newHandlerAgreementId: number; voidedAgreementId: number | null }> {
  const response = await api.post(
    `/admin/course-instructor/${courseInstructorId}/transfer`,
    body,
  );
  return unwrapData<{
    newHandlerAgreementId: number;
    voidedAgreementId: number | null;
  }>(response);
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

