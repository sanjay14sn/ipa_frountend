"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { InventoryItemSummary } from "@/services/inventory.service";
import type {
  PurchaseOrderLineInput,
  SupplierItemTerm,
} from "@/services/procurement.service";
import { toast } from "sonner";
import { CATALOG_PENDING_SPLIT_ROW_HEIGHT } from "@/lib/catalog-line-split-layout";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { cn } from "@/lib/utils";

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
        (item.category?.name ?? "").toLowerCase().includes(q),
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

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col rounded-lg border border-dashed bg-slate-50/60",
        mode === "purchase-order" ? "gap-0.5 px-1.5 py-1" : "gap-0.5 px-2 py-1.5 sm:px-2 sm:py-2",
        className,
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-1">
        <h4 className="text-xs font-medium leading-tight text-gray-900 sm:text-sm">
          {mode === "sourcing" ? "Add inventory sourcing" : "Add order lines"}
        </h4>
        {isDirty ? (
          <Button
            type="button"
            size="sm"
            disabled={isSaving}
            onClick={() => void handleSave()}
            className="bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save ({pendingCount})
          </Button>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-1 flex min-h-0 flex-1",
          isDirty ? "grid grid-cols-1 gap-2" : "flex-col gap-2",
        )}
        style={
          isDirty
            ? {
                gridTemplateRows: `${CATALOG_PENDING_SPLIT_ROW_HEIGHT} ${CATALOG_PENDING_SPLIT_ROW_HEIGHT}`,
              }
            : { minHeight: "min(48vh, 420px)" }
        }
      >
        {isDirty ? (
          <div className="h-full min-h-0 space-y-1.5 overflow-y-auto rounded-md border border-primary/20 bg-primary/5 px-1 py-0.5 sm:px-1.5 sm:py-1">
          <p className="shrink-0 text-[11px] font-medium leading-tight text-gray-900 sm:text-xs">
            {pendingCount} selected — adjust fields then save
          </p>
          {Object.entries(pending).map(([idStr, draft]) => {
            const id = Number(idStr);
            const item = catalogItems.find((c) => c.id === id);
            const poTerm =
              mode === "purchase-order" && props.supplierTerms !== undefined
                ? props.supplierTerms.find((t) => t.inventoryItemId === id)
                : undefined;
            const displayName =
              poTerm?.inventoryItem?.name ?? item?.name ?? `Item #${id}`;
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
                  className="flex w-full flex-col gap-1.5 rounded-md border bg-background/80 px-1.5 py-1 sm:gap-2 sm:px-2 sm:py-1.5 lg:flex-row lg:items-end lg:justify-between lg:gap-3"
                >
                  <div className="min-w-0 max-w-full shrink-0 lg:max-w-[min(26rem,48%)] lg:pr-2">
                    <div className="truncate text-sm font-medium leading-tight text-gray-900">
                      {displayName}
                    </div>
                    <div className="break-words text-xs leading-snug text-muted-foreground">
                      {displaySkuLine || "—"}
                    </div>
                  </div>
                  <div className="flex w-full min-w-0 flex-col gap-1.5 lg:w-auto lg:flex-row lg:items-end lg:justify-end lg:gap-3">
                    <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-1.5 gap-y-1 sm:gap-x-2 sm:gap-y-1.5">
                      <div className="min-w-0 flex-1 basis-[7rem] space-y-0.5 sm:max-w-[14rem]">
                        <Label className="text-[11px] text-muted-foreground">Supplier SKU</Label>
                        <Input
                          className="h-8 w-full min-w-0 text-sm"
                          value={d.supplierSku}
                          onChange={(e) =>
                            patchDraft(id, { supplierSku: e.target.value })
                          }
                        />
                      </div>
                      <div className="min-w-0 flex-1 basis-[5.25rem] space-y-0.5 sm:max-w-[8rem]">
                        <Label className="text-[11px] text-muted-foreground">Cost</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-8 w-full min-w-0 text-sm"
                          value={d.currentUnitCost || ""}
                          placeholder="0"
                          onChange={(e) =>
                            patchDraft(id, {
                              currentUnitCost:
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="min-w-0 flex-1 basis-[5.25rem] space-y-0.5 sm:max-w-[7rem]">
                        <Label className="text-[11px] text-muted-foreground">Lead (days)</Label>
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-full min-w-0 text-sm"
                          value={d.leadTimeDays || ""}
                          placeholder="0"
                          onChange={(e) =>
                            patchDraft(id, {
                              leadTimeDays:
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="min-w-0 flex-1 basis-[5rem] space-y-0.5 sm:max-w-[7rem]">
                        <Label className="text-[11px] text-muted-foreground">MOQ</Label>
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-full min-w-0 text-sm"
                          value={d.moq || ""}
                          placeholder="0"
                          onChange={(e) =>
                            patchDraft(id, {
                              moq:
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="min-w-0 flex-1 basis-[5rem] space-y-0.5 sm:max-w-[7rem]">
                        <Label className="text-[11px] text-muted-foreground">Case pack</Label>
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-full min-w-0 text-sm"
                          value={d.casePack || ""}
                          placeholder="0"
                          onChange={(e) =>
                            patchDraft(id, {
                              casePack:
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-end gap-2 border-t border-border/50 pt-2 sm:justify-end sm:gap-3 lg:border-0 lg:pt-0 lg:pl-2 xl:border-l xl:border-border/50 xl:pl-4">
                      <div className="flex flex-col gap-0.5">
                        <Label className="text-[11px] text-muted-foreground">Preferred</Label>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={d.isPreferred}
                            onCheckedChange={(checked) =>
                              patchDraft(id, { isPreferred: checked })
                            }
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleItem(id)}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-destructive"
                        aria-label={`Remove ${displayName}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
            const d = draft as PoDraft;
            return (
              <div
                key={id}
                className="flex flex-row flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded border bg-background/80 px-1.5 py-0.5 sm:gap-x-3"
              >
                <div className="min-w-0 max-w-[50%] shrink-0 sm:max-w-[45%]">
                  <div className="truncate text-sm font-medium leading-tight text-gray-900">
                    {displayName}
                  </div>
                  <div className="truncate text-[11px] leading-tight text-muted-foreground">
                    {displaySkuLine || "—"}
                  </div>
                </div>
                <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-0.5 sm:min-w-0">
                  <div className="w-[5.25rem] shrink-0 space-y-0">
                    <Label className="text-[10px] text-muted-foreground">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-7 w-full min-w-0 px-1.5 text-sm"
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
                  </div>
                  <div className="w-[6.5rem] shrink-0 space-y-0">
                    <Label className="text-[10px] text-muted-foreground">Unit cost</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-7 w-full min-w-0 px-1.5 text-sm"
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
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleItem(id)}
                    className="ml-auto shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-destructive sm:ml-0"
                    aria-label={`Remove ${displayName}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        ) : null}
        <div
          className={cn(
            "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-white shadow-sm",
            isDirty ? "h-full min-h-0" : "flex-1",
          )}
        >
        <div className="shrink-0 border-b border-border/80 bg-muted/25 px-1.5 py-0.5 sm:px-2 sm:py-1">
          <Input
            className={cn(
              "border-input/80 bg-background text-sm shadow-none",
              mode === "purchase-order" ? "h-7" : "h-8",
            )}
            placeholder={
              usePoTermList
                ? "Search by name, SKU, supplier SKU, or preferred…"
                : "Search by name, SKU, or category..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        {usePoTermList ? (
          supplierTermsCatalogLoading && availableTerms.length === 0 ? (
            <div className="flex items-center gap-2 px-2.5 py-4 text-sm text-gray-500 sm:px-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading sourcing terms…
            </div>
          ) : filteredTerms.length === 0 ? (
            <div className="px-2.5 py-4 text-sm text-gray-500 sm:px-3">
              {availableTerms.length === 0
                ? "No sourcing terms for this supplier — add them under Suppliers & sourcing."
                : "No terms match your search."}
            </div>
          ) : (
            filteredTerms.map((term) => {
              const item = catalogItems.find((c) => c.id === term.inventoryItemId);
              const rowId = term.inventoryItemId;
              const name =
                term.inventoryItem?.name ?? item?.name ?? `Item #${rowId}`;
              const checked = rowId in pending;
              return (
                <div
                  key={term.id}
                  className={`flex items-center gap-1.5 border-b px-1.5 py-1 last:border-b-0 transition-colors sm:gap-2 sm:px-2 ${
                    checked ? "bg-primary/10" : "hover:bg-gray-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(rowId)}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-gray-300 bg-white text-transparent"
                    }`}
                    aria-label={checked ? `Uncheck ${name}` : `Check ${name}`}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900">{name}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-gray-500">
                      {item?.sku ? <span>{item.sku}</span> : null}
                      {term.supplierSku ? (
                        <span>Supplier SKU: {term.supplierSku}</span>
                      ) : null}
                    </div>
                  </div>
                  {!checked ? (
                    term.isPreferred ? (
                      <Badge className="shrink-0 text-[10px] bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        Preferred
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {item?.inventoryType ?? "—"}
                      </Badge>
                    )
                  ) : (
                    <span
                      className="shrink-0 text-[10px] text-muted-foreground sm:text-xs"
                      title="Edit in list above"
                    >
                      Above
                    </span>
                  )}
                </div>
              );
            })
          )
        ) : isCatalogLoading ? (
          <div className="flex items-center gap-2 px-2.5 py-4 text-sm text-gray-500 sm:px-3">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading inventory catalog...
          </div>
        ) : filteredCatalog.length === 0 ? (
          <div className="px-2.5 py-4 text-sm text-gray-500 sm:px-3">
            {availableCatalog.length === 0
              ? "No items to add (all already linked or excluded)."
              : "No items match your search."}
          </div>
        ) : (
          filteredCatalog.map((item) => {
            const checked = item.id in pending;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-1.5 border-b px-1.5 py-1 last:border-b-0 transition-colors sm:gap-2 sm:px-2 ${
                  checked ? "bg-primary/10" : "hover:bg-gray-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-gray-300 bg-white text-transparent"
                  }`}
                  aria-label={checked ? `Uncheck ${item.name}` : `Check ${item.name}`}
                >
                  <Check className="h-3 w-3" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-900">
                    {item.name}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-gray-500">
                    {item.sku ? <span>{item.sku}</span> : null}
                    {item.category?.name ? <span>{item.category.name}</span> : null}
                  </div>
                </div>
                {!checked ? (
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {item.inventoryType}
                  </Badge>
                ) : (
                  <span
                    className="shrink-0 text-[10px] text-muted-foreground sm:text-xs"
                    title="Edit in list above"
                  >
                    Above
                  </span>
                )}
              </div>
            );
          })
        )}
        </div>
      </div>
      </div>
    </div>
  );
}
