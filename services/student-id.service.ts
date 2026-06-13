import { api } from "@/lib/axios";
import {
  compactRequestParams,
  getPaginated,
  normalizePaginatedResult,
  unwrapData,
} from "@/lib/unwrap-api";
import {
  mapStudentRow,
  PaginationMeta,
  StudentData,
  StudentPaginationParams,
  Response,
} from "@/services/student-list.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface GroupedIdDetailsData {
  [franchiseName: string]: RequestedIdDetail[];
}

interface PaginatedIdDetailsResponse {
  data: GroupedIdDetailsData;
  meta: PaginationMeta;
}

export interface IdCardFranchiseSummary {
  franchiseId: string;
  franchiseName: string;
  totalRequested: number;
  totalIssued: number;
}

// ---------------------------------------------------------------------------
// Internal mappers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

export async function issueIdCard(studentId: number): Promise<unknown> {
  const response = await api.patch(`/admin/id-card/${studentId}/issue`);
  return unwrapData(response);
}

async function issueStudentId(_studentId: number): Promise<StudentData> {
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

export async function getAllRequestedIdDetails(): Promise<RequestedIdDetailsByFranchise> {
  return (await getPaginatedRequestedIdDetails({ page: 1, limit: 5000 })).data;
}

export async function getIssuedIdDetails(): Promise<RequestedIdDetailsByFranchise> {
  return (await getPaginatedIssuedIds({ page: 1, limit: 5000 })).data;
}

async function getPaginatedRequestedIdDetails(
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

async function getPaginatedIssuedIds(
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

export async function getAdminIdCardSummaries(
  params: Record<string, unknown>,
): Promise<{
  data: IdCardFranchiseSummary[];
  meta: { total: number; totalPages: number };
}> {
  const normalized = await getPaginated<Record<string, unknown>>(
    "/admin/id-card/summary",
    params,
  );
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

export async function bulkDispatchIdCards(dto: {
  studentIds: number[];
  orderId?: number;
}): Promise<{ succeeded: number[]; failed: number[] }> {
  const response = await api.post("/admin/id-card/bulk-dispatch", dto);
  return unwrapData(response);
}
