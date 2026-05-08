import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  withCredentials: true,
});

export interface CIUser {
  id: number;
  instructorCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  programId: number;
  franchiseId: string;
  mustChangePassword: boolean;
  credentialsIssuedAt?: string | null;
}

export interface CILoginResponse {
  instructorId: number;
  franchiseId: string;
  programId: number;
  role: string;
}

export async function loginCI(email: string, password: string): Promise<CILoginResponse> {
  const res = await api.post("/ci/login", { email, password });
  return res.data;
}

export async function refreshCI(): Promise<void> {
  await api.post("/ci/refresh");
}

export async function logoutCI(): Promise<void> {
  await api.post("/ci/logout");
}

export async function getCIMe(): Promise<CIUser> {
  const res = await api.get("/ci/me");
  return res.data;
}

export async function changeCIPassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post("/ci/change-password", { currentPassword, newPassword });
}
