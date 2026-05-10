import { api } from "@/lib/axios";
import {
  compactRequestParams,
  normalizePaginatedResult,
  unwrapData,
} from "@/lib/unwrap-api";

export type InventoryLifecycleStatus =
  | "ACTIVE"
  | "OBSOLETE"
  | "DISCONTINUED";
export type InventoryType =
  | "SALEABLE"
  | "PACKAGING"
  | "MARKETING"
  | "ADMIN_CONSUMABLE";

export type InventoryCategory = {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
};

export type InventoryItemSummary = {
  id: number;
  sku: string;
  legacyItemCode?: string | null;
  legacyIsoCode?: string | null;
  name: string;
  description?: string | null;
  categoryId?: number | null;
  category?: InventoryCategory | null;
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
  categoryId?: number;
  inventoryType: InventoryType;
  lifecycleStatus: InventoryLifecycleStatus;
  unitOfMeasurement?: string;
  reorderPoint: number;
  safetyStock: number;
  reorderCycleDays: number;
  isActive: boolean;
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

function normalizeInventoryRow(raw: any): InventoryItemSummary {
  return {
    id: Number(raw?.id ?? 0),
    sku: String(raw?.sku ?? ""),
    legacyItemCode: raw?.legacyItemCode ?? null,
    legacyIsoCode: raw?.legacyIsoCode ?? null,
    name: String(raw?.name ?? ""),
    description: raw?.description ?? null,
    categoryId: raw?.categoryId ?? null,
    category: raw?.category
      ? {
          id: Number(raw.category.id ?? 0),
          name: String(raw.category.name ?? ""),
          description: raw.category.description ?? "",
          isActive: Boolean(raw.category.isActive ?? true),
        }
      : null,
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

export async function getInventoryCategories(): Promise<InventoryCategory[]> {
  const response = await api.get("/inventory-category");
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data)
    ? data.map((row) => ({
        id: Number((row as any)?.id ?? 0),
        name: String((row as any)?.name ?? ""),
        description: (row as any)?.description ?? "",
        isActive: Boolean((row as any)?.isActive ?? true),
      }))
    : [];
}

export async function createInventoryCategory(body: {
  name: string;
  description?: string;
  isActive?: boolean;
}): Promise<InventoryCategory> {
  const response = await api.post("/inventory-category", {
    name: body.name.trim(),
    description: body.description ?? "",
    isActive: body.isActive ?? true,
  });
  const row = unwrapData<any>(response);
  return {
    id: Number(row?.id ?? 0),
    name: String(row?.name ?? ""),
    description: row?.description ?? "",
    isActive: Boolean(row?.isActive ?? true),
  };
}

export async function resolveInventoryCategoryId(rawName: string): Promise<number> {
  const name = rawName.trim();
  if (!name) {
    throw new Error("Category name is required");
  }
  const lower = name.toLowerCase();
  const list = await getInventoryCategories();
  const found = list.find((c) => c.name.trim().toLowerCase() === lower);
  if (found) return found.id;
  const created = await createInventoryCategory({
    name,
    description: "",
    isActive: true,
  });
  return created.id;
}

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
  sortBy?: string;
  sortOrder?: string;
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

export async function getProgramKitItems(
  programId: number,
): Promise<ProgramKitItemSummary[]> {
  const response = await api.get(`/inventory/program/${programId}/kit-items`);
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data) ? data.map(normalizeProgramKitRow) : [];
}

export async function assignInventoryToProgramKit(
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

export async function bulkAssignInventoryToProgramKit(
  programId: number,
  items: Array<{ inventoryId: number; quantity?: number }>,
): Promise<{ assigned: number; failed: number[] }> {
  const response = await api.post(
    `/inventory/program/${programId}/kit-items/bulk-assign`,
    {
      items: items.map((item) => ({
        inventoryId: item.inventoryId,
        ...(item.quantity !== undefined ? { defaultQuantity: item.quantity } : {}),
      })),
    },
  );
  return unwrapData(response) as { assigned: number; failed: number[] };
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

export async function assignInventoryToLevel(
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
  const response = await api.post(
    `/inventory/level/${levelId}/items/bulk-assign`,
    {
      items: items.map((item) => ({
        inventoryId: item.inventoryId,
        ...(item.quantity !== undefined ? { defaultQuantity: item.quantity } : {}),
      })),
    },
  );
  return unwrapData(response) as { assigned: number; failed: number[] };
}

export async function unassignInventoryFromLevel(
  levelId: number,
  inventoryId: number,
): Promise<void> {
  await api.delete(`/inventory/level/${levelId}/items/${inventoryId}`);
}

export async function assignInventoryToTrainingLevel(
  trainingLevelId: number,
  inventoryId: number,
  defaultQuantity?: number,
): Promise<void> {
  await api.post(`/inventory/training-level/${trainingLevelId}/items/assign`, {
    inventoryId,
    ...(defaultQuantity !== undefined ? { defaultQuantity } : {}),
  });
}

export async function unassignInventoryFromTrainingLevel(
  trainingLevelId: number,
  inventoryId: number,
): Promise<void> {
  await api.delete(
    `/inventory/training-level/${trainingLevelId}/items/${inventoryId}`,
  );
}

export async function getInventoryMonitoring(): Promise<InventoryMonitoringSummary> {
  const response = await api.get("/inventory/monitoring");
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

export async function getFranchiseProgramKitItems(
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
