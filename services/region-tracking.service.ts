import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";

export interface RegionStatusCounts {
  total: number;
  byStatus: Record<string, number>;
}

export interface RegionSummary {
  adminId: number;
  adminName: string;
  /** null = the central / HQ region (super admin, unstaffed states). */
  state: string | null;
  isCentral: boolean;
  warehouseLocationId: number;
  orders: RegionStatusCounts;
  shipments: RegionStatusCounts;
  inbound: {
    purchaseOrders: number;
    poByStatus: Record<string, number>;
    receipts: number;
  };
  stock: { items: number; lowStock: number; outOfStock: number };
}

export type TrackingRow = Record<string, unknown>;

export interface RegionDetail {
  region: {
    adminId: number;
    adminName: string;
    state: string | null;
    isCentral: boolean;
    warehouseLocationId: number;
  };
  orders: TrackingRow[];
  shipments: TrackingRow[];
  purchaseOrders: TrackingRow[];
  receipts: TrackingRow[];
  stock: TrackingRow[];
}

export async function getRegionSummaries(): Promise<RegionSummary[]> {
  const res = await api.get("/admin/tracking/regions");
  return unwrapData<RegionSummary[]>(res);
}

export async function getRegionDetail(
  adminId: number,
): Promise<RegionDetail | null> {
  const res = await api.get(`/admin/tracking/regions/${adminId}`);
  return unwrapData<RegionDetail | null>(res);
}
