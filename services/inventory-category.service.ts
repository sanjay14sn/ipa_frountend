import { api } from "@/lib/axios";

export interface InventoryCategory {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryCategoryResponse {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
  result: InventoryCategory[] | InventoryCategory;
}

export async function getInventoryCategories(): Promise<InventoryCategory[]> {
  const response = await api.get<InventoryCategoryResponse>(
    "/inventory-category"
  );
  return Array.isArray(response.data.result) ? response.data.result : [];
}

export async function getAllInventoryCategoriesAdmin(): Promise<InventoryCategory[]> {
  const response = await api.get<InventoryCategoryResponse>(
    "/inventory-category/admin/all"
  );
  return Array.isArray(response.data.result) ? response.data.result : [];
}

export async function createInventoryCategory(
  category: Omit<InventoryCategory, "id" | "createdAt" | "updatedAt">
): Promise<InventoryCategory> {
  const response = await api.post<InventoryCategoryResponse>(
    "/inventory-category",
    category
  );
  return response.data.result as InventoryCategory;
}

export async function updateInventoryCategory(
  id: number,
  category: Partial<InventoryCategory>
): Promise<void> {
  await api.patch(`/inventory-category/update/${id}`, category);
}

export async function deleteInventoryCategory(id: number): Promise<void> {
  await api.delete(`/inventory-category/delete/${id}`);
}

