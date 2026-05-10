"use client";

import { useState } from "react";
import { Check, Loader2, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InventoryItemSummary } from "@/services/inventory.service";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyMessage } from "@/lib/error-utils";

interface InventoryCheckboxLinkPanelProps {
  linkedInventoryIds: Set<number>;
  catalogItems: InventoryItemSummary[];
  isCatalogLoading: boolean;
  onSave: (items: Array<{ inventoryId: number; quantity: number }>) => Promise<void>;
}

function isPositiveInteger(n: number) {
  return Number.isInteger(n) && n > 0;
}

export function InventoryCheckboxLinkPanel({
  linkedInventoryIds,
  catalogItems,
  isCatalogLoading,
  onSave,
}: InventoryCheckboxLinkPanelProps) {
  const [pendingAdditions, setPendingAdditions] = useState<Record<number, number>>({});
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const available = catalogItems.filter(
    (item) => !linkedInventoryIds.has(item.id),
  );

  const filtered = search.trim()
    ? available.filter((item) => {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          (item.category?.name ?? "").toLowerCase().includes(q)
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
    <div className="rounded-lg border border-dashed bg-slate-50/60 p-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900">Add existing inventory</h4>
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

      {/* Section 2: Pending selections */}
      {isDirty ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
          <p className="mb-2 text-xs font-medium text-emerald-900">
            {pendingCount} selected — not yet saved
          </p>
          {Object.entries(pendingAdditions).map(([idStr, qty]) => {
            const id = Number(idStr);
            const item = catalogItems.find((c) => c.id === id);
            if (!item) return null;
            return (
              <div key={id} className="flex items-center gap-2 py-1">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                  {item.name}
                </span>
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
            );
          })}
        </div>
      ) : null}

      {/* Section 3: Searchable catalog */}
      <Input
        className="mt-3"
        placeholder="Search by name, SKU, or category..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border bg-white">
        {isCatalogLoading ? (
          <div className="flex items-center gap-2 px-3 py-6 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading inventory catalog...
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-6 text-sm text-gray-500">
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
                className={`flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0 transition-colors ${
                  checked ? "bg-emerald-50/60" : "hover:bg-gray-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    checked
                      ? "border-emerald-600 bg-emerald-600 text-white"
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
                    <span>Avail {item.availableQty}</span>
                  </div>
                </div>

                {checked ? (
                  <div className="flex items-center gap-1.5 shrink-0">
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
  );
}
