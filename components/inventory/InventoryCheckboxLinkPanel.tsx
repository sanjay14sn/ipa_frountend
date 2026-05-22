"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { InventoryItemSummary } from "@/services/inventory.service";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { LinkPicker } from "@/components/shared/dialog/picker/LinkPicker";

interface InventoryCheckboxLinkPanelProps {
  /** Items already linked. If supplied, they'll render as a "Linked items" badge row above the picker. */
  linkedItems?: InventoryItemSummary[];
  /** IDs already linked. Always required so we can filter the catalog. */
  linkedInventoryIds: Set<number>;
  catalogItems: InventoryItemSummary[];
  isCatalogLoading: boolean;
  onSave: (items: Array<{ inventoryId: number; quantity: number }>) => Promise<void>;
  /** Called when the user clicks the "x" on a linked-item badge (if linkedItems supplied). */
  onUnlink?: (item: InventoryItemSummary) => void;
  /** Title above the linked badges. Default "Linked items". */
  linkedTitle?: React.ReactNode;
  /** Title above the "add" card. Default "Add existing inventory". */
  addTitle?: React.ReactNode;
  className?: string;
}

function isPositiveInteger(n: number) {
  return Number.isInteger(n) && n > 0;
}

export function InventoryCheckboxLinkPanel({
  linkedItems,
  linkedInventoryIds,
  catalogItems,
  isCatalogLoading,
  onSave,
  onUnlink,
  linkedTitle = "Linked items",
  addTitle = "Add existing inventory",
  className,
}: InventoryCheckboxLinkPanelProps) {
  const [pendingAdditions, setPendingAdditions] = useState<Record<number, number>>({});
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const available = useMemo(
    () => catalogItems.filter((item) => !linkedInventoryIds.has(item.id)),
    [catalogItems, linkedInventoryIds],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.category ?? "").toLowerCase().includes(q),
    );
  }, [available, search]);

  const pendingEntries = Object.entries(pendingAdditions);
  const pendingCount = pendingEntries.length;

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
    if (pendingCount === 0) return;
    const items = pendingEntries.map(([id, qty]) => ({
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
    <LinkPicker
      className={className}
      linked={
        linkedItems
          ? {
              items: linkedItems,
              getKey: (item) => item.id,
              getLabel: (item) => item.name,
              title: linkedTitle,
              onUnlink,
              emptyMessage: "No linked items.",
            }
          : undefined
      }
      addTitle={addTitle}
      pendingCount={pendingCount}
      onSave={handleSave}
      isSaving={isSaving}
      search={{
        value: search,
        onChange: setSearch,
        placeholder: "Search by name, SKU, or category…",
      }}
      renderPending={() => (
        <div className="space-y-1.5">
          {pendingEntries.map(([idStr, qty]) => {
            const id = Number(idStr);
            const item = catalogItems.find((c) => c.id === id);
            if (!item) return null;
            return (
              <div
                key={id}
                className="rounded-md border border-border bg-card px-2.5 py-2 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-card-foreground">
                    {item.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleItem(id)}
                    aria-label={`Remove ${item.name} from selection`}
                    className="h-6 w-6 shrink-0 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="w-8 shrink-0">Qty</span>
                  <Input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={String(qty)}
                    onChange={(e) => setQuantity(id, e.target.value)}
                    onBlur={() => handleQuantityBlur(id)}
                    aria-label={`Quantity for ${item.name}`}
                    className="h-7 w-full min-w-0 px-2 text-sm"
                  />
                </label>
              </div>
            );
          })}
        </div>
      )}
      list={{
        items: filtered,
        isLoading: isCatalogLoading,
        getKey: (item) => item.id,
        isChecked: (item) => item.id in pendingAdditions,
        onToggle: (item) => toggleItem(item.id),
        emptyMessage:
          available.length === 0
            ? "All catalog items are already linked."
            : "No items match your search.",
        renderRow: (item, checked) => {
          return (
            <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer">
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggleItem(item.id)}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-card-foreground">
                  {item.name}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                  {item.sku ? <span>{item.sku}</span> : null}
                  {item.category ? <span>{item.category}</span> : null}
                  <span>Avail {item.availableQty}</span>
                </div>
              </div>
              {checked ? (
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  Added
                </span>
              ) : (
                <Badge
                  variant="outline"
                  className="shrink-0 text-[10px]"
                >
                  {item.inventoryType}
                </Badge>
              )}
            </label>
          );
        },
      }}
    />
  );
}
