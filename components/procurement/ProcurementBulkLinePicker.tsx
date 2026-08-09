"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ToggleField } from "@/components/shared/toggle-field";
import { LinkPicker, type LinkPickerAddProps } from "@/components/shared/dialog/picker/LinkPicker";
import { Label } from "@/components/ui/label";
import type { InventoryItemSummary } from "@/services/inventory.service";
import type {
  PurchaseOrderLineInput,
  SupplierItemTerm,
} from "@/services/procurement.service";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";

export type BulkSourcingLineSubmit = {
  inventoryItemId: number;
  supplierSku?: string;
  isPreferred?: boolean;
  currentUnitCost?: number;
  leadTimeDays?: number;
  moq?: number;
  casePack?: number;
};

type SourcingDraft = {
  supplierSku: string;
  currentUnitCost: number;
  leadTimeDays: number;
  moq: number;
  casePack: number;
  isPreferred: boolean;
};

type PoDraft = {
  orderedQty: number;
  unitCost: number;
};

function suggestPurchaseOrderQuantityFromTerm(
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

type ProcurementBulkLinePickerProps =
  | {
      mode: "sourcing";
      catalogItems: InventoryItemSummary[];
      isCatalogLoading: boolean;
      excludeInventoryIds: Set<number>;
      resetKey: string | number;
      onSubmitSourcing: (lines: BulkSourcingLineSubmit[]) => Promise<void>;
      onSubmitPo?: undefined;
      initialPoLines?: undefined;
      /** Pre-check rows (e.g. deep link from inventory) */
      initialSourcingItemIds?: number[];
      className?: string;
    }
  | {
      mode: "purchase-order";
      catalogItems: InventoryItemSummary[];
      isCatalogLoading: boolean;
      excludeInventoryIds: Set<number>;
      resetKey: string | number;
      onSubmitPo: (lines: PurchaseOrderLineInput[]) => Promise<void>;
      onSubmitSourcing?: undefined;
      initialPoLines?: PurchaseOrderLineInput[];
      /**
       * When set (including `[]`), the scroll list uses these supplier item terms
       * instead of the full inventory catalog. Omit for legacy inventory-only picking.
       */
      supplierTerms?: SupplierItemTerm[];
      /** True while the global supplier-terms query used to populate `supplierTerms` is still loading */
      supplierTermsCatalogLoading?: boolean;
      className?: string;
    };

function defaultSourcingDraft(): SourcingDraft {
  return {
    supplierSku: "",
    currentUnitCost: 0,
    leadTimeDays: 0,
    moq: 0,
    casePack: 0,
    isPreferred: true,
  };
}

function DraftNumberField({
  label,
  value,
  step,
  onValueChange,
}: {
  label: string;
  value: number;
  step?: string;
  onValueChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="w-12 shrink-0">{label}</span>
      <Input
        type="number"
        min={0}
        step={step}
        className="h-7 w-full min-w-0 px-2 text-sm"
        value={value || ""}
        placeholder="0"
        onChange={(e) =>
          onValueChange(e.target.value === "" ? 0 : Number(e.target.value))
        }
      />
    </label>
  );
}

export function ProcurementBulkLinePicker(props: ProcurementBulkLinePickerProps) {
  const {
    mode,
    catalogItems,
    isCatalogLoading,
    excludeInventoryIds,
    resetKey,
    className,
  } = props;

  const usePoTermList =
    mode === "purchase-order" && props.supplierTerms !== undefined;
  const supplierTermsCatalogLoading =
    mode === "purchase-order" && props.supplierTermsCatalogLoading === true;

  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<Record<number, SourcingDraft | PoDraft>>({});
  const [isSaving, setIsSaving] = useState(false);

  const poSeedKey =
    mode === "purchase-order"
      ? JSON.stringify(props.initialPoLines ?? [])
      : "";
  const sourcingSeedKey =
    mode === "sourcing"
      ? JSON.stringify(props.initialSourcingItemIds ?? [])
      : "";

  const excludeKey = useMemo(
    () => [...excludeInventoryIds].sort((a, b) => a - b).join(","),
    [excludeInventoryIds],
  );

  useEffect(() => {
    setSearch("");
    if (mode === "sourcing") {
      let seeds: number[] = [];
      try {
        seeds =
          sourcingSeedKey && sourcingSeedKey !== "[]"
            ? (JSON.parse(sourcingSeedKey) as number[])
            : [];
      } catch {
        seeds = [];
      }
      const filteredSeeds = seeds.filter((id) => !excludeInventoryIds.has(id));
      if (filteredSeeds.length) {
        const next: Record<number, SourcingDraft> = {};
        for (const id of filteredSeeds) {
          next[id] = defaultSourcingDraft();
        }
        setPending(next);
      } else {
        setPending({});
      }
      return;
    }
    let initialLines: PurchaseOrderLineInput[] = [];
    try {
      initialLines =
        poSeedKey && poSeedKey !== "[]"
          ? (JSON.parse(poSeedKey) as PurchaseOrderLineInput[])
          : [];
    } catch {
      initialLines = [];
    }
    if (initialLines.length) {
      const next: Record<number, PoDraft> = {};
      for (const line of initialLines) {
        next[line.inventoryItemId] = {
          orderedQty: Math.max(1, line.orderedQty),
          unitCost: Number(line.unitCost ?? 0),
        };
      }
      setPending(next);
    } else {
      setPending({});
    }
  }, [resetKey, mode, poSeedKey, sourcingSeedKey, excludeKey]);

  const availableCatalog = useMemo(
    () => catalogItems.filter((item) => !excludeInventoryIds.has(item.id)),
    [catalogItems, excludeInventoryIds],
  );

  const availableTerms = useMemo(() => {
    if (mode !== "purchase-order") {
      return [] as SupplierItemTerm[];
    }
    if (props.supplierTerms === undefined) {
      return [] as SupplierItemTerm[];
    }
    return props.supplierTerms.filter(
      (t) => !excludeInventoryIds.has(t.inventoryItemId),
    );
  }, [
    mode,
    excludeInventoryIds,
    mode === "purchase-order" ? props.supplierTerms : undefined,
  ]);

  const filteredCatalog = useMemo(() => {
    if (!search.trim()) return availableCatalog;
    const q = search.toLowerCase();
    return availableCatalog.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.sku ?? "").toLowerCase().includes(q) ||
        (item.category ?? "").toLowerCase().includes(q),
    );
  }, [availableCatalog, search]);

  const filteredTerms = useMemo(() => {
    if (!search.trim()) return availableTerms;
    const q = search.toLowerCase();
    return availableTerms.filter((term) => {
      const item = catalogItems.find((c) => c.id === term.inventoryItemId);
      const name = (term.inventoryItem?.name ?? item?.name ?? "").toLowerCase();
      const sku = (item?.sku ?? term.inventoryItem?.sku ?? "").toLowerCase();
      const supSku = (term.supplierSku ?? "").toLowerCase();
      const preferred = term.isPreferred ? "preferred" : "";
      return (
        name.includes(q) ||
        sku.includes(q) ||
        supSku.includes(q) ||
        preferred.includes(q)
      );
    });
  }, [availableTerms, search, catalogItems]);

  const pendingCount = Object.keys(pending).length;
  const isDirty = pendingCount > 0;

  function toggleItem(id: number) {
    setPending((prev) => {
      if (id in prev) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      if (mode === "sourcing") {
        return { ...prev, [id]: defaultSourcingDraft() };
      }
      if (mode === "purchase-order" && props.supplierTerms !== undefined) {
        const term = props.supplierTerms.find((t) => t.inventoryItemId === id);
        return {
          ...prev,
          [id]: {
            orderedQty: suggestPurchaseOrderQuantityFromTerm(1, term ?? null),
            unitCost: Number(term?.currentUnitCost ?? 0),
          },
        };
      }
      return {
        ...prev,
        [id]: {
          orderedQty: 0,
          unitCost: 0,
        },
      };
    });
  }

  function patchDraft(id: number, patch: Partial<SourcingDraft & PoDraft>) {
    setPending((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, ...patch } };
    });
  }

  async function handleSave() {
    if (!isDirty) return;
    setIsSaving(true);
    try {
      if (mode === "sourcing") {
        const lines: BulkSourcingLineSubmit[] = Object.entries(pending).map(
          ([idStr, draft]) => {
            const d = draft as SourcingDraft;
            return {
              inventoryItemId: Number(idStr),
              supplierSku: d.supplierSku.trim() || undefined,
              isPreferred: d.isPreferred,
              currentUnitCost: d.currentUnitCost,
              leadTimeDays: d.leadTimeDays,
              moq: d.moq,
              casePack: d.casePack,
            };
          },
        );
        await props.onSubmitSourcing(lines);
      } else {
        const lines: PurchaseOrderLineInput[] = Object.entries(pending).map(
          ([idStr, draft]) => {
            const d = draft as PoDraft;
            return {
              inventoryItemId: Number(idStr),
              orderedQty: Math.max(1, Math.floor(d.orderedQty) || 1),
              unitCost: Number(d.unitCost ?? 0),
            };
          },
        );
        await props.onSubmitPo(lines);
      }
      setPending({});
      setSearch("");
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const renderPendingRows = () => (
    <div className="space-y-1.5">
      {Object.entries(pending).map(([idStr, draft]) => {
            const id = Number(idStr);
            const item = catalogItems.find((c) => c.id === id);
            const poTerm =
              mode === "purchase-order" && props.supplierTerms !== undefined
                ? props.supplierTerms.find((t) => t.inventoryItemId === id)
                : undefined;
            const displayName =
              poTerm?.inventoryItem?.name ?? item?.name ?? item?.sku ?? "Unnamed item";
            const displaySkuLine =
              [item?.sku, poTerm?.supplierSku].filter(Boolean).join(" · ") ||
              poTerm?.inventoryItem?.sku ||
              item?.sku ||
              "";
            if (!item && mode === "sourcing") return null;
            if (mode === "purchase-order" && !item && !poTerm) return null;
            if (mode === "sourcing") {
              const d = draft as SourcingDraft;
              return (
                <div
                  key={id}
                  className="rounded-md border border-border bg-card px-2.5 py-2 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium leading-tight text-card-foreground">
                        {displayName}
                      </div>
                      <div className="truncate text-[11px] leading-tight text-muted-foreground">
                        {displaySkuLine || "—"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleItem(id)}
                      className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      aria-label={`Remove ${displayName}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground col-span-2">
                      <span className="w-12 shrink-0">SKU</span>
                      <Input
                        className="h-7 w-full min-w-0 px-2 text-sm"
                        value={d.supplierSku}
                        onChange={(e) =>
                          patchDraft(id, { supplierSku: e.target.value })
                        }
                      />
                    </label>
                    <DraftNumberField
                      label="Cost"
                      step="0.01"
                      value={d.currentUnitCost}
                      onValueChange={(v) =>
                        patchDraft(id, { currentUnitCost: v })
                      }
                    />
                    <DraftNumberField
                      label="Lead"
                      value={d.leadTimeDays}
                      onValueChange={(v) => patchDraft(id, { leadTimeDays: v })}
                    />
                    <DraftNumberField
                      label="MOQ"
                      value={d.moq}
                      onValueChange={(v) => patchDraft(id, { moq: v })}
                    />
                    <DraftNumberField
                      label="Pack"
                      value={d.casePack}
                      onValueChange={(v) => patchDraft(id, { casePack: v })}
                    />
                  </div>
                  <ToggleField
                    variant="inline"
                    value={d.isPreferred ? "yes" : "no"}
                    onValueChange={(v) =>
                      patchDraft(id, { isPreferred: v === "yes" })
                    }
                    options={[
                      { value: "no", label: "Not preferred" },
                      { value: "yes", label: "Preferred" },
                    ]}
                  />
                </div>
              );
            }
            const d = draft as PoDraft;
            return (
              <div
                key={id}
                className="rounded-md border border-border bg-card px-2.5 py-2 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium leading-tight text-card-foreground">
                      {displayName}
                    </div>
                    <div className="truncate text-[11px] leading-tight text-muted-foreground">
                      {displaySkuLine || "—"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleItem(id)}
                    className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label={`Remove ${displayName}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="w-10 shrink-0">Qty</span>
                    <Input
                      id={`po-qty-${id}`}
                      type="number"
                      min={1}
                      className="h-7 w-full min-w-0 px-2 text-sm"
                      value={d.orderedQty || ""}
                      placeholder="1"
                      onChange={(e) =>
                        patchDraft(id, {
                          orderedQty:
                            e.target.value === ""
                              ? 0
                              : Math.max(
                                  1,
                                  Math.floor(Number(e.target.value)) || 1,
                                ),
                        })
                      }
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="w-10 shrink-0">Cost</span>
                    <Input
                      id={`po-cost-${id}`}
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-7 w-full min-w-0 px-2 text-sm"
                      value={d.unitCost || ""}
                      placeholder="0"
                      onChange={(e) =>
                        patchDraft(id, {
                          unitCost:
                            e.target.value === ""
                              ? 0
                              : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            );
          })}
    </div>
  );

  const renderTermRow = (term: SupplierItemTerm, checked: boolean) => {
    const item = catalogItems.find((c) => c.id === term.inventoryItemId);
    const rowId = term.inventoryItemId;
    const name = term.inventoryItem?.name ?? item?.name ?? item?.sku ?? "Unnamed item";
    return (
      <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
        <Checkbox
          checked={checked}
          onCheckedChange={() => toggleItem(rowId)}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-card-foreground">
            {name}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
            {item?.sku ? <span>{item.sku}</span> : null}
            {term.supplierSku ? <span>Supplier SKU: {term.supplierSku}</span> : null}
          </div>
        </div>
        {checked ? (
          <span
            className="shrink-0 text-[10px] text-muted-foreground sm:text-xs"
            title="Edit in list above"
          >
            Above
          </span>
        ) : term.isPreferred ? (
          <StatusBadge label="Preferred" tone="success" className="shrink-0 text-[10px]" />
        ) : (
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {item?.inventoryType ?? "—"}
          </Badge>
        )}
      </label>
    );
  };

  const renderCatalogRow = (item: InventoryItemSummary, checked: boolean) => (
    <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
      <Checkbox
        checked={checked}
        onCheckedChange={() => toggleItem(item.id)}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-card-foreground">
          {item.name}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          {item.sku ? <span>{item.sku}</span> : null}
          {item.category ? <span>{item.category}</span> : null}
        </div>
      </div>
      {checked ? (
        <span
          className="shrink-0 text-[10px] text-muted-foreground sm:text-xs"
          title="Edit in list above"
        >
          Above
        </span>
      ) : (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {item.inventoryType}
        </Badge>
      )}
    </label>
  );

  const listConfig: LinkPickerAddProps<unknown> = usePoTermList
    ? ({
        items: filteredTerms,
        isLoading: supplierTermsCatalogLoading && availableTerms.length === 0,
        getKey: (term: SupplierItemTerm) => term.id,
        isChecked: (term: SupplierItemTerm) => term.inventoryItemId in pending,
        onToggle: (term: SupplierItemTerm) => toggleItem(term.inventoryItemId),
        emptyMessage:
          availableTerms.length === 0
            ? "No sourcing terms for this supplier — add them under Suppliers & sourcing."
            : "No terms match your search.",
        renderRow: renderTermRow,
      } as LinkPickerAddProps<unknown>)
    : ({
        items: filteredCatalog,
        isLoading: isCatalogLoading,
        getKey: (item: InventoryItemSummary) => item.id,
        isChecked: (item: InventoryItemSummary) => item.id in pending,
        onToggle: (item: InventoryItemSummary) => toggleItem(item.id),
        emptyMessage:
          availableCatalog.length === 0
            ? "No items to add (all already linked or excluded)."
            : "No items match your search.",
        renderRow: renderCatalogRow,
      } as LinkPickerAddProps<unknown>);

  return (
    <LinkPicker
      className={className}
      fill
      addTitle={
        mode === "sourcing" ? "Add inventory sourcing" : "Add order lines"
      }
      pendingCount={pendingCount}
      saveLabel={`Save (${pendingCount})`}
      onSave={handleSave}
      isSaving={isSaving}
      search={{
        value: search,
        onChange: setSearch,
        placeholder: usePoTermList
          ? "Search by name, SKU, supplier SKU, or preferred…"
          : "Search by name, SKU, or category…",
      }}
      renderPending={renderPendingRows}
      list={listConfig}
    />
  );
}
