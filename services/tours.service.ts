import { api } from "@/lib/axios";

/**
 * Guided-tour completion writes (docs/guided-tours/). One route per realm —
 * the body is validated server-side against the same shape.
 */

export interface CompleteTourBody {
  tourKey: string;
  version: number;
}

export async function markAdminTourComplete(
  body: CompleteTourBody,
): Promise<void> {
  await api.post("/admin/auth/me/tours/complete", body);
}

export async function markFranchiseeTourComplete(
  body: CompleteTourBody,
): Promise<void> {
  await api.post("/franchisee/auth/me/tours/complete", body);
}

export async function markCITourComplete(
  body: CompleteTourBody,
): Promise<void> {
  await api.post("/ci/me/tours/complete", body);
}
