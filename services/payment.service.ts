

export interface Response {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
}

export enum PaymentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface Franchisee {
  id: number;
  name: string;
  mail: string;
  phone: string;
  franchise: Franchise;
}

export interface Franchise {
  id: number;
  name: string;
}

export interface Plan {
  id: number;
  name: string;
}

export interface Subscription {
  id: number;
  plan: Plan;
}

export interface PaymentData {
  id: number;
  franchiseeId: number;
  subscriptionId: number | null;
  razorpayOrderId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  franchisee: Franchisee;
  subscription: Subscription | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface GroupedPaymentData {
  [franchiseName: string]: PaymentData[];
}

export interface PaginatedPaymentsResponse {
  data: GroupedPaymentData;
  meta: PaginationMeta;
}

export interface PaymentPaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

import { api } from "@/lib/axios";

export async function getPaginatedAdminPayments(
  params: PaymentPaginationParams
): Promise<PaginatedPaymentsResponse> {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append("page", params.page.toString());
  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.search) queryParams.append("search", params.search);
  if (params.status) queryParams.append("status", params.status);
  if (params.sortBy) queryParams.append("sortBy", params.sortBy);
  if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

  const response = await api.get<{ result: PaginatedPaymentsResponse }>(
    `/payment/all-admin?${queryParams.toString()}`
  );
  return response.data.result;
}

export async function getPaymentDetails(orderId: string): Promise<PaymentData> {
  const response = await api.get<PaymentData>(`/payment/${orderId}`);
  return response.data;
}

export interface CITrainingPaymentOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  ciId: number;
  ciName: string;
  paymentType: string;
  key: string;
  message?: string;
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

export async function initiateCITrainingPayment(
  ciId: number
): Promise<CITrainingPaymentOrderResponse> {
  const response = await api.post<{ result: CITrainingPaymentOrderResponse }>(
    `/payment/ci-training/initiate/${ciId}`
  );
  return response.data.result;
}

export async function verifyCITrainingPayment(
  paymentData: VerifyPaymentDto
): Promise<PaymentVerificationResponse> {
  const response = await api.post<{ result: PaymentVerificationResponse }>(
    "/payment/ci-training/verify",
    paymentData
  );
  return response.data.result;
}

// Multi-level training payment interfaces
export interface MultiLevelCITrainingPaymentRequest {
  trainingLevelIds: number[];
}

export interface MultiLevelCITrainingPaymentOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  ciId: number;
  ciName: string;
  trainingLevels: string;
  paymentType: string;
  key: string;
  message?: string;
}

export async function initiateMultiLevelCITrainingPayment(
  ciId: number,
  trainingLevelIds: number[]
): Promise<MultiLevelCITrainingPaymentOrderResponse> {
  const response = await api.post<{ result: MultiLevelCITrainingPaymentOrderResponse }>(
    `/payment/ci-training/multi-level/initiate/${ciId}`,
    { trainingLevelIds }
  );
  return response.data.result;
}

export async function verifyMultiLevelCITrainingPayment(
  paymentData: VerifyPaymentDto
): Promise<PaymentVerificationResponse> {
  const response = await api.post<{ result: PaymentVerificationResponse }>(
    "/payment/ci-training/multi-level/verify",
    paymentData
  );
  return response.data.result;
}