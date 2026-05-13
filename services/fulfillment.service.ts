import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";
import type { DispatchOrderItemAdmin } from "@/services/order.service";

export type ShipmentOrderItem = {
  id: number;
  inventoryItemId: number;
  quantity: number;
  reservedQty: number;
  fulfilledQty: number;
  inventory: { id: number; name: string; sku: string } | null;
};

export type ShipmentData = {
  id: number;
  orderId: number;
  referenceId: string;
  franchiseId: string;
  franchise: { id: string; name: string; city: string } | null;
  totalAmount: number;
  status: string;
  trackingNumber: string | null;
  carrier: string | null;
  dcPdfPath: string | null;
  readyToShipAt: string | null;
  totalItems: number;
  orderItems: ShipmentOrderItem[];
  /** Certificate / ID card dispatch lines when order is a dispatch shipment */
  dispatchItems?: DispatchOrderItemAdmin[];
  createdAt: string;
  updatedAt: string;
};

export type ShipmentListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  franchiseId?: string;
};

export type ShipmentListResponse = {
  rows: ShipmentData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function getAdminShipments(
  params?: ShipmentListParams,
): Promise<ShipmentListResponse> {
  const query = new URLSearchParams();
  if (params?.page != null) query.set("page", String(params.page));
  if (params?.limit != null) query.set("limit", String(params.limit));
  if (params?.search) query.set("search", params.search);
  if (params?.status && params.status !== "all") query.set("status", params.status);
  if (params?.franchiseId) query.set("franchiseId", params.franchiseId);
  const qs = query.toString();
  const response = await api.get(`/admin/fulfillment${qs ? `?${qs}` : ""}`);
  return unwrapData(response) as ShipmentListResponse;
}

export async function downloadChallan(dcPdfPath: string): Promise<void> {
  const response = await api.get(`/uploads/${dcPdfPath}`, {
    responseType: "blob",
  });
  const blob =
    response.data instanceof Blob
      ? response.data
      : new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dcPdfPath.split("/").pop() ?? "delivery-challan.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export interface VerifyShipmentDto {
  verifiedBy?: string;
  carrier?: string;
  notes?: string;
}

export interface ShipShipmentDto {
  shippedBy?: string;
  trackingNumber?: string;
  carrier?: string;
}

export async function verifyShipment(orderId: number, body?: VerifyShipmentDto) {
  const response = await api.post(`/admin/fulfillment/order/${orderId}/verify`, body ?? {});
  return unwrapData(response);
}

export async function shipShipment(orderId: number, body?: ShipShipmentDto) {
  const response = await api.post(
    `/admin/fulfillment/order/${orderId}/ship`,
    body ?? {},
  );
  return unwrapData(response);
}

export async function deliverShipment(orderId: number) {
  const response = await api.post(`/admin/fulfillment/order/${orderId}/deliver`);
  return unwrapData(response);
}

export async function cancelShipment(orderId: number) {
  const response = await api.post(`/admin/fulfillment/order/${orderId}/cancel`);
  return unwrapData(response);
}
