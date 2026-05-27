import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import type { DataTableFilter } from "@/components/shared";
import type { Supplier, SupplierItemTerm } from "@/services/procurement.service";

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

export type ProcurementSubTab =
  | "suppliers-sourcing"
  | "purchase-orders"
  | "receipts"
  | "replenishment";

export type SupplierFormState = {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  gstin: string;
  isActive: boolean;
};

export type PurchaseOrderFormState = {
  supplierId: number | "";
  referenceNo: string;
  expectedDeliveryAt: string;
  notes: string;
};

export type ReceiptRow = {
  id: string;
  receiptId: number;
  purchaseOrderId: number;
  supplierId: number;
  supplierName: string;
  createdAt?: string | null;
  lineCount: number;
  totalReceived: number;
  totalRejected: number;
  linePreview: string;
};

export type ReceiptPoLineSnapshot = {
  inventoryItemId: number;
  orderedQty: number;
  priorReceivedQty: number;
  unitCost: number;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const INITIAL_SUPPLIER_FORM: SupplierFormState = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  city: "",
  gstin: "",
  isActive: true,
};

export const ITEMS_PER_PAGE = 10;
export const ALL_SUPPLIERS_LIMIT = 10_000;

export function createPurchaseOrderForm(): PurchaseOrderFormState {
  return {
    supplierId: "",
    referenceNo: "",
    expectedDeliveryAt: "",
    notes: "",
  };
}

export const PURCHASE_ORDER_STATUS_OPTIONS: DataTableFilter["options"] = [
  { value: "all", label: "All statuses" },
  ...[
    "DRAFT",
    "CONFIRMED",
    "PARTIALLY_RECEIVED",
    "RECEIVED",
    "CANCELLED",
  ].map((status) => ({
    value: status,
    label: formatStatusLabel(status),
  })),
];

// ---------------------------------------------------------------------------
// Pure utility functions
// ---------------------------------------------------------------------------

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatStatusLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function statusBadge(status: string): ReactNode {
  return <Badge variant="secondary">{formatStatusLabel(status)}</Badge>;
}

export function booleanBadge(
  active: boolean,
  trueLabel: string,
  falseLabel: string,
): ReactNode {
  return active ? (
    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
      {trueLabel}
    </Badge>
  ) : (
    <Badge variant="outline">{falseLabel}</Badge>
  );
}

export function toOptionalSearch(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function toOptionalNumberFilter(value: string) {
  return value === "all" ? undefined : Number(value);
}

export function toOptionalPreferredFilter(value: string) {
  if (value === "preferred") return true;
  if (value === "not-preferred") return false;
  return undefined;
}

export function suggestPurchaseOrderQuantity(
  requestedQty: number,
  term?: Pick<SupplierItemTerm, "moq" | "casePack"> | null,
) {
  let quantity = Math.max(1, Math.ceil(requestedQty || 1));
  if (!term) return quantity;

  if (term.moq > 0) {
    quantity = Math.max(quantity, term.moq);
  }

  if (term.casePack > 0) {
    quantity = Math.ceil(quantity / term.casePack) * term.casePack;
  }

  return quantity;
}

export function buildExpectedDeliveryDate(leadTimeDays: number) {
  if (leadTimeDays <= 0) return "";
  const date = new Date();
  date.setDate(date.getDate() + leadTimeDays);
  return date.toISOString().slice(0, 10);
}

export function filterOptionsFromSuppliers(suppliers: Supplier[]) {
  return [
    { value: "all", label: "All suppliers" },
    ...suppliers
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((supplier) => ({
        value: String(supplier.id),
        label: supplier.name,
      })),
  ];
}

// ---------------------------------------------------------------------------
// DateToolbarField helper component
// ---------------------------------------------------------------------------

export function DateToolbarField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <DateInput
        value={value}
        onChange={(v) => onChange(v)}
        className="w-full min-w-[170px] sm:w-[170px]"
      />
    </div>
  );
}
