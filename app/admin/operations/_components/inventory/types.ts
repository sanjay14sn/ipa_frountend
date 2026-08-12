import type {
  CreateInventoryDto,
  InventoryItemSummary,
  InventoryLifecycleStatus,
  InventoryType,
  StockAdjustmentReasonType,
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
  /** StockAdjustmentReasonType value; empty until the admin picks one. */
  reasonType: string;
  /** Free-text details; required when reasonType is OTHER. */
  reason: string;
  unitCost: string;
};

export const EMPTY_ADJUSTMENT: AdjustmentFormState = {
  direction: "INCREASE",
  quantity: "",
  reasonType: "",
  reason: "",
  unitCost: "",
};

export type AdjustmentReasonOption = {
  value: StockAdjustmentReasonType;
  label: string;
  /** Which adjustment direction(s) this reason is valid for. */
  direction: AdjustmentDirection | "BOTH";
};

/** Mirrors the backend's StockAdjustmentReasonType + its direction rules. */
export const ADJUSTMENT_REASON_OPTIONS: AdjustmentReasonOption[] = [
  { value: "CYCLE_COUNT_CORRECTION", label: "Cycle count correction", direction: "BOTH" },
  { value: "DATA_ENTRY_CORRECTION", label: "Data entry correction", direction: "BOTH" },
  { value: "OPENING_STOCK", label: "Opening stock", direction: "INCREASE" },
  { value: "PURCHASE_WITHOUT_PO", label: "Purchase without PO", direction: "INCREASE" },
  { value: "RETURN_FROM_FRANCHISEE", label: "Return from franchisee", direction: "INCREASE" },
  { value: "DAMAGED", label: "Damaged", direction: "DECREASE" },
  { value: "EXPIRED_OR_OBSOLETE", label: "Expired / obsolete", direction: "DECREASE" },
  { value: "LOST_OR_STOLEN", label: "Lost / stolen", direction: "DECREASE" },
  { value: "RETURN_TO_SUPPLIER", label: "Return to supplier", direction: "DECREASE" },
  { value: "INTERNAL_USE", label: "Internal use", direction: "DECREASE" },
  { value: "SAMPLE_OR_DEMO", label: "Sample / demo", direction: "DECREASE" },
  { value: "OTHER", label: "Other (details required)", direction: "BOTH" },
];

export function reasonOptionsForDirection(
  direction: AdjustmentDirection,
): AdjustmentReasonOption[] {
  return ADJUSTMENT_REASON_OPTIONS.filter(
    (option) => option.direction === "BOTH" || option.direction === direction,
  );
}

/** Quick-fill presets shared by the movement-history and CSV-export dialogs. */
export const MOVEMENT_QUICK_RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
] as const;

/** Local-date ISO (yyyy-MM-dd) — toISOString would shift the day near midnight IST. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** From/To pair for a trailing N-day window ending today. */
export function quickRangeDates(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

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
