import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";
import type { PaymentOrderResponse } from "./franchisee.service";
import { requestPrograms, approveProgramRequestAdmin, rejectProgramRequestAdmin } from "./program-request.service";

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
  const rows = unwrapData<unknown[]>(response);
  return (Array.isArray(rows) ? rows : []).map((r) => {
    const x = r as Record<string, unknown>;
    const plain =
      x?.get &&
      typeof (x as { get: (opts?: { plain?: boolean }) => unknown }).get ===
        "function"
        ? (x as { get: (opts?: { plain?: boolean }) => FranchiseListItem }).get({
            plain: true,
          })
        : (x as unknown as FranchiseListItem);
    return {
      id: String(plain.id),
      name: String(plain.name ?? ""),
      type: String(plain.type ?? ""),
      status: String(plain.status ?? ""),
      city: plain.city as string | undefined,
      state: plain.state as string | undefined,
    };
  });
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
  franchise?: { id: string; name: string; city?: string };
  franchisee?: { id: number; name: string; mail?: string; phone?: string };
  requestedBy?: string;
  createdAt?: string;
}

export interface ProgramRequestPayroll {
  programId?: number;
  franchiseFee: number;
  kitCost: number;
  materialCost: number;
  monthlyFee: number;
  ciShare: number;
  franchiseShare: number;
  royalty: number;
  installment: number;
  tenure?: number;
  totalAmount: number;
  gstFranchiseFee: boolean;
  gstRoyalty: boolean;
  gstMaterialCost: boolean;
  freeload: boolean;
}

export interface ApproveProgramRequestPayload {
  payroll: ProgramRequestPayroll;
  dateOfPayment?: string;
  dateOfJoining?: string;
  kitItems?: { inventoryId: number; quantity: number }[];
}

export async function getProgramRequests(_params?: {
  status?: string;
}): Promise<ProgramRequestRow[]> {
  return [];
}

export async function getPaginatedProgramRequests(_params?: {
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

export async function approveProgramRequest(
  id: number,
  payload: ApproveProgramRequestPayload,
) {
  return approveProgramRequestAdmin(id, payload);
}

export async function rejectProgramRequest(id: number) {
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

export async function getProgramAgreements(): Promise<ProgramAgreement[]> {
  return [];
}

export async function initiateProgramFeePayment(
  _agreementId: number,
): Promise<PaymentOrderResponse> {
  throw new Error("Not supported in ipa-new");
}

export async function verifyProgramFeePayment(_payload: unknown) {
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
