import { api } from "@/lib/axios";
import { unwrapData, compactRequestParams } from "@/lib/unwrap-api";
import type { AxiosResponse } from "axios";
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
  const response = await api.get("/admin/fulfillment", {
    params: compactRequestParams({
      page: params?.page,
      limit: params?.limit,
      search: params?.search,
      // Omit "all" sentinel — backend expects absent key for no filter.
      status: params?.status !== "all" ? params?.status : undefined,
      franchiseId: params?.franchiseId,
    }),
  });
  return unwrapData(response) as ShipmentListResponse;
}

export async function downloadChallan(dcPdfPath: string): Promise<void> {
  const response: AxiosResponse<Blob> = await api.get(`/uploads/${dcPdfPath}`, {
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

export async function regenerateDc(orderId: number): Promise<{ dcPdfPath: string }> {
  const response = await api.post(`/admin/fulfillment/order/${orderId}/regenerate-dc`);
  return unwrapData(response) as { dcPdfPath: string };
}
