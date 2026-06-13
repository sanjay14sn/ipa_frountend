"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getPaginatedPurchaseOrders,
  getPaginatedPurchaseReceipts,
  getPaginatedReplenishmentDrafts,
  getPaginatedSuppliers,
  getPaginatedSupplierTerms,
  type PaginatedProcurementResult,
  type PurchaseOrderListParams,
  type PurchaseReceiptListParams,
  type PurchaseOrderSummary,
  type PurchaseReceiptSummary,
  type Supplier,
  type SupplierListParams,
  type SupplierItemTerm,
  type SupplierTermListParams,
} from "@/services/procurement.service";
import { queryKeys } from "./query-keys";
import { getQueryClientBridge } from "./query-client-bridge";

export function useSuppliers(params?: SupplierListParams) {
  const q = useQuery({
    queryKey: queryKeys.procurement.suppliers(
      params as Record<string, unknown> | undefined,
    ),
    queryFn: () => getPaginatedSuppliers(params),
    placeholderData: (prev) =>
      prev as PaginatedProcurementResult<Supplier> | undefined,
  });

  return {
    ...q,
    data: q.data?.rows ?? ([] as Supplier[]),
    rows: q.data?.rows ?? ([] as Supplier[]),
    total: q.data?.total ?? 0,
    totalPages: q.data?.totalPages ?? 1,
    page: q.data?.page ?? params?.page ?? 1,
    limit: q.data?.limit ?? params?.limit ?? 20,
  };
}

export function useSupplierTerms(params?: SupplierTermListParams) {
  const q = useQuery({
    queryKey: queryKeys.procurement.supplierTerms(
      params as Record<string, unknown> | undefined,
    ),
    queryFn: () => getPaginatedSupplierTerms(params),
    placeholderData: (prev) =>
      prev as PaginatedProcurementResult<SupplierItemTerm> | undefined,
  });

  return {
    ...q,
    data: q.data?.rows ?? ([] as SupplierItemTerm[]),
    rows: q.data?.rows ?? ([] as SupplierItemTerm[]),
    total: q.data?.total ?? 0,
    totalPages: q.data?.totalPages ?? 1,
    page: q.data?.page ?? params?.page ?? 1,
    limit: q.data?.limit ?? params?.limit ?? 20,
  };
}

export function usePurchaseOrders(params?: PurchaseOrderListParams) {
  const q = useQuery({
    queryKey: queryKeys.procurement.purchaseOrders(
      params as Record<string, unknown> | undefined,
    ),
    queryFn: () => getPaginatedPurchaseOrders(params),
    placeholderData: (prev) =>
      prev as PaginatedProcurementResult<PurchaseOrderSummary> | undefined,
  });

  return {
    ...q,
    data: q.data?.rows ?? ([] as PurchaseOrderSummary[]),
    rows: q.data?.rows ?? ([] as PurchaseOrderSummary[]),
    total: q.data?.total ?? 0,
    totalPages: q.data?.totalPages ?? 1,
    page: q.data?.page ?? params?.page ?? 1,
    limit: q.data?.limit ?? params?.limit ?? 20,
  };
}

export function usePurchaseReceipts(params?: PurchaseReceiptListParams) {
  const q = useQuery({
    queryKey: queryKeys.procurement.purchaseReceipts(
      params as Record<string, unknown> | undefined,
    ),
    queryFn: () => getPaginatedPurchaseReceipts(params),
    placeholderData: (prev) =>
      prev as PaginatedProcurementResult<PurchaseReceiptSummary> | undefined,
  });

  return {
    ...q,
    data: q.data?.rows ?? ([] as PurchaseReceiptSummary[]),
    rows: q.data?.rows ?? ([] as PurchaseReceiptSummary[]),
    total: q.data?.total ?? 0,
    totalPages: q.data?.totalPages ?? 1,
    page: q.data?.page ?? params?.page ?? 1,
    limit: q.data?.limit ?? params?.limit ?? 20,
  };
}

export function useReplenishmentDrafts(params?: PurchaseOrderListParams) {
  const q = useQuery({
    queryKey: queryKeys.procurement.replenishmentDrafts(
      params as Record<string, unknown> | undefined,
    ),
    queryFn: () => getPaginatedReplenishmentDrafts(params),
    placeholderData: (prev) =>
      prev as PaginatedProcurementResult<PurchaseOrderSummary> | undefined,
  });

  return {
    ...q,
    data: q.data?.rows ?? ([] as PurchaseOrderSummary[]),
    rows: q.data?.rows ?? ([] as PurchaseOrderSummary[]),
    total: q.data?.total ?? 0,
    totalPages: q.data?.totalPages ?? 1,
    page: q.data?.page ?? params?.page ?? 1,
    limit: q.data?.limit ?? params?.limit ?? 20,
  };
}

export async function invalidateProcurementQueries() {
  try {
    const qc = getQueryClientBridge();
    await qc.invalidateQueries({ queryKey: ["procurement", "list"] });
  } catch {
    /* ignore */
  }
}

export type {
  SupplierListParams,
  SupplierTermListParams,
  PurchaseOrderListParams,
  PurchaseReceiptListParams,
};
