import axios from "axios";
import type { Supplier } from "./supplier.service";
import type { Inventory } from "./inventory.service";

export enum SupplierOrderStatus {
  PENDING = "Pending",
  ORDERED = "Ordered",
  RECEIVED = "Received",
  CANCELLED = "Cancelled",
}

export interface SupplierOrderItem {
  id: number;
  supplierOrderId: number;
  inventoryId: number;
  inventory?: Inventory;
  quantity: number;
  unitPrice: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierOrder {
  id: number;
  supplierId: number;
  supplier?: Supplier;
  status: SupplierOrderStatus;
  totalAmount: number;
  items?: SupplierOrderItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSupplierOrderDto {
  supplierId: number;
  items: {
    inventoryId: number;
    quantity: number;
    unitPrice: number;
  }[];
}

interface SupplierOrderResponse {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
  result: SupplierOrder[] | SupplierOrder;
}

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export async function getAllSupplierOrders(): Promise<SupplierOrder[]> {
  const response = await api.get<SupplierOrderResponse>("/supplier-orders");
  return Array.isArray(response.data.result) ? response.data.result : [];
}

export async function getSupplierOrderById(
  id: number
): Promise<SupplierOrder> {
  const response = await api.get<SupplierOrderResponse>(
    `/supplier-orders/${id}`
  );
  return response.data.result as SupplierOrder;
}

export async function createSupplierOrder(
  order: CreateSupplierOrderDto
): Promise<SupplierOrder> {
  const response = await api.post<SupplierOrderResponse>(
    "/supplier-orders",
    order
  );
  return response.data.result as SupplierOrder;
}

export async function receiveSupplierOrder(id: number): Promise<SupplierOrder> {
  const response = await api.patch<SupplierOrderResponse>(
    `/supplier-orders/${id}/receive`
  );
  return response.data.result as SupplierOrder;
}

export async function getOrderHistoryForInventory(
  inventoryId: number
): Promise<SupplierOrder[]> {
  const response = await api.get<SupplierOrderResponse>(
    `/supplier-orders/inventory/${inventoryId}`
  );
  return Array.isArray(response.data.result) ? response.data.result : [];
}
