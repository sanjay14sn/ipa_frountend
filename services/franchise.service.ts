

import { api } from "@/lib/axios";

// Note: CSV template is generated on the client now

export async function bulkUploadFranchises(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/franchise/bulk-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export interface FranchiseListItem {
  id: number;
  name: string;
}

export async function getFranchiseList(): Promise<FranchiseListItem[]> {
  const response = await api.get("/franchise/list");
  const data = response.data as any;
  if (Array.isArray(data)) return data as FranchiseListItem[];
  if (Array.isArray(data?.result)) return data.result as FranchiseListItem[];
  if (Array.isArray(data?.franchises))
    return data.franchises as FranchiseListItem[];
  return [];
}

export interface RequestFranchiseDto {
  name: string;
  type: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  programIds: number[];
}

export async function requestNewFranchise(dto: RequestFranchiseDto) {
  const response = await api.post("/franchise/request", dto);
  return response.data;
}

export interface RequestProgramDto {
  franchiseId: string;
  programIds: number[];
}

export async function requestProgram(dto: RequestProgramDto) {
  const response = await api.post("/franchise/program-request", dto);
  return response.data;
}

export async function getProgramRequests(status?: string) {
  const params = status ? { status } : {};
  const response = await api.get("/franchise/program-requests", { params });
  return response.data;
}

export interface ProgramRequestRow {
  id: number;
  franchiseId: string;
  programId: number;
  status: string;
  requestedBy: number;
  createdAt: string;
  franchise?: { id: string; name: string };
  program?: { id: number; name: string };
  franchisee?: { id: number; name: string; mail: string; phone: string };
}

export interface PaginatedProgramRequestsResponse {
  data: ProgramRequestRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ProgramRequestsPaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

export async function getPaginatedProgramRequests(
  params: ProgramRequestsPaginationParams
): Promise<PaginatedProgramRequestsResponse> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append("page", params.page.toString());
  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.search) queryParams.append("search", params.search);
  if (params.status) queryParams.append("status", params.status ?? "Pending");
  if (params.sortBy) queryParams.append("sortBy", params.sortBy);
  if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

  const response = await api.get<{
    result: PaginatedProgramRequestsResponse;
  }>(`/franchise/program-requests/paginated?${queryParams.toString()}`);
  return response.data.result ?? response.data;
}

export interface ApproveProgramRequestPayload {
  payroll: {
    programId: number;
    franchiseFee: number;
    kitCost: number;
    materialCost: number;
    monthlyFee: number;
    ciShare: number;
    franchiseShare: number;
    royalty: number;
    installment: number;
    totalAmount: number;
    gstFranchiseFee?: boolean;
    gstRoyalty?: boolean;
    gstMaterialCost?: boolean;
    freeload: boolean;
  };
  dateOfPayment: string;
  dateOfJoining: string;
  kitItems?: { inventoryId: number; quantity: number }[];
}

export async function approveProgramRequest(
  id: number,
  payload: ApproveProgramRequestPayload
) {
  const response = await api.patch(
    `/franchise/program-requests/${id}/approve`,
    payload
  );
  return response.data;
}

export async function rejectProgramRequest(id: number) {
  const response = await api.patch(`/franchise/program-requests/${id}/reject`);
  return response.data;
}

export interface ProgramAgreement {
  id: number;
  franchiseId: string;
  programId: number;
  franchiseProgramId: number;
  franchiseFee: number;
  kitCost: number;
  materialCost: number;
  monthlyFee: number;
  ciShare: number;
  franchiseShare: number;
  royalty: number;
  installment: number;
  totalAmount: number;
  gstFranchiseFee: boolean;
  gstRoyalty: boolean;
  gstMaterialCost: boolean;
  freeload: boolean;
  dateOfJoining: string;
  dateOfPayment: string;
  status: string;
  createdAt: string;
  franchise?: { id: string; name: string };
  franchiseProgram?: {
    id: number;
    program?: { id: number; name: string };
  };
}

export async function hasPendingRequest(): Promise<{ hasPending: boolean; reason?: string }> {
  const response = await api.get("/franchise/program-requests/has-pending");
  const data = response.data as any;
  const payload = data?.result ?? data;
  return { hasPending: payload?.hasPending ?? false, reason: payload?.reason };
}

export async function getProgramAgreements(): Promise<ProgramAgreement[]> {
  const response = await api.get<{ result: ProgramAgreement[] }>(
    "/franchise/program-agreements/pending"
  );
  const data = response.data as any;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.result)) return data.result;
  return [];
}

export interface ProgramFeePaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  franchiseId: string;
  franchiseName: string;
  paymentType: string;
  key: string;
  isZeroAmount?: boolean;
}

export async function initiateProgramFeePayment(
  payrollId: number
): Promise<ProgramFeePaymentOrder> {
  const response = await api.post<{ result: ProgramFeePaymentOrder }>(
    "/payment/program-fee/initiate",
    { payrollId }
  );
  const data = response.data as any;
  return data?.result ?? data;
}

export async function verifyProgramFeePayment(payload: {
  paymentId: string;
  orderId: string;
  signature: string;
}) {
  const response = await api.post("/payment/program-fee/verify", payload);
  return response.data;
}
