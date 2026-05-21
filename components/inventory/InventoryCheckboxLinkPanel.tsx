"use client";

import { useState } from "react";
import { Check, Loader2, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InventoryItemSummary } from "@/services/inventory.service";
import { toast } from "sonner";
import { CATALOG_PENDING_SPLIT_ROW_HEIGHT } from "@/lib/catalog-line-split-layout";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { cn } from "@/lib/utils";

interface InventoryCheckboxLinkPanelProps {
  linkedInventoryIds: Set<number>;
  catalogItems: InventoryItemSummary[];
  isCatalogLoading: boolean;
  onSave: (items: Array<{ inventoryId: number; quantity: number }>) => Promise<void>;
  className?: string;
}

function isPositiveInteger(n: number) {
  return Number.isInteger(n) && n > 0;
}

export function InventoryCheckboxLinkPanel({
  linkedInventoryIds,
  catalogItems,
  isCatalogLoading,
  onSave,
  className,
}: InventoryCheckboxLinkPanelProps) {
  const [pendingAdditions, setPendingAdditions] = useState<Record<number, number>>({});
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const available = catalogItems.filter(
    (item) => !linkedInventoryIds.has(item.id),
  );

  const filtered = search.trim()
    ? available.filter((item) => {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          (item.category ?? "").toLowerCase().includes(q)
        );
      })
    : available;

  const pendingCount = Object.keys(pendingAdditions).length;
  const isDirty = pendingCount > 0;

  function toggleItem(id: number) {
    setPendingAdditions((prev) => {
      if (id in prev) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: 1 };
    });
  }

  function setQuantity(id: number, value: string) {
    const parsed = Number(value);
    setPendingAdditions((prev) => ({
      ...prev,
      [id]: isPositiveInteger(parsed) ? parsed : prev[id],
    }));
  }

  function handleQuantityBlur(id: number) {
    setPendingAdditions((prev) => {
      const current = prev[id];
      if (!isPositiveInteger(current)) {
        return { ...prev, [id]: 1 };
      }
      return prev;
    });
  }

  async function handleSave() {
    if (!isDirty) return;
    const items = Object.entries(pendingAdditions).map(([id, qty]) => ({
      inventoryId: Number(id),
      quantity: qty,
    }));
    setIsSaving(true);
    try {
      await onSave(items);
      setPendingAdditions({});
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
        "flex min-h-0 flex-col gap-0.5 rounded-lg border border-dashed bg-slate-50/60 px-2 py-1.5 sm:px-2 sm:py-2",
        className,
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-1">
        <h4 className="text-xs font-medium leading-tight text-gray-900 sm:text-sm">
          Add existing inventory
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
            Save Changes ({pendingCount})
          </Button>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-1 flex min-h-0 flex-col",
          isDirty ? "grid grid-cols-1 gap-2" : "gap-2",
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
          <div className="h-full min-h-0 space-y-1 overflow-y-auto rounded-md border border-primary/20 bg-primary/5 px-1 py-0.5 sm:px-1.5 sm:py-1">
            <p className="shrink-0 text-[11px] font-medium leading-tight text-gray-900 sm:text-xs">
              {pendingCount} selected — not yet saved
            </p>
            {Object.entries(pendingAdditions).map(([idStr, qty]) => {
              const id = Number(idStr);
              const item = catalogItems.find((c) => c.id === id);
              if (!item) return null;
              return (
                <div
                  key={id}
                  className="flex w-full flex-row flex-wrap items-center justify-between gap-2 py-0.5"
                >
                  <span className="min-w-0 max-w-[50%] shrink-0 truncate text-sm font-medium text-gray-900 sm:max-w-[45%]">
                    {item.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={String(qty)}
                      onChange={(e) => setQuantity(id, e.target.value)}
                      onBlur={() => handleQuantityBlur(id)}
                      aria-label={`Quantity for ${item.name}`}
                      className="h-7 w-16 shrink-0 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => toggleItem(id)}
                      aria-label={`Remove ${item.name} from selection`}
                      className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
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
            isDirty ? "h-full min-h-0" : "min-h-0 flex-1",
          )}
        >
          <div className="shrink-0 border-b border-border/80 bg-muted/25 px-1.5 py-0.5 sm:px-2 sm:py-1">
            <Input
              className="h-8 border-input/80 bg-background text-sm shadow-none"
              placeholder="Search by name, SKU, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
            {isCatalogLoading ? (
              <div className="flex items-center gap-2 px-2.5 py-4 text-sm text-gray-500 sm:px-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading inventory catalog...
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-2.5 py-4 text-sm text-gray-500 sm:px-3">
                {available.length === 0
                  ? "All catalog items are already assigned."
                  : "No items match your search."}
              </div>
            ) : (
              filtered.map((item) => {
                const checked = item.id in pendingAdditions;
                const qty = pendingAdditions[item.id] ?? 1;
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
                        {item.category ? <span>{item.category}</span> : null}
                        <span>Avail {item.availableQty}</span>
                      </div>
                    </div>

                    {checked ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="text-xs text-gray-500">Qty</span>
                        <Input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          value={String(qty)}
                          onChange={(e) => setQuantity(item.id, e.target.value)}
                          onBlur={() => handleQuantityBlur(item.id)}
                          aria-label={`Quantity for ${item.name}`}
                          className="h-7 w-16 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {item.inventoryType}
                      </Badge>
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
