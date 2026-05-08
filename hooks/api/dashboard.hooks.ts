"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAdminDashboardStats,
  getFranchiseeDashboardStats,
  type AdminDashboardStats,
  type FranchiseeDashboardApi,
} from "@/services/dashboard.service";
import { queryKeys } from "./query-keys";

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: queryKeys.admin.dashboard,
    queryFn: getAdminDashboardStats,
  });
}

export function useFranchiseeDashboardStats(enabled = true) {
  return useQuery({
    queryKey: queryKeys.franchisee.dashboard,
    queryFn: getFranchiseeDashboardStats,
    enabled,
  });
}

export type { AdminDashboardStats, FranchiseeDashboardApi };
