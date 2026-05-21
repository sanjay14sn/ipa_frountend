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
import { unwrapData, normalizePaginatedResult } from "@/lib/unwrap-api";

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

export async function switchFranchise(franchiseId: string): Promise<{
  franchiseId: string;
  franchiseName: string;
  franchiseStatus: string;
  franchises: Array<{ id: string; name: string; status: string }>;
}> {
  await api.post("/franchisee/auth/switch", { franchiseId });
  const listRes = await api.get("/franchise");
  const listData = unwrapData<unknown>(listRes);
  const { rows: franchisesRaw } = normalizePaginatedResult<{ id: string; name: string; status: string }>(listData);
  const franchises = franchisesRaw.map((f) => ({
    id: f.id,
    name: f.name,
    status: f.status,
  }));
  const current = franchises.find((f) => f.id === franchiseId);
  return {
    franchiseId,
    franchiseName: current?.name ?? "",
    franchiseStatus: current?.status ?? "",
    franchises,
  };
}

export function getCurrentFranchiseeProfile() {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.profile || null;
    }
  }
  return null;
}
