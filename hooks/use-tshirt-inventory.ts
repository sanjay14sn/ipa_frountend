"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAgreementTshirtsAdmin,
  getMyAgreementTshirts,
  type InventoryByCategoryItem,
} from "@/services/inventory.service";

/**
 * T-shirt options for the order screen, scoped to the program-kit items the
 * admin configured for the franchise's agreement on `programId`. Disabled
 * (empty list) until a program is selected.
 */
export function useTshirtInventory(
  enabled: boolean,
  programId: number | null | undefined,
) {
  return useQuery<InventoryByCategoryItem[]>({
    queryKey: ["inventory", "agreement-tshirts", programId ?? null],
    queryFn: () => getMyAgreementTshirts(programId as number),
    enabled: enabled && programId != null,
    staleTime: 5 * 60 * 1000,
  });
}

/** Admin variant scoped to a franchise (admin create-on-behalf order flow). */
export function useAdminTshirtInventory(
  enabled: boolean,
  franchiseId: string | null,
  programId: number | null | undefined,
) {
  return useQuery<InventoryByCategoryItem[]>({
    queryKey: [
      "inventory",
      "agreement-tshirts-admin",
      franchiseId,
      programId ?? null,
    ],
    queryFn: () => getAgreementTshirtsAdmin(franchiseId!, programId as number),
    enabled: enabled && !!franchiseId && programId != null,
    staleTime: 5 * 60 * 1000,
  });
}
