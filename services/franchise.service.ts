import { api } from "@/lib/axios";
import { unwrapData, normalizePaginatedResult } from "@/lib/unwrap-api";
import type { PaymentOrderResponse } from "./franchisee.service";
import { requestPrograms, approveProgramRequestAdmin, rejectProgramRequestAdmin } from "./program-request.service";
import type { ApproveProgramRequestPayload } from "./program-request.service";

/** Apply for a new franchise (franchisee JWT). */
export interface ApplyForFranchisePayload {
  name: string;
  type: string;
  city: string;
  state: string;
  address?: string;
  pincode?: string;
  /** Single program id when the API expects one */
  programId?: number;
  /** Multi-select UI — submit with {@link programId} set to the first id if needed */
  programIds?: number[];
}

export type RequestFranchiseDto = ApplyForFranchisePayload;

export interface FranchiseListItem {
  id: string;
  name: string;
  type: string;
  status: string;
  city?: string;
  state?: string;
}

export async function getFranchiseList(): Promise<FranchiseListItem[]> {
  const response = await api.get("/franchise");
  const data = unwrapData<unknown>(response);
  const { rows } = normalizePaginatedResult<Record<string, unknown>>(data);
  return rows.map((r) => ({
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    type: String(r.type ?? ""),
    status: String(r.status ?? ""),
    city: r.city as string | undefined,
    state: r.state as string | undefined,
  }));
}

export async function hasPendingRequest(): Promise<boolean> {
  const list = await getFranchiseList();
  return list.some((f) => f.status === "Pending");
}

export async function requestNewFranchise(body: ApplyForFranchisePayload) {
  const response = await api.post("/franchise/apply", body);
  return unwrapData(response);
}

/** Legacy program-request flow — not in ipa-new. */
export interface ProgramRequestRow {
  id: number;
  franchiseId: string;
  programId: number;
  status: string;
  program?: { id: number; name: string };
  franchise?: { id: string; code?: string | null; name: string; city?: string; state?: string };
  franchisee?: { id: number; name: string; mail?: string; phone?: string };
  requestedBy?: string;
  createdAt?: string;
}

export type { ProgramRequestPayroll, ApproveProgramRequestPayload } from "./program-request.service";

async function getProgramRequests(_params?: {
  status?: string;
}): Promise<ProgramRequestRow[]> {
  return [];
}

async function getPaginatedProgramRequests(_params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}): Promise<{
  data: ProgramRequestRow[];
  meta: { total: number; totalPages: number };
}> {
  return { data: [], meta: { total: 0, totalPages: 0 } };
}

async function approveProgramRequest(
  id: number,
  payload: ApproveProgramRequestPayload,
) {
  return approveProgramRequestAdmin(id, payload);
}

async function rejectProgramRequest(id: number) {
  return rejectProgramRequestAdmin(id, '');
}

export async function bulkUploadFranchises(_file: File) {
  throw new Error("Bulk upload is not supported in ipa-new");
}

/** Per-program fee agreement row (legacy UI) */
export interface ProgramAgreement {
  id: number;
  programId: number;
  franchiseId: string;
  createdAt?: string;
  franchise?: { id: string; name: string };
  franchiseProgram?: { program?: { id: number; name: string } };
}

async function getProgramAgreements(): Promise<ProgramAgreement[]> {
  return [];
}

async function initiateProgramFeePayment(
  _agreementId: number,
): Promise<PaymentOrderResponse> {
  throw new Error("Not supported in ipa-new");
}

async function verifyProgramFeePayment(_payload: unknown) {
  throw new Error("Not supported in ipa-new");
}

export interface RequestProgramDto {
  franchiseId: string;
  programIds: number[];
  notes?: string;
}

export async function requestProgram(dto: RequestProgramDto): Promise<unknown> {
  await requestPrograms(dto.franchiseId, dto.programIds);
  return {};
}
