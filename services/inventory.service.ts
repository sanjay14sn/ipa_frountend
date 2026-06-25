import { api } from "@/lib/axios";
import {
  compactRequestParams,
  normalizePaginatedResult,
  unwrapData,
} from "@/lib/unwrap-api";
import type { InventoryCategoryName } from "@/lib/inventory-categories";

export type InventoryLifecycleStatus =
  | "ACTIVE"
  | "OBSOLETE"
  | "DISCONTINUED";
export type InventoryType =
  | "SALEABLE"
  | "PACKAGING"
  | "MARKETING"
  | "ADMIN_CONSUMABLE";

export type InventoryItemSummary = {
  id: number;
  sku: string;
  legacyItemCode?: string | null;
  legacyIsoCode?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  inventoryType: InventoryType;
  lifecycleStatus: InventoryLifecycleStatus;
  unitOfMeasurement?: string | null;
  reorderPoint: number;
  safetyStock: number;
  reorderCycleDays: number;
  isActive: boolean;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  onOrderQty: number;
  weightedAverageCost: number;
  unitPrice: number;
  defaultQuantity?: number | null;
};

export type Inventory = InventoryItemSummary;

export type ProgramKitItemSummary = InventoryItemSummary & {
  programKitId: number;
  programId: number;
  inventoryId: number;
  inventoryIsActive: boolean;
  isActive: boolean;
  selected?: boolean;
};

export type FranchiseProgramKitItemSummary = ProgramKitItemSummary & {
  quantity: number;
  selected: boolean;
};

export type CreateInventoryDto = {
  sku?: string;
  legacyItemCode?: string;
  legacyIsoCode?: string;
  name: string;
  description?: string;
  category?: InventoryCategoryName;
  inventoryType: InventoryType;
  lifecycleStatus: InventoryLifecycleStatus;
  unitOfMeasurement?: string;
  reorderPoint: number;
  safetyStock: number;
  reorderCycleDays: number;
  isActive: boolean;
  unitPrice?: number;
};

export type UpdateInventoryDto = Partial<CreateInventoryDto>;

export type PaginatedInventoryResult = {
  rows: InventoryItemSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type InventoryMonitoringSummary = {
  lowStock: InventoryItemSummary[];
  staleStock: InventoryItemSummary[];
};

export interface InventoryByCategoryItem {
  id: number;
  sku: string;
  name: string;
  unitPrice: number;
}

function normalizeInventoryRow(raw: any): InventoryItemSummary {
  return {
    id: Number(raw?.id ?? 0),
    sku: String(raw?.sku ?? ""),
    legacyItemCode: raw?.legacyItemCode ?? null,
    legacyIsoCode: raw?.legacyIsoCode ?? null,
    name: String(raw?.name ?? ""),
    description: raw?.description ?? null,
    category:
      typeof raw?.category === "string"
        ? raw.category
        : // Legacy snapshots may still have a nested object — fall back to its name.
          (raw?.category?.name ?? null),
    inventoryType: (raw?.inventoryType ?? "SALEABLE") as InventoryType,
    lifecycleStatus: (raw?.lifecycleStatus ?? "ACTIVE") as InventoryLifecycleStatus,
    unitOfMeasurement: raw?.unitOfMeasurement ?? null,
    reorderPoint: Number(raw?.reorderPoint ?? 0),
    safetyStock: Number(raw?.safetyStock ?? 0),
    reorderCycleDays: Number(raw?.reorderCycleDays ?? 30),
    isActive: Boolean(raw?.isActive ?? true),
    onHandQty: Number(raw?.onHandQty ?? 0),
    reservedQty: Number(raw?.reservedQty ?? 0),
    availableQty: Number(raw?.availableQty ?? 0),
    onOrderQty: Number(raw?.onOrderQty ?? 0),
    weightedAverageCost: Number(raw?.weightedAverageCost ?? 0),
    unitPrice: Number(raw?.unitPrice ?? 0),
    defaultQuantity:
      raw?.defaultQuantity == null ? null : Number(raw.defaultQuantity),
  };
}

function normalizeInventoryPaginated(result: unknown): PaginatedInventoryResult {
  if (result && typeof result === "object" && "data" in result && "meta" in result) {
    const r = result as {
      data: unknown[];
      meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    };
    return {
      rows: Array.isArray(r.data) ? r.data.map(normalizeInventoryRow) : [],
      total: Number(r.meta?.total ?? 0),
      page: Number(r.meta?.page ?? 1),
      limit: Number(r.meta?.limit ?? 10),
      totalPages: Number(r.meta?.totalPages ?? 1),
    };
  }

  const normalized = normalizePaginatedResult<unknown>(result);
  return {
    rows: normalized.rows.map(normalizeInventoryRow),
    total: normalized.total,
    page: normalized.page,
    limit: normalized.limit,
    totalPages: Math.max(1, Math.ceil(normalized.total / (normalized.limit || 10))),
  };
}

function normalizeProgramKitRow(raw: any): ProgramKitItemSummary {
  const summary = normalizeInventoryRow(raw);
  return {
    ...summary,
    programKitId: Number(raw?.programKitId ?? 0),
    programId: Number(raw?.programId ?? 0),
    inventoryId: Number(raw?.inventoryId ?? summary.id ?? 0),
    defaultQuantity: Number(raw?.defaultQuantity ?? 1),
    inventoryIsActive: Boolean(raw?.inventoryIsActive ?? summary.isActive ?? true),
    isActive: Boolean(raw?.isActive ?? true),
    selected: raw?.selected == null ? undefined : Boolean(raw.selected),
  };
}

function normalizeFranchiseProgramKitRow(raw: any): FranchiseProgramKitItemSummary {
  const base = normalizeProgramKitRow(raw);
  return {
    ...base,
    quantity: Number(raw?.quantity ?? raw?.defaultQuantity ?? 1),
    selected: Boolean(raw?.selected ?? false),
  };
}

// Categories are now a hardcoded enum (see `@/lib/inventory-categories`).
// Use `INVENTORY_CATEGORIES` directly for dropdowns; no server round-trip needed.

export async function getAllInventory(): Promise<InventoryItemSummary[]> {
  const response = await api.get("/inventory");
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data) ? data.map(normalizeInventoryRow) : [];
}

