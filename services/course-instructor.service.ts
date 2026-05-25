import { api } from "@/lib/axios";
import {
  compactRequestParams,
  normalizePaginatedResult,
  unwrapData,
} from "@/lib/unwrap-api";
import { withProgramScope } from "./_scope";
import type { CITrainingPackageItem } from "./ci-training.service";

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

export enum CITrainingType {
  ELEMENTARY = "Elementary",
  REGULAR = "Regular",
  GRAND = "Grand",
}

export interface CourseInstructorData {
  id: number;
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
  validFrom?: Date;
  expiryDate?: Date;
  trainingProof?: string;
  status: string;
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

export interface ApproveCourseInstructorRequest {
  validFrom: string;
  validUntil: string;
  trainingPackages: ApproveCourseInstructorTrainingPackage[];
}

export interface ApproveCourseInstructorTrainingPackage {
  name: string;
  code: string;
  description?: string;
  packageOrder: number;
  fee: number;
  trainingLevelIds: number[];
}

export interface UpsertCourseInstructorTrainingPackagesRequest {
  trainingPackages: ApproveCourseInstructorTrainingPackage[];
}

export interface AdminCourseInstructorAgreementRecord {
  id: number;
  title: string;
  phase:
    | "PENDING_CI_SIGNATURE"
    | "PENDING_FRANCHISEE_SIGNATURE"
    | "SIGNED"
    | "EXPIRED";
  validFrom: string | null;
  validUntil: string | null;
  dateOfSigning: string | null;
  ciShare: number | null;
  levelDurations: { l1: number; l2: number };
  franchisee: {
    name: string;
    centreName: string;
    centreAddress: string;
    phone?: string | null;
    mail?: string | null;
  } | null;
  instructor: { name: string; address: string | null; phone: string | null } | null;
  trainingPackages?: CITrainingPackageItem[];
}

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

export interface RequestAdditionalTrainingRequest {
  trainingLevelId?: number;
  notes?: string;
  scope?: "half" | "all";
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
  return {
    id: Number(row.id),
    franchise: {
      id: 0,
      name: String(row.franchiseId ?? ""),
    },
    programId: Number(row.programId ?? 0),
    instructorId: String(row.instructorCode ?? row.id ?? ""),
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
    limit: params?.limit ?? 10_000,
    ...params,
  });
  const response = await api.get("/course-instructor", {
    params: compactRequestParams(
      merged as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  const result = unwrapData<unknown>(response);
  const { rows } = normalizePaginatedResult<unknown>(result);
  const list = rows.map((r) => mapRow(r as Record<string, unknown>));
  return { result: list };
}

export async function getCourseInstructorById(
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

export async function getAdminCourseInstructorTrainingPackages(
  courseInstructorId: number,
): Promise<CITrainingPackageItem[]> {
  const response = await api.get(
    `/admin/ci-training/instructors/${courseInstructorId}/packages`,
  );
  return unwrapData<CITrainingPackageItem[]>(response) ?? [];
}

export async function upsertAdminCourseInstructorTrainingPackages(
  courseInstructorId: number,
  body: UpsertCourseInstructorTrainingPackagesRequest,
): Promise<CITrainingPackageItem[]> {
  const response = await api.patch(
    `/admin/ci-training/instructors/${courseInstructorId}/packages`,
    body,
  );
  return unwrapData<CITrainingPackageItem[]>(response) ?? [];
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
  const merged: CourseInstructorListParams = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 10_000,
    ...params,
  };
  const response = await api.get("/admin/course-instructor", {
    params: compactRequestParams(
      merged as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  const result = unwrapData<unknown>(response);
  const { rows } = normalizePaginatedResult<unknown>(result);
  const list = rows.map((r) => mapRow(r as Record<string, unknown>));
  return { result: list };
}

/** Admin CI list with pagination metadata (ipa-new). */
export async function getPaginatedAdminCourseInstructors(
  params?: CourseInstructorListParams,
): Promise<PaginatedCourseInstructorsResponse> {
  const merged: CourseInstructorListParams = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    ...params,
  };
  const response = await api.get("/admin/course-instructor", {
    params: compactRequestParams(
      merged as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  const result = unwrapData<unknown>(response);
  const { rows: raw, total, page, limit } =
    normalizePaginatedResult<unknown>(result);
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
    if (ci.status !== "Training" && ci.status !== "Active") continue;
    const fname = ci.franchise.name || "Franchise";
    if (!grouped[fname]) grouped[fname] = [];
    const row: CITrainingData = {
      ...ci,
      instructorName: ci.name,
      dateOfTraining: ci.createdAt,
      isApproved: ci.status === "Active",
    };
    grouped[fname].push(row);
  }
  return grouped;
}

export async function getNextCompletableTrainingId(
  instructorId: number,
): Promise<number | null> {
  const response = await api.get(
    `/admin/course-instructor/${instructorId}/next-completable-training`,
  );
  return unwrapData<number | null>(response);
}

export async function completeTrainingForInstructor(
  instructorId: number,
  data?: { marksObtained?: number },
) {
  const tid = await getNextCompletableTrainingId(instructorId);
  if (tid == null) {
    throw new Error("No paid training step is ready to complete");
  }
  return completeTraining(tid, data);
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

export async function resendCourseInstructorCredentialsEmail(
  courseInstructorId: number,
): Promise<void> {
  await api.post(
    `/admin/course-instructor/${courseInstructorId}/resend-credentials-email`,
  );
}


export async function completeTraining(
  trainingId: number,
  data?: { marksObtained?: number },
) {
  const response = await api.patch(
    `/admin/course-instructor/training/${trainingId}/complete`,
    { marks: data?.marksObtained },
  );
  return unwrapData(response);
}

export async function approveTraining(
  courseInstructorId: number,
  data: ApproveTrainingRequest,
) {
  const response = await api.post(
    `/admin/course-instructor/approve-training/${courseInstructorId}`,
    data,
  );
  return unwrapData(response);
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
  if (rows.some((ci) => ci.status !== status)) {
    rows = rows.filter((ci) => ci.status === status);
  }
  const total = rows.length;
  return {
    data: rows,
    meta: { total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getPaginatedFranchiseeCourseInstructors(
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

export async function getCIGraduations(
  _instructorId: number,
): Promise<CILevelGraduation[]> {
  return [];
}

export async function getAllCIGraduations(): Promise<CIGraduationsByFranchise> {
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
    trainingLevelName: t.trainingLevel?.name ?? `Level ${t.trainingLevelId}`,
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
    trainingLevelName: t.trainingLevel?.name ?? `Level ${t.trainingLevelId}`,
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

export interface CITrainingPackage {
  id: number;
  programId: number;
  name: string;
  code?: string;
  description?: string;
  packageOrder: number;
  fee: number;
  currency?: string;
  isActive?: boolean;
  trainingLevelIds: number[];
  purchaseStatus: 'PAID' | 'PENDING' | 'UNPAID';
  isPurchased: boolean;
}

function mapPackages(raw: any[]): CITrainingPackage[] {
  return raw.map((p: any) => ({
    id: p.id,
    programId: p.programId,
    name: p.name,
    code: p.code,
    description: p.description,
    packageOrder: p.packageOrder ?? 0,
    fee: Number(p.fee ?? 0),
    currency: p.currency,
    isActive: p.isActive,
    trainingLevelIds: Array.isArray(p.trainingLevelIds) ? p.trainingLevelIds : [],
    purchaseStatus: p.purchaseStatus ?? 'UNPAID',
    isPurchased: p.isPurchased ?? false,
  }));
}

export async function getCITrainingPackages(
  instructorId: number,
): Promise<CITrainingPackage[]> {
  const response = await api.get(`/course-instructor/${instructorId}/training-packages`);
  return mapPackages(unwrapData<any[]>(response) ?? []);
}

export async function getAdminCITrainingPackages(
  instructorId: number,
): Promise<CITrainingPackage[]> {
  const response = await api.get(`/admin/ci-training/instructors/${instructorId}/packages`);
  return mapPackages(unwrapData<any[]>(response) ?? []);
}

/** Legacy UI: synchronous count from instructor row (ipa-new has no embedded levels). */
export function getInstructorTrainingLevelCount(
  _instructor: CourseInstructorData,
): number {
  return 0;
}

export function getInstructorTrainingLevels(
  _instructor: CourseInstructorData,
): Array<{
  id: number;
  name?: string;
  rank?: number;
  displayOrder?: number;
}> {
  return [];
}

export async function getAvailableTrainingLevelsForCI(
  _instructorId: number,
): Promise<AvailableNextTrainingLevelCounts> {
  void _instructorId;
  return {
    totalNextLevels: 0,
    halfOfAvailableCount: 0,
    allAvailableCount: 0,
  };
}

export async function requestAdditionalTraining(
  instructorId: number,
  requestData: RequestAdditionalTrainingRequest,
): Promise<void> {
  const response = await api.post(
    `/franchisee/course-instructor/${instructorId}/request-training`,
    requestData,
  );
  return unwrapData(response);
}


export async function scheduleTrainingAdmin(ciId: number) {
  const response = await api.post(
    `/admin/course-instructor/${ciId}/schedule-training`,
  );
  return unwrapData(response);
}

export async function getActiveTrainingLevelForCi(ciId: number) {
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

export interface ApproveTrainingRequest {
  trainingLevelId?: number;
  marksObtained?: number;
  dateOfTraining?: string;
  amount?: number;
  installmentCount?: number;
  installmentAmount?: number;
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
  const response = await api.get("/admin/course-instructor/summary", {
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

export interface SetupExistingCITrainingPackage {
  name: string;
  code: string;
  description?: string;
  packageOrder: number;
  fee: number;
  trainingLevelIds: number[];
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
  validity: { validFrom: string; validUntil: string };
  agreementSignedAt: string;
  completedThrough: number | null;
  trainingPackages: SetupExistingCITrainingPackage[];
}

export interface SetupExistingCIResponse {
  courseInstructorId: number;
  instructorCode: string;
  agreementId: number;
  assignedPackageIds: number[];
}

/**
 * Admin one-shot: create an existing CI with back-signed agreement,
 * issued credentials, and training packages whose completion + paid
 * state is pre-populated per the matrix in the wizard.
 */
export async function setupExistingCourseInstructor(
  payload: SetupExistingCIPayload,
): Promise<SetupExistingCIResponse> {
  const response = await api.post("/admin/ci-setup/existing", payload);
  return unwrapData<SetupExistingCIResponse>(response);
}
