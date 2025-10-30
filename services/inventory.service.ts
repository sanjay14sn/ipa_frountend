import axios from "axios";

export enum InventoryCategory {
  SHIRT = "Shirt",
  BOOK = "Book",
  STATIONERY = "Stationery",
  UNIFORM = "Uniform",
  MATERIAL = "Material",
  OTHER = "Other",
}

export interface Inventory {
  id: number;
  name: string;
  description: string;
  category: InventoryCategory;
  price: number;
  quantity: number;
  restockQuantity: number;
  programId: number;
  levelId: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  updatedBy?: number;
  level?: {
    id: number;
    name: string;
    program?: {
      id: number;
      name: string;
    };
  };
}

export interface CreateInventoryDto {
  name: string;
  description: string;
  category: InventoryCategory;
  price: number;
  quantity: number;
  restockQuantity: number;
  programId: number;
  levelId: number;
  isActive: boolean;
}

export interface UpdateInventoryDto {
  name?: string;
  description?: string;
  category?: InventoryCategory;
  price?: number;
  quantity?: number;
  restockQuantity?: number;
  isActive?: boolean;
}

export interface InventoryResponse {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
  result: Inventory[] | Inventory;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedInventoryResponse {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
  result: {
    data: Inventory[];
    meta: PaginationMeta;
  };
}

export interface InventoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  programId?: number;
  levelId?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export async function getAllInventory(): Promise<Inventory[]> {
  const response = await api.get<InventoryResponse>("/inventory");
  return Array.isArray(response.data.result) ? response.data.result : [];
}

export async function getInventoryByLevel(
  levelId: number
): Promise<Inventory[]> {
  const response = await api.get<InventoryResponse>(
    `/inventory/level/${levelId}`
  );
  return Array.isArray(response.data.result) ? response.data.result : [];
}

export async function createInventory(
  inventory: CreateInventoryDto
): Promise<Inventory> {
  const response = await api.post<InventoryResponse>("/inventory", inventory);
  return response.data.result as Inventory;
}

export async function updateInventory(
  id: number,
  inventory: UpdateInventoryDto
): Promise<void> {
  await api.patch(`/inventory/update/${id}`, inventory);
}

export async function updateStock(id: number, quantity: number): Promise<void> {
  await api.patch(`/inventory/stock/${id}`, { quantity });
}

export async function deleteInventory(id: number): Promise<void> {
  await api.delete(`/inventory/delete/${id}`);
}

export async function getPaginatedInventory(
  filters: InventoryFilters = {}
): Promise<{ data: Inventory[]; meta: PaginationMeta }> {
  const params = new URLSearchParams();

  if (filters.page) params.append("page", filters.page.toString());
  if (filters.limit) params.append("limit", filters.limit.toString());
  if (filters.search) params.append("search", filters.search);
  if (filters.programId)
    params.append("programId", filters.programId.toString());
  if (filters.levelId) params.append("levelId", filters.levelId.toString());
  if (filters.status) params.append("status", filters.status);
  if (filters.sortBy) params.append("sortBy", filters.sortBy);
  if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

  const response = await api.get<PaginatedInventoryResponse>(
    `/inventory/paginated?${params.toString()}`
  );
  return response.data.result;
}
