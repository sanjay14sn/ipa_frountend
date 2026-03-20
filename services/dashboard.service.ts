import { api } from "@/lib/axios";

export interface AdminDashboardStats {
  franchises: { total: number; pending: number };
  students: { total: number; active: number };
  courseInstructors: { total: number; pending: number };
  orders: { total: number; pending: number };
  certificates: { total: number; pending: number };
}

/** @deprecated use AdminDashboardStats */
export type DashboardStats = AdminDashboardStats;

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const response = await api.get("/admin/dashboard");
  const data = response.data?.result;
  return data?.result ?? data;
}

export interface FranchiseeDashboardStats {
  students: { total: number; active: number };
  courseInstructors: { total: number; pending: number };
  orders: { total: number; pending: number };
  certificates: { total: number; pending: number };
}

export async function getFranchiseeDashboardStats(): Promise<FranchiseeDashboardStats> {
  const response = await api.get("/franchisee/dashboard");
  const data = response.data?.result;
  return data?.result ?? data;
}
