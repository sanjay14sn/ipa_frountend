"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getTshirtInventory,
  type InventoryByCategoryItem,
} from "@/services/inventory.service";
import { INVENTORY_CATEGORIES } from "@/lib/inventory-categories";

const TSHIRT_CATEGORY = INVENTORY_CATEGORIES[1]; // "T-Shirts"

export function useTshirtInventory(enabled: boolean) {
  return useQuery<InventoryByCategoryItem[]>({
    queryKey: ["inventory", "by-category", TSHIRT_CATEGORY],
    queryFn: () => getTshirtInventory(TSHIRT_CATEGORY),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