export async function getPaginatedInventory(params: {
  page?: number;
  limit?: number;
  search?: string;
  programId?: number;
  levelId?: number;
  status?: string;
  category?: string;
  lowStock?: boolean;
  sortBy?: string;
  sortOrder?: string;
  /** Super-admin region view: scope to this warehouse location. */
  regionLocationId?: number;
}): Promise<PaginatedInventoryResult> {
  const response = await api.get("/inventory/paginated", {
    params: compactRequestParams(
      params as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  return normalizeInventoryPaginated(unwrapData<unknown>(response));
}

export async function createInventory(
  body: CreateInventoryDto,
): Promise<InventoryItemSummary> {
  const response = await api.post("/inventory", body);
  return normalizeInventoryRow(unwrapData(response));
}

export async function updateInventory(
  id: number,
  body: UpdateInventoryDto,
): Promise<InventoryItemSummary> {
  const response = await api.patch(`/inventory/update/${id}`, body);
  return normalizeInventoryRow(unwrapData(response));
}

export async function deleteInventory(id: number): Promise<unknown> {
  const response = await api.delete(`/inventory/${id}`);
  return unwrapData(response);
}

export async function getInventoryItemsForLevel(
  levelId: number,
): Promise<InventoryItemSummary[]> {
  const response = await api.get(`/inventory/level/${levelId}/items`);
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data) ? data.map(normalizeInventoryRow) : [];
}

export async function getInventoryItemsForTrainingLevel(
  trainingLevelId: number,
): Promise<InventoryItemSummary[]> {
  const response = await api.get(
    `/inventory/training-level/${trainingLevelId}/items`,
  );
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data) ? data.map(normalizeInventoryRow) : [];
}

export async function getKitCatalogItems(): Promise<InventoryItemSummary[]> {
  const response = await api.get("/inventory/kit-items");
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data) ? data.map(normalizeInventoryRow) : [];
}

export async function getTshirtInventory(
  categoryName: string,
): Promise<InventoryByCategoryItem[]> {
  const response = await api.get("/inventory/by-category", {
    params: { name: categoryName },
  });
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data)
    ? data.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: Number(r?.id ?? 0),
          sku: String(r?.sku ?? ""),
          name: String(r?.name ?? ""),
          unitPrice: Number(r?.unitPrice ?? 0),
        };
      })
    : [];
}

