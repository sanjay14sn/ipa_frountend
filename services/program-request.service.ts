import { api } from "@/lib/axios";
import { compactRequestParams, normalizePaginatedResult, unwrapData } from "@/lib/unwrap-api";

export interface ProgramRequestPayroll {
  programId?: number;
  franchiseFee: number;
  kitCost: number;
  materialCost: number;
  monthlyFee: number;
  ciShare: number;
  franchiseShare: number;
  royalty: number;
  installment: boolean;
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

export interface ProgramRequestItem {
  id: number;
  franchiseId: string;
  programId: number;
  franchiseeId: number;
  status: 'Requested' | 'TermsSet' | 'PendingSignature' | 'Active' | 'Rejected' | 'Cancelled';
  agreementId: number | null;
  requestedAt: string;
  approvedAt: string | null;
  activatedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  cancelledAt: string | null;
  franchise?: { id: string; name: string; city?: string };
  program?: { id: number; name: string };
  franchisee?: { id: number; name: string; mail?: string; phone?: string };
}

export async function listProgramRequests(): Promise<ProgramRequestItem[]> {
  const res = await api.get('/franchisee/program-requests');
  const data = unwrapData<ProgramRequestItem[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function requestPrograms(franchiseId: string, programIds: number[]): Promise<void> {
  // One API call per programId (backend takes one programId per call)
  await Promise.all(
    programIds.map((programId) =>
      api.post('/franchisee/program-requests', { franchiseId, programId })
    )
  );
}

export async function cancelProgramRequest(id: number): Promise<void> {
  await api.post(`/franchisee/program-requests/${id}/cancel`);
}


export interface PaginatedProgramRequestsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedProgramRequestsResponse {
  data: ProgramRequestItem[];
  meta: PaginatedProgramRequestsMeta;
}

export async function getPaginatedProgramRequestsAdmin(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  franchiseId?: string;
  sortBy?: string;
  sortOrder?: string;
}): Promise<PaginatedProgramRequestsResponse> {
  const res = await api.get('/admin/program-requests', {
    params: compactRequestParams(params as Record<string, string | number | boolean | undefined | null>),
  });
  const result = unwrapData<unknown>(res);
  const { rows: raw, total, page, limit } = normalizePaginatedResult<ProgramRequestItem>(result);
  const lim = limit || 10;
  const totalPages = Math.ceil(total / lim) || 1;
  return {
    data: raw,
    meta: { total, page: page || 1, limit: lim, totalPages },
  };
}

/** @deprecated Use getPaginatedProgramRequestsAdmin */
export async function listProgramRequestsForAdmin(params?: {
  status?: string;
  franchiseId?: string;
}): Promise<ProgramRequestItem[]> {
  const res = await api.get('/admin/program-requests', { params });
  const data = unwrapData<ProgramRequestItem[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function approveProgramRequestAdmin(id: number, payload: ApproveProgramRequestPayload): Promise<void> {
  await api.post(`/admin/program-requests/${id}/approve`, payload);
}

export async function rejectProgramRequestAdmin(id: number, reason: string): Promise<void> {
  await api.post(`/admin/program-requests/${id}/reject`, { reason });
}
