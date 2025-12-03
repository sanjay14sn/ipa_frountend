import { api } from "@/lib/axios";

export interface Inventory {
  id: number;
  name: string;
  description: string;
  categoryId: number;
  category?: {
    id: number;
    name: string;
    description: string;
    isActive: boolean;
  };
  quantity: number;
  restockQuantity: number;
  programId: number;
  levelId: number;
  isActive: boolean;
  price: number;
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
  categoryId: number;
  quantity: number;
  restockQuantity: number;
  programId: number;
  levelId?: number;
  isActive: boolean;
  price?: number;
}

export interface UpdateInventoryDto {
  name?: string;
  description?: string;
  categoryId?: number;
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

export interface InventorySupplier {
  id: number;
  inventoryId: number;
  supplierId: number;
  costPrice: number;
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

export async function getKitInventoryItems(): Promise<Inventory[]> {
  const response = await api.get<InventoryResponse>("/inventory/kit-items");
  return Array.isArray(response.data.result) ? response.data.result : [];
}

// Inventory-Supplier linking methods
export async function linkSupplierToInventory(
  inventoryId: number,
  supplierId: number,
  costPrice: number
): Promise<InventorySupplier> {
  const response = await api.post(`/inventory/${inventoryId}/suppliers`, {
    supplierId,
    costPrice,
  });
  return response.data.result;
}

export async function unlinkSupplierFromInventory(
  inventoryId: number,
  supplierId: number
): Promise<void> {
  await api.delete(`/inventory/${inventoryId}/suppliers/${supplierId}`);
}

export async function getSuppliersForInventory(
  inventoryId: number
): Promise<InventorySupplier[]> {
  const response = await api.get(`/inventory/${inventoryId}/suppliers`);
  return Array.isArray(response.data.result) ? response.data.result : [];
}