import type {
  CreateInventoryDto,
  InventoryItemSummary,
  InventoryLifecycleStatus,
  InventoryType,
} from "@/services/inventory.service";
import type { InventoryCategoryName } from "@/lib/inventory-categories";

export type InventoryFormState = {
  name: string;
  description: string;
  categoryName: string;
  legacyItemCode: string;
  legacyIsoCode: string;
  inventoryType: InventoryType;
  lifecycleStatus: InventoryLifecycleStatus;
  unitOfMeasurement: string;
  reorderPoint: number;
  safetyStock: number;
  reorderCycleDays: number;
  isActive: boolean;
  unitPrice: number;
};

export type AdjustmentDirection = "INCREASE" | "DECREASE";

export type AdjustmentFormState = {
  direction: AdjustmentDirection;
  quantity: string;
  reason: string;
  unitCost: string;
};

export const EMPTY_ADJUSTMENT: AdjustmentFormState = {
  direction: "INCREASE",
  quantity: "",
  reason: "",
  unitCost: "",
};

export const EMPTY_FORM: InventoryFormState = {
  name: "",
  description: "",
  categoryName: "",
  legacyItemCode: "",
  legacyIsoCode: "",
  inventoryType: "SALEABLE",
  lifecycleStatus: "ACTIVE",
  unitOfMeasurement: "Numbers",
  reorderPoint: 0,
  safetyStock: 0,
  reorderCycleDays: 30,
  isActive: true,
  unitPrice: 0,
};

export const INVENTORY_TYPES: InventoryType[] = [
  "SALEABLE",
  "PACKAGING",
  "MARKETING",
  "ADMIN_CONSUMABLE",
];

export const LIFECYCLE_STATUSES: InventoryLifecycleStatus[] = [
  "ACTIVE",
  "OBSOLETE",
  "DISCONTINUED",
];

/**
 * Maps the inventory form state to the API payload for create/update.
 */
export function mapInventoryFormToPayload(
  data: InventoryFormState,
  category: InventoryCategoryName | undefined,
): CreateInventoryDto {
  return {
    name: data.name.trim(),
    description: data.description.trim() || undefined,
    category,
    legacyItemCode: data.legacyItemCode.trim() || undefined,
    legacyIsoCode: data.legacyIsoCode.trim() || undefined,
    inventoryType: data.inventoryType,
    lifecycleStatus: data.lifecycleStatus,
    unitOfMeasurement: data.unitOfMeasurement.trim() || undefined,
    reorderPoint: Number(data.reorderPoint || 0),
    safetyStock: Number(data.safetyStock || 0),
    reorderCycleDays: Math.max(1, Number(data.reorderCycleDays || 30)),
    isActive: data.isActive,
    unitPrice: Math.max(0, Number(data.unitPrice || 0)),
  };
}

/**
 * Maps an inventory item summary to the pre-filled edit form state.
 */
export function mapItemToEditForm(item: InventoryItemSummary): InventoryFormState {
  return {
    name: item.name,
    description: item.description ?? "",
    categoryName: item.category ?? "",
    legacyItemCode: item.legacyItemCode ?? "",
    legacyIsoCode: item.legacyIsoCode ?? "",
    inventoryType: item.inventoryType,
    lifecycleStatus: item.lifecycleStatus,
    unitOfMeasurement: item.unitOfMeasurement ?? "Numbers",
    reorderPoint: item.reorderPoint,
    safetyStock: item.safetyStock,
    reorderCycleDays: item.reorderCycleDays,
    isActive: item.isActive,
    unitPrice: item.unitPrice ?? 0,
  };
}

export type AdjustmentPreviewResult = {
  error: string | null;
  deltaQty: number;
  projected: number;
};

/**
 * Pure function: derives the adjustment preview (projected qty + validation
 * error) from the current form state and the item being adjusted.
 */
export function deriveAdjustmentPreview(
  adjustingItem: InventoryItemSummary | null,
  adjustForm: AdjustmentFormState,
): AdjustmentPreviewResult {
  if (!adjustingItem) {
    return { error: null, deltaQty: 0, projected: 0 };
  }
  const trimmedQty = adjustForm.quantity.trim();
  const trimmedReason = adjustForm.reason.trim();
  const trimmedCost = adjustForm.unitCost.trim();

  const qtyNum = trimmedQty === "" ? NaN : Number(trimmedQty);
  if (!Number.isFinite(qtyNum) || !Number.isInteger(qtyNum) || qtyNum <= 0) {
    return {
      error: trimmedQty === "" ? null : "Quantity must be a positive whole number.",
      deltaQty: 0,
      projected: adjustingItem.onHandQty,
    };
  }

  const deltaQty = adjustForm.direction === "INCREASE" ? qtyNum : -qtyNum;
  const projected = adjustingItem.onHandQty + deltaQty;

  if (projected < 0) {
    return {
      error: `Cannot remove ${qtyNum} — only ${adjustingItem.onHandQty} on hand.`,
      deltaQty,
      projected,
    };
  }

  if (!trimmedReason) {
    return { error: null, deltaQty, projected };
  }

  if (trimmedCost && adjustForm.direction === "INCREASE") {
    const costNum = Number(trimmedCost);
    if (!Number.isFinite(costNum) || costNum < 0) {
      return { error: "Unit cost must be zero or positive.", deltaQty, projected };
    }
  }

  return { error: null, deltaQty, projected };
}
