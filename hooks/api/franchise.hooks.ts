"use client";

import { useQuery } from "@tanstack/react-query";
import { getFranchiseList, type FranchiseListItem } from "@/services/franchise.service";
import { queryKeys } from "./query-keys";
import { getQueryClientBridge } from "./query-client-bridge";

/** Invalidate every cached franchise list variant. */
export const FRANCHISE_LIST_PREFIX = ["franchises", "list"] as const;

export function useFranchiseList() {
  const q = useQuery({
    queryKey: queryKeys.franchises.list(),
    queryFn: getFranchiseList,
  });
  return {
    franchises: q.data ?? ([] as FranchiseListItem[]),
    isLoading: q.isLoading,
    error: q.error,
    revalidate: q.refetch,
  };
}

export async function revalidateFranchiseList() {
  try {
    await getQueryClientBridge().invalidateQueries({
      queryKey: FRANCHISE_LIST_PREFIX,
    });
  } catch {
    /* ignore */
  }
}
