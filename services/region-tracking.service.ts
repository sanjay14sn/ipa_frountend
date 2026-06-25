import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";

export interface RegionOption {
  adminId: number;
  adminName: string;
  /** null = the central / HQ region (super admin, unstaffed states). */
  state: string | null;
  isCentral: boolean;
  warehouseLocationId: number;
}

/** Region directory for the super-admin Operations region selector. */
export async function getRegions(): Promise<RegionOption[]> {
  const res = await api.get("/admin/regions");
  return unwrapData<RegionOption[]>(res);
}
