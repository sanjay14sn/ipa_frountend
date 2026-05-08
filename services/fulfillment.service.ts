import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";

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
