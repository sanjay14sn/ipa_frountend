interface FranchiseeProfileResponse {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  result: {
    id: number;
    name: string;
    dob: string;
    bloodGroup: string;
    address: string;
    communicationAddress: string;
    city: string;
    phone: string;
    mail: string;
    education: string;
    occupation: string;
    reference: string;
    createdAt: string;
    updatedAt: string;
    /** Every franchise the franchisee owns (any review status), newest first. */
    franchises?: Array<{ id: string; name: string; status: string }>;
    franchise: {
      id: string;
      name: string;
      type: string;
      status: string;
      programId: number;
      franchiseeId: number;
      approvedBy: number;
      approvedAt: string;
      createdAt: string;
      updatedAt: string;
      franchisePayroll?: {
        franchiseFee: number;
        dateOfPayment: string;
        dateOfJoining: string;
        monthlyFee: number;
        ciShare: number;
        franchiseShare: number;
        royalty: number;
        kitCost: number;
        materialCost: number;
        installment: number;
        createdBy: number;
        updatedBy: number;
      };
    };
  };
}

// {
//     "statusCode": 201,
//     "timestamp": "2025-08-09T13:43:21.803Z",
//     "method": "POST",
//     "path": "/admin/auth/login",
//     "message": "success",
//     "result": {
//         "message": "Logged in successfully",
//         "userId": 1
//     }
// }

import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";
import type { ToursCompletedMap } from "@/lib/tours/tour-types";

export async function login(
  name: string,
  password: string
): Promise<{ userId: number; role?: "super" | "staff"; state?: string | null }> {
  const response = await api.post("/admin/auth/login", {
    name,
    password,
  });
  return unwrapData<{ userId: number }>(response);
}

export async function franchiseeLogin(
  email: string,
  password: string
): Promise<{ franchiseeId: number; franchiseId: string; role: string }> {
  const response = await api.post("/franchisee/auth/login", {
    email,
    password,
  });
  return unwrapData<{
    franchiseeId: number;
    franchiseId: string;
    role: string;
  }>(response);
}

export async function getAdminProfile(): Promise<{
  id: number;
  name: string;
  emailId?: string;
  role: "super" | "staff";
  state?: string | null;
  /** Guided-tour completion map (docs/guided-tours/); absent on old backends. */
  toursCompleted?: ToursCompletedMap;
}> {
  const response = await api.get("/admin/auth/me");
  return unwrapData(response);
}

export async function logout(): Promise<void> {
  const response = await api.post("/admin/auth/logout");
  return response.data;
}

export async function franchiseeLogout(): Promise<void> {
  const response = await api.post("/franchisee/auth/logout");
  return response.data;
}

export async function getFranchiseeProfile(): Promise<FranchiseeProfileResponse> {
  const response = await api.get("/franchisee/auth/me");
  return response.data;
}

/**
 * Backend session switch only. The caller (UserContext.switchFranchise)
 * refetches /franchisee/auth/me right after — that response now carries the
 * new franchise's name/status and the full switcher list, so the extra
 * GET /franchise round trip this used to make is gone.
 */
export async function switchFranchise(franchiseId: string): Promise<{
  franchiseId: string;
}> {
  const response = await api.post("/franchisee/auth/switch", { franchiseId });
  return unwrapData<{ franchiseId: string }>(response);
}

