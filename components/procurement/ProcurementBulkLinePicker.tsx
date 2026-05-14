"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { InventoryItemSummary } from "@/services/inventory.service";
import type { PurchaseOrderLineInput } from "@/services/procurement.service";
import { useToast } from "@/hooks/use-toast";
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

  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<Record<number, SourcingDraft | PoDraft>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

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

  const available = useMemo(
    () => catalogItems.filter((item) => !excludeInventoryIds.has(item.id)),
    [catalogItems, excludeInventoryIds],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.sku ?? "").toLowerCase().includes(q) ||
        (item.category?.name ?? "").toLowerCase().includes(q),
    );
  }, [available, search]);

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
      toast({
        title: "Failed to save",
        description: getUserFriendlyMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col rounded-lg border border-dashed bg-slate-50/60 px-2.5 py-3 sm:px-3 sm:py-3",
        className,
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900">
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

      {isDirty ? (
        <div className="mt-3 max-h-[min(32vh,280px)] shrink-0 space-y-3 overflow-y-auto rounded-lg border border-primary/20 bg-primary/5 px-2 py-2.5 sm:px-2.5 sm:py-3">
          <p className="shrink-0 text-xs font-medium text-gray-900">
            {pendingCount} selected — adjust fields then save
          </p>
          {Object.entries(pending).map(([idStr, draft]) => {
            const id = Number(idStr);
            const item = catalogItems.find((c) => c.id === id);
            if (!item) return null;
            if (mode === "sourcing") {
              const d = draft as SourcingDraft;
              return (
                <div
                  key={id}
                  className="flex flex-col gap-3 rounded-md border bg-background/80 px-2 py-2.5 sm:gap-4 sm:px-3 sm:py-3 lg:flex-row lg:items-end lg:gap-5"
                >
                  <div className="min-w-0 shrink-0 lg:max-w-[min(22rem,30%)] lg:pr-1">
                    <div className="truncate text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="break-words text-xs text-muted-foreground">{item.sku}</div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-end lg:gap-6">
                    <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-3 gap-y-3 sm:gap-x-4">
                      <div className="min-w-0 flex-1 basis-[7rem] space-y-1 sm:max-w-[14rem]">
                        <Label className="text-xs text-muted-foreground">Supplier SKU</Label>
                        <Input
                          className="h-9 w-full min-w-0 text-sm"
                          value={d.supplierSku}
                          onChange={(e) =>
                            patchDraft(id, { supplierSku: e.target.value })
                          }
                        />
                      </div>
                      <div className="min-w-0 flex-1 basis-[5.25rem] space-y-1 sm:max-w-[8rem]">
                        <Label className="text-xs text-muted-foreground">Cost</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-9 w-full min-w-0 text-sm"
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
                      <div className="min-w-0 flex-1 basis-[5.25rem] space-y-1 sm:max-w-[7rem]">
                        <Label className="text-xs text-muted-foreground">Lead (days)</Label>
                        <Input
                          type="number"
                          min={0}
                          className="h-9 w-full min-w-0 text-sm"
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
                      <div className="min-w-0 flex-1 basis-[5rem] space-y-1 sm:max-w-[7rem]">
                        <Label className="text-xs text-muted-foreground">MOQ</Label>
                        <Input
                          type="number"
                          min={0}
                          className="h-9 w-full min-w-0 text-sm"
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
                      <div className="min-w-0 flex-1 basis-[5rem] space-y-1 sm:max-w-[7rem]">
                        <Label className="text-xs text-muted-foreground">Case pack</Label>
                        <Input
                          type="number"
                          min={0}
                          className="h-9 w-full min-w-0 text-sm"
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
                    <div className="flex shrink-0 items-end gap-4 border-t border-border/50 pt-3 sm:justify-end lg:border-0 lg:pt-0 lg:pl-2 xl:border-l xl:border-border/50 xl:pl-5">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">Preferred</Label>
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
                        aria-label={`Remove ${item.name}`}
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
                className="flex flex-col gap-3 rounded-md border bg-background/80 px-2 py-2.5 sm:gap-4 sm:px-3 sm:py-3 lg:flex-row lg:items-end lg:gap-5"
              >
                <div className="min-w-0 shrink-0 lg:max-w-[min(22rem,30%)] lg:pr-1">
                  <div className="truncate text-sm font-medium text-gray-900">{item.name}</div>
                  <div className="break-words text-xs text-muted-foreground">{item.sku}</div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                  <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-3 gap-y-3 sm:gap-x-4">
                    <div className="min-w-0 flex-1 basis-[6rem] space-y-1 sm:max-w-[9rem]">
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
                      <Input
                        type="number"
                        min={1}
                        className="h-9 w-full min-w-0 text-sm"
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
                    <div className="min-w-0 flex-1 basis-[7rem] space-y-1 sm:max-w-[12rem]">
                      <Label className="text-xs text-muted-foreground">Unit cost</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-9 w-full min-w-0 text-sm"
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
                  </div>
                  <div className="flex shrink-0 items-end justify-end sm:pl-2 lg:border-l lg:border-border/50 lg:pl-5">
                    <button
                      type="button"
                      onClick={() => toggleItem(id)}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-destructive"
                      aria-label={`Remove ${item.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mt-3 flex min-h-0 min-h-[min(26vh,220px)] flex-1 flex-col overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="shrink-0 border-b border-border/80 bg-muted/25 px-2 py-2 sm:px-2.5 sm:py-2.5">
          <Input
            className="h-9 border-input/80 bg-background shadow-none"
            placeholder="Search by name, SKU, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        {isCatalogLoading ? (
          <div className="flex items-center gap-2 px-2.5 py-6 text-sm text-gray-500 sm:px-3">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading inventory catalog...
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-2.5 py-6 text-sm text-gray-500 sm:px-3">
            {available.length === 0
              ? "No items to add (all already linked or excluded)."
              : "No items match your search."}
          </div>
        ) : (
          filtered.map((item) => {
            const checked = item.id in pending;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-2.5 border-b px-2 py-2.5 last:border-b-0 transition-colors sm:gap-3 sm:px-2.5 ${
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
                  <span className="text-xs text-muted-foreground">Edit in list above</span>
                )}
              </div>
            );
          })
        )}
        </div>
      </div>
    </div>
  );
}
