import { api } from "@/lib/axios";
import {
  compactRequestParams,
  normalizePaginatedResult,
  unwrapData,
} from "@/lib/unwrap-api";

export interface AdminRecord {
  id: number;
  name: string;
  emailId: string;
  phone: string;
  role: "super" | "staff";
  state: string | null;
  isActive: boolean;
  createdByAdminId: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface PaginatedAdminsResponse {
  data: AdminRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface CreateAdminRequest {
  name: string;
  emailId: string;
  phone: string;
  password: string;
  state: string;
}

export interface UpdateAdminRequest {
  name?: string;
  emailId?: string;
  phone?: string;
  password?: string;
  state?: string;
  isActive?: boolean;
}

export async function getPaginatedAdmins(
  params: AdminListParams = {},
): Promise<PaginatedAdminsResponse> {
  const response = await api.get("/admin", {
    params: compactRequestParams({
      page: params.page,
      limit: params.limit,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    }),
  });
  const result = unwrapData<unknown>(response);
  const { rows, total, page, limit } = normalizePaginatedResult<AdminRecord>(result);
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  return {
    data: rows,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export async function createAdmin(
  payload: CreateAdminRequest,
): Promise<AdminRecord> {
  const response = await api.post("/admin", payload);
  return unwrapData<AdminRecord>(response);
}

export async function updateAdmin(
  adminId: number,
  payload: UpdateAdminRequest,
): Promise<AdminRecord> {
  const response = await api.patch(`/admin/${adminId}`, payload);
  return unwrapData<AdminRecord>(response);
}