/**
 * T-shirt options scoped to the program-kit items the admin configured for the
 * franchise's agreement on this program (not the global T-Shirts category).
 */
export async function getMyAgreementTshirts(
  programId: number,
): Promise<InventoryByCategoryItem[]> {
  const response = await api.get(
    `/inventory/programs/${programId}/agreement-tshirts`,
  );
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data)
    ? data.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: Number(r?.id ?? 0),
          sku: String(r?.sku ?? ""),
          name: String(r?.name ?? ""),
          unitPrice: Number(r?.unitPrice ?? 0),
        };
      })
    : [];
}

export async function getProgramKitItems(
  programId: number,
): Promise<ProgramKitItemSummary[]> {
  const response = await api.get(`/inventory/program/${programId}/kit-items`);
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data) ? data.map(normalizeProgramKitRow) : [];
}

async function assignInventoryToProgramKit(
  programId: number,
  inventoryId: number,
  defaultQuantity?: number,
): Promise<ProgramKitItemSummary> {
  const response = await api.post(`/inventory/program/${programId}/kit-items/assign`, {
    inventoryId,
    ...(defaultQuantity !== undefined ? { defaultQuantity } : {}),
  });
  return normalizeProgramKitRow(unwrapData(response));
}

async function bulkAssignInventory(
  url: string,
  items: Array<{ inventoryId: number; quantity?: number }>,
): Promise<{ assigned: number; failed: number[] }> {
  const response = await api.post(url, {
    items: items.map((item) => ({
      inventoryId: item.inventoryId,
      ...(item.quantity !== undefined ? { defaultQuantity: item.quantity } : {}),
    })),
  });
  return unwrapData(response) as { assigned: number; failed: number[] };
}

export async function bulkAssignInventoryToProgramKit(
  programId: number,
  items: Array<{ inventoryId: number; quantity?: number }>,
): Promise<{ assigned: number; failed: number[] }> {
  return bulkAssignInventory(
    `/inventory/program/${programId}/kit-items/bulk-assign`,
    items,
  );
}

export async function updateProgramKitItem(
  programId: number,
  programKitId: number,
  body: { defaultQuantity?: number; isActive?: boolean },
): Promise<ProgramKitItemSummary> {
  const response = await api.patch(
    `/inventory/program/${programId}/kit-items/${programKitId}`,
    body,
  );
  return normalizeProgramKitRow(unwrapData(response));
}

export async function removeInventoryFromProgramKit(
  programId: number,
  programKitId: number,
): Promise<void> {
  await api.delete(`/inventory/program/${programId}/kit-items/${programKitId}`);
}

async function assignInventoryToLevel(
  levelId: number,
  inventoryId: number,
  defaultQuantity?: number,
): Promise<void> {
  await api.post(`/inventory/level/${levelId}/items/assign`, {
    inventoryId,
    ...(defaultQuantity !== undefined ? { defaultQuantity } : {}),
  });
}

export async function bulkAssignInventoryToLevel(
  levelId: number,
  items: Array<{ inventoryId: number; quantity?: number }>,
): Promise<{ assigned: number; failed: number[] }> {
  return bulkAssignInventory(`/inventory/level/${levelId}/items/bulk-assign`, items);
}

export async function unassignInventoryFromLevel(
  levelId: number,
  inventoryId: number,
): Promise<void> {
  await api.delete(`/inventory/level/${levelId}/items/${inventoryId}`);
}

async function assignInventoryToTrainingLevel(
  trainingLevelId: number,
  inventoryId: number,
  defaultQuantity?: number,
): Promise<void> {
  await api.post(`/inventory/training-level/${trainingLevelId}/items/assign`, {
    inventoryId,
    ...(defaultQuantity !== undefined ? { defaultQuantity } : {}),
  });
}

export async function bulkAssignInventoryToTrainingLevel(
  trainingLevelId: number,
  items: Array<{ inventoryId: number; quantity?: number }>,
): Promise<{ assigned: number; failed: number[] }> {
  return bulkAssignInventory(
    `/inventory/training-level/${trainingLevelId}/items/bulk-assign`,
    items,
  );
}

