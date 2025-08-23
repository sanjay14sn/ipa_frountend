import axios from "axios";

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
  address: string;
  communicationAddress: string;
  city: string;
  phone: string;
  mail: string;
  education: string;
  occupation: string;
  reference: string;
  refreshToken: string;
}

export interface Franchise {
  name: string;
  type: string;
  status: string;
  programId: number;
  franchiseeId: number;
}

export interface FranchiseResponse {
  id: number;
  name: string;
  type: string;
  status: string;
  programName: string;
  createdAt: string;
  updatedAt: string;
}

export interface FranchiseeResponse {
  id: number;
  name: string;
  dob: Date;
  bloodGroup: string;
  address: string;
  communicationAddress: string;
  city: string;
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
  franchisePayroll: FranchisePayrollResponse;
}

export interface FranchisesResponse extends Response {
  result: FranchiseData[];
}

export interface PayrollDetails {
  franchiseFee: number;
  dateOfPayment: Date;
  kitCost: number;
  materialCost: number;
  dateOfJoining: Date;
  monthlyFee: number;
  ciShare: number;
  franchiseShare: number;
  royalty: number;
  installment: number;
  totalAmount: number;
}

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export async function applyFranchisee(franchisee: FranchiseeApplication) {
  const response = await api.post("/franchisee/apply", franchisee);
  return response;
}

export async function getPendingFranchise(): Promise<FranchisesResponse> {
  const response = await api.get<FranchisesResponse>("/franchise/pending");
  return response.data;
}

export async function getAllFranchise(): Promise<FranchisesResponse> {
  const response = await api.get<FranchisesResponse>("/franchise/all");
  return response.data;
}

export async function createPayrollDetails(
  id: number,
  payrollDetails: PayrollDetails
) {
  const response = await api.post(`/franchise/payroll/${id}`, payrollDetails);
  if (response.status === 201) {
    return response.data;
  } else {
    throw new Error(response.data.message);
  }
}

export async function updatePayrollDetails(
  id: number,
  payrollDetails: Partial<PayrollDetails>
) {
  const response = await api.put(`/franchise/payroll/${id}`, payrollDetails);
  if (response.status === 200) {
    return response.data;
  } else {
    throw new Error(response.data.message);
  }
}

export async function onboardingPayment(franchiseId: number) {
  const response = await api.post(`/franchisee/onboarding/${franchiseId}`);
  if (response.status === 201) {
    return response.data;
  } else {
    throw new Error(response.data.message);
  }
}
