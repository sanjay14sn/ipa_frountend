import axios from "axios";

interface LoginResponse {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  result: {
    message: string;
    userId: number;
    role: string;
  };
}

interface FranchiseeLoginResponse {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  result: {
    message: string;
    userId: number;
    name: string;
    franchiseId: number;
    role: string;
    franchiseStatus: string;
  };
}

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
      id: number;
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
        totalAmount: number;
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

const baseUrl = "http://localhost:5000";

const api = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export async function login(
  name: string,
  password: string
): Promise<LoginResponse> {
  const response = await api.post("/admin/auth/login", {
    name,
    password,
  });

  if (response.status === 200) {
    localStorage.setItem("user", JSON.stringify(response.data.result));
  }

  return response.data;
}

export async function franchiseeLogin(
  email: string,
  password: string
): Promise<FranchiseeLoginResponse> {
  const response = await api.post("/franchisee/auth/login", {
    email,
    password,
  });

  if (response.status === 200) {
    localStorage.setItem("user", JSON.stringify(response.data.result));
  }

  return response.data;
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
  const response = await api.get("/franchisee/profile");
  return response.data;
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