export async function unassignInventoryFromTrainingLevel(
  trainingLevelId: number,
  inventoryId: number,
): Promise<void> {
  await api.delete(
    `/inventory/training-level/${trainingLevelId}/items/${inventoryId}`,
  );
}

export type StockAdjustmentInput = {
  inventoryItemId: number;
  /** Positive to add stock, negative to remove. Must not be zero. */
  deltaQty: number;
  /** Required free-text reason (e.g. "physical recount", "damaged in storage"). */
  reason: string;
  /**
   * Optional. Only honored for positive adjustments. When omitted, the
   * weighted-average cost is preserved (pure quantity add).
   */
  unitCost?: number;
  /** Optional. Defaults to location 1 on the backend. */
  locationId?: number;
};

export type StockAdjustmentResult = {
  stockAdjustmentId: number;
};

/**
 * Post a manual stock adjustment. Positive deltas trigger the same FIFO
 * backorder fulfillment that runs after a PO receipt. Negative deltas
 * only reduce stock and never affect orders. Backend rejects negative
 * deltas that would push onHandQty below zero.
 */
export async function adjustInventoryStock(
  input: StockAdjustmentInput,
): Promise<StockAdjustmentResult> {
  const response = await api.post("/inventory/stock-adjustments", {
    inventoryItemId: input.inventoryItemId,
    deltaQty: input.deltaQty,
    reason: input.reason.trim(),
    ...(input.unitCost !== undefined ? { unitCost: input.unitCost } : {}),
    ...(input.locationId !== undefined ? { locationId: input.locationId } : {}),
  });
  const data = unwrapData<any>(response);
  return {
    stockAdjustmentId: Number(data?.stockAdjustmentId ?? 0),
  };
}

export async function getInventoryMonitoring(
  regionLocationId?: number,
): Promise<InventoryMonitoringSummary> {
  const response = await api.get("/inventory/monitoring", {
    params: compactRequestParams({ regionLocationId }),
  });
  const data = unwrapData<any>(response);
  return {
    lowStock: Array.isArray(data?.lowStock)
      ? data.lowStock.map(normalizeInventoryRow)
      : [],
    staleStock: Array.isArray(data?.staleStock)
      ? data.staleStock.map(normalizeInventoryRow)
      : [],
  };
}

async function getFranchiseProgramKitItems(
  franchiseId: string,
  programId: number,
): Promise<FranchiseProgramKitItemSummary[]> {
  const response = await api.get(
    `/inventory/franchise/${franchiseId}/program/${programId}/kit-items`,
  );
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data) ? data.map(normalizeFranchiseProgramKitRow) : [];
}

export async function setFranchiseProgramKitItems(
  franchiseId: string,
  programId: number,
  items: { programKitId: number; quantity: number }[],
): Promise<FranchiseProgramKitItemSummary[]> {
  const response = await api.put(
    `/inventory/franchise/${franchiseId}/program/${programId}/kit-items`,
    { items },
  );
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data) ? data.map(normalizeFranchiseProgramKitRow) : [];
}

export async function getAgreementProgramKitItems(
  agreementId: number,
): Promise<FranchiseProgramKitItemSummary[]> {
  const response = await api.get(`/inventory/agreement/${agreementId}/kit-items`);
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data) ? data.map(normalizeFranchiseProgramKitRow) : [];
}

export async function setAgreementProgramKitItems(
  agreementId: number,
  items: { programKitId: number; quantity: number }[],
): Promise<FranchiseProgramKitItemSummary[]> {
  const response = await api.put(`/inventory/agreement/${agreementId}/kit-items`, {
    items,
  });
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data) ? data.map(normalizeFranchiseProgramKitRow) : [];
}

// ---------------------------------------------------------------------------
// Franchise kit (global template + per-franchise selections)
// ---------------------------------------------------------------------------

export type FranchiseKitTemplateItem = {
  franchiseKitItemId: number;
  programId: number;
  inventoryId: number;
  name: string;
  sku: string | null;
  category: string | null;
  unitPrice: number;
  inventoryIsActive: boolean;
  defaultQuantity: number;
  isActive: boolean;
};

export type FranchiseKitSelectionItem = FranchiseKitTemplateItem & {
  selected: boolean;
  quantity: number;
  unitPriceOverride: number | null;
  effectiveUnitPrice: number;
};

