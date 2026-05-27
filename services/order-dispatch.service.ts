import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DispatchEligibleOrder {
  id: number;
  referenceId: string;
  orderType: string;
  createdAt: string;
  shipment: { status: string } | null;
  itemCount: number;
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

export async function getDispatchEligibleOrders(
  franchiseId: string,
): Promise<DispatchEligibleOrder[]> {
  const response = await api.get("/admin/order/dispatch-eligible", {
    params: { franchiseId },
  });
  return unwrapData<DispatchEligibleOrder[]>(response);
}
