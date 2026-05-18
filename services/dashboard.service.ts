import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";

export interface DashboardStatBucket {
  total: number;
  pending: number;
  active: number;
}

/** Shape expected by `app/admin/dashboard/page.tsx` */
export interface DashboardStats {
  franchises: DashboardStatBucket;
  students: DashboardStatBucket;
  courseInstructors: DashboardStatBucket;
  orders: DashboardStatBucket;
  certificates: DashboardStatBucket;
}

export type AdminDashboardStats = {
  [K in keyof DashboardStats]?: Partial<DashboardStatBucket>;
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const response = await api.get("/admin/dashboard");
  return unwrapData<AdminDashboardStats>(response);
}

export interface FranchiseeDashboardStatBucket {
  total: number;
  pending: number;
  active: number;
}

export interface FranchiseeDashboardStats {
  students: FranchiseeDashboardStatBucket;
  courseInstructors: FranchiseeDashboardStatBucket;
  orders: FranchiseeDashboardStatBucket;
  certificates: FranchiseeDashboardStatBucket;
}

export type FranchiseeDashboardApi = Partial<FranchiseeDashboardStats>;

export async function getFranchiseeDashboardStats(): Promise<FranchiseeDashboardApi> {
  const response = await api.get("/franchisee/dashboard");
  return unwrapData<FranchiseeDashboardApi>(response);
}