function normalizeFranchiseKitTemplateRow(row: unknown): FranchiseKitTemplateItem {
  const r = row as Record<string, unknown>;
  return {
    franchiseKitItemId: Number(r?.franchiseKitItemId ?? 0),
    programId: Number(r?.programId ?? 0),
    inventoryId: Number(r?.inventoryId ?? 0),
    name: String(r?.name ?? ""),
    sku: r?.sku != null ? String(r.sku) : null,
    category: r?.category != null ? String(r.category) : null,
    unitPrice: Number(r?.unitPrice ?? 0),
    inventoryIsActive: Boolean(r?.inventoryIsActive ?? true),
    defaultQuantity: Number(r?.defaultQuantity ?? 1),
    isActive: Boolean(r?.isActive ?? true),
  };
}

function normalizeFranchiseKitSelectionRow(row: unknown): FranchiseKitSelectionItem {
  const r = row as Record<string, unknown>;
  return {
    ...normalizeFranchiseKitTemplateRow(row),
    selected: Boolean(r?.selected ?? false),
    quantity: Number(r?.quantity ?? 1),
    unitPriceOverride:
      r?.unitPriceOverride != null ? Number(r.unitPriceOverride) : null,
    effectiveUnitPrice: Number(r?.effectiveUnitPrice ?? r?.unitPrice ?? 0),
  };
}

export async function getFranchiseKitTemplateItems(
  programId: number,
): Promise<FranchiseKitTemplateItem[]> {
  const response = await api.get(
    `/inventory/programs/${programId}/franchise-kit/items`,
  );
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data) ? data.map(normalizeFranchiseKitTemplateRow) : [];
}

export async function bulkAssignFranchiseKitTemplateItems(
  programId: number,
  items: Array<{ inventoryId: number; quantity?: number }>,
): Promise<{ assigned: number; failed: number[] }> {
  const response = await api.post(
    `/inventory/programs/${programId}/franchise-kit/items/bulk-assign`,
    {
      items: items.map((item) => ({
        inventoryId: item.inventoryId,
        ...(item.quantity !== undefined
          ? { defaultQuantity: item.quantity }
          : {}),
      })),
    },
  );
  return unwrapData(response) as { assigned: number; failed: number[] };
}

export async function updateFranchiseKitTemplateItem(
  franchiseKitItemId: number,
  body: { defaultQuantity?: number; isActive?: boolean },
): Promise<FranchiseKitTemplateItem> {
  const response = await api.patch(
    `/inventory/franchise-kit/items/${franchiseKitItemId}`,
    body,
  );
  return normalizeFranchiseKitTemplateRow(unwrapData(response));
}

export async function removeFranchiseKitTemplateItem(
  franchiseKitItemId: number,
): Promise<void> {
  await api.delete(`/inventory/franchise-kit/items/${franchiseKitItemId}`);
}

/** Admin: a franchise's kit selections for a program (seeded on first read). */
export async function getFranchiseKit(
  franchiseId: string,
  programId: number,
): Promise<FranchiseKitSelectionItem[]> {
  const response = await api.get(
    `/inventory/programs/${programId}/franchise/${franchiseId}/franchise-kit`,
  );
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data) ? data.map(normalizeFranchiseKitSelectionRow) : [];
}

/** Admin: replace a franchise's kit selections for a program (qty + optional price override). */
export async function setFranchiseKit(
  franchiseId: string,
  programId: number,
  items: Array<{
    franchiseKitItemId: number;
    quantity: number;
    unitPriceOverride?: number | null;
  }>,
): Promise<FranchiseKitSelectionItem[]> {
  const response = await api.put(
    `/inventory/programs/${programId}/franchise/${franchiseId}/franchise-kit`,
    { items },
  );
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data) ? data.map(normalizeFranchiseKitSelectionRow) : [];
}

/** Franchisee: own franchise kit for a program with effective prices. */
export async function getMyFranchiseKit(
  programId: number,
): Promise<FranchiseKitSelectionItem[]> {
  const response = await api.get(
    `/inventory/programs/${programId}/franchise-kit`,
  );
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data) ? data.map(normalizeFranchiseKitSelectionRow) : [];
}
