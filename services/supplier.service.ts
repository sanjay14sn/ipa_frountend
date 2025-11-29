

export interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSupplierDto {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface UpdateSupplierDto {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface SupplierResponse {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
  result: Supplier[] | Supplier;
}

import { api } from "@/lib/axios";

export async function getAllSuppliers(): Promise<Supplier[]> {
  const response = await api.get<SupplierResponse>("/suppliers");
  return Array.isArray(response.data.result) ? response.data.result : [];
}

export async function getSupplierById(id: number): Promise<Supplier> {
  const response = await api.get<SupplierResponse>(`/suppliers/${id}`);
  return response.data.result as Supplier;
}

export async function createSupplier(
  supplier: CreateSupplierDto
): Promise<Supplier> {
  const response = await api.post<SupplierResponse>("/suppliers", supplier);
  return response.data.result as Supplier;
}

export async function updateSupplier(
  id: number,
  supplier: UpdateSupplierDto
): Promise<void> {
  await api.put(`/suppliers/${id}`, supplier);
}

export async function deleteSupplier(id: number): Promise<void> {
  await api.delete(`/suppliers/${id}`);
}
