

export interface Response {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
}

export interface Franchisee {
  name: string;
  dob: Date;
  bloodGroup: string;
  communicationAddress: string;
  phone: string;
  mail: string;
  education: string;
  occupation: string;
  reference: string;
  refreshToken: string;
  password?: string;
}

export interface Franchise {
  name: string;
  type: string;
  status: string;
  address: string;
  city: string;
  state?: string;
  programIds: number[];
  franchiseeId: number;
}

export interface FranchiseResponse {
  id: string;
  name: string;
  type: string;
  status: string;
  address: string;
  city?: string;
  state?: string;
  franchisePrograms?: Array<{
    program: {
      id: number;
      name: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface FranchiseeResponse {
  id: number;
  name: string;
  dob: Date;
  bloodGroup: string;
  communicationAddress: string;
  phone: string;
  mail: string;
  education: string;
  occupation: string;
  reference: string;
}

export interface FranchisePayrollResponse {
  id: number;
  franchiseFee: number;
  dateOfPayment: Date;
  dateOfJoining: Date;
  monthlyFee: number;
  ciShare: number;
  franchiseShare: number;
  royalty: number;
  kitCost: number;
  materialCost: number;
  installment: number;
  totalAmount: number;
  programId: number;
  program?: {
    id: number;
    name: string;
  };
}

export interface FranchiseeApplication {
  franchisee: Franchisee;
  franchise: Franchise;
}

export interface PendingFranchise extends Response {
  result: FranchiseeApplication[];
}

export interface FranchiseData extends FranchiseResponse {
  franchisee: FranchiseeResponse;
  franchisePayroll?: FranchisePayrollResponse; // Legacy - for backward compatibility
  franchisePayrolls?: FranchisePayrollResponse[]; // New - per program payrolls
}

export interface FranchisesResponse extends Response {
  result: FranchiseData[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedFranchisesResponse {
  data: FranchiseData[];
  meta: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  program?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface ProgramPayrollRequest {
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
  gstInclusive: boolean;
  freeload: boolean;
}

export interface CreatePayrollRequest {
  programPayrolls: ProgramPayrollRequest[];
}

import { api } from "@/lib/axios";

export async function applyFranchisee(franchisee: FranchiseeApplication) {
  const response = await api.post("/franchisee/apply", franchisee);
  return response;
}

export async function createFranchiseeByAdmin(franchisee: FranchiseeApplication) {
  const response = await api.post("/franchisee/admin/create", franchisee);
  return response.data;
}

export async function getPendingFranchise(): Promise<FranchisesResponse> {
  const response = await api.get<FranchisesResponse>("/franchise/pending");
  return response.data;
}

export async function getAllFranchise(): Promise<FranchisesResponse> {
  const response = await api.get<FranchisesResponse>("/franchise/all");
  return response.data;
}

export async function getPaginatedFranchises(
  status: string,
  params: PaginationParams
): Promise<PaginatedFranchisesResponse> {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append("page", params.page.toString());
  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.search) queryParams.append("search", params.search);
  if (params.status) queryParams.append("status", params.status);
  if (params.type) queryParams.append("type", params.type);
  if (params.program) queryParams.append("program", params.program);
  if (params.sortBy) queryParams.append("sortBy", params.sortBy);
  if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

  const response = await api.get<{ result: PaginatedFranchisesResponse }>(
    `/franchise/paginated/${status}?${queryParams.toString()}`
  );
  return response.data.result;
}

export async function createPayrollDetails(
  id: string,
  payrollDetails: CreatePayrollRequest
) {
  const response = await api.post(`/franchise/payroll/${id}`, payrollDetails);
  if (response.status === 201) {
    return response.data;
  } else {
    throw new Error(response.data.message);
  }
}

export async function updatePayrollDetails(
  id: string,
  payrollDetails: Partial<ProgramPayrollRequest>
) {
  const response = await api.put(`/franchise/payroll/${id}`, payrollDetails);
  if (response.status === 200) {
    return response.data;
  } else {
    throw new Error(response.data.message);
  }
}

export async function onboardingPayment(franchiseId: string) {
  const response = await api.post(`/franchisee/onboarding/${franchiseId}`);
  if (response.status === 201) {
    return response.data;
  } else {
    throw new Error(response.data.message);
  }
}

export interface UpdateFranchiseStatusDto {
  status: "Approved" | "Rejected" | "Pending";
}

export async function updateFranchiseStatus(
  franchiseId: string,
  dto: UpdateFranchiseStatusDto
) {
  const response = await api.patch(`/franchise/status/${franchiseId}`, dto);
  if (response.status === 200) {
    return response.data;
  } else {
    throw new Error(response.data.message);
  }
}

export async function rejectFranchise(franchiseId: string) {
  return updateFranchiseStatus(franchiseId, { status: "Rejected" });
}

export interface InitiateFranchiseFeePaymentDto {
  franchiseId: string;
}

export interface PaymentOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  franchiseId: string;
  franchiseName: string;
  paymentType: string;
  key: string;
  isZeroAmount?: boolean;
}

export interface VerifyPaymentDto {
  paymentId: string;
  orderId: string;
  signature: string;
}

export interface PaymentVerificationResponse {
  message: string;
  status?: string;
}

export async function initiateFranchiseFeePayment(
  franchiseId: string
): Promise<PaymentOrderResponse> {
  const response = await api.post<{ result: PaymentOrderResponse }>(
    "/payment/franchise-fee/initiate",
    { franchiseId }
  );
  return response.data.result;
}

export async function verifyFranchiseFeePayment(
  paymentData: VerifyPaymentDto
): Promise<PaymentVerificationResponse> {
  const response = await api.post<{ result: PaymentVerificationResponse }>(
    "/payment/franchise-fee/verify",
    paymentData
  );
  return response.data.result;
}
