"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { AgreementRecord } from "@/services/agreement.service";
import {
  getAgreementProgramKitItems,
  setAgreementProgramKitItems,
  type FranchiseProgramKitItemSummary,
} from "@/services/inventory.service";
import { getErrorMessage } from "@/lib/error-utils";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { LinkPicker } from "@/components/shared/dialog/picker/LinkPicker";

type SelectedRow = {
  programKitId: number;
  name: string;
  sku: string | null;
  quantity: number;
  availableQty: number;
  categoryName: string | null;
};

function toSelectedRows(rows: FranchiseProgramKitItemSummary[]): SelectedRow[] {
  return rows
    .filter((row) => row.selected)
    .map((row) => ({
      programKitId: row.programKitId,
      name: row.name,
      sku: row.sku ?? null,
      quantity: Number(row.quantity ?? row.defaultQuantity ?? 1),
      availableQty: Number(row.availableQty ?? 0),
      categoryName: row.category ?? null,
    }));
}

interface AgreementKitItemsPanelProps {
  agreement: AgreementRecord | null;
}

/**
 * Body for the "Kit items" tab of the Manage kit dialog. Edits the program kit
 * items selected for a single agreement. Rendered without its own dialog chrome
 * so it can live inside the tabbed `ManageKitDialog`.
 */
export function AgreementKitItemsPanel({
  agreement,
}: AgreementKitItemsPanelProps) {
  const queryClient = useQueryClient();
  const agreementId = agreement?.id ?? null;
  const canManage = agreementId != null && agreement?.programId != null;
  const [selectedRows, setSelectedRows] = useState<SelectedRow[]>([]);
  // Multi-select "add" bucket: programKitId -> quantity. Items are merged into
  // selectedRows on "Add items", then committed to the server via "Save changes".
  const [pendingAdditions, setPendingAdditions] = useState<Record<number, number>>(
    {},
  );
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const queryKey = ["inventory", "agreement-kit-items", agreementId] as const;
  const agreementKitQuery = useQuery({
    queryKey,
    queryFn: () => getAgreementProgramKitItems(agreementId!),
    enabled: canManage,
  });

  const allRows = agreementKitQuery.data ?? [];
  const selectedIdSet = useMemo(
    () => new Set(selectedRows.map((row) => row.programKitId)),
    [selectedRows],
  );
  const availableRows = useMemo(
    () => allRows.filter((row) => !selectedIdSet.has(row.programKitId)),
    [allRows, selectedIdSet],
  );
  const filteredAvailable = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableRows;
    return availableRows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        (row.sku ?? "").toLowerCase().includes(q) ||
        (row.category ?? "").toLowerCase().includes(q),
    );
  }, [availableRows, search]);

  const pendingEntries = Object.entries(pendingAdditions);
  const pendingCount = pendingEntries.length;

  useEffect(() => {
    if (!agreementKitQuery.data) return;
    setSelectedRows(toSelectedRows(agreementKitQuery.data));
  }, [agreementKitQuery.data]);

  const handleRemove = (programKitId: number) => {
    setSelectedRows((prev) =>
      prev.filter((row) => row.programKitId !== programKitId),
    );
  };

  const handleQuantityChange = (programKitId: number, value: string) => {
    const parsed = Math.max(1, Math.floor(Number(value) || 1));
    setSelectedRows((prev) =>
      prev.map((row) =>
        row.programKitId === programKitId ? { ...row, quantity: parsed } : row,
      ),
    );
  };

  const togglePending = (row: FranchiseProgramKitItemSummary) => {
    setPendingAdditions((prev) => {
      if (row.programKitId in prev) {
        const next = { ...prev };
        delete next[row.programKitId];
        return next;
      }
      const qty = Math.max(1, Math.floor(Number(row.defaultQuantity ?? 1)) || 1);
      return { ...prev, [row.programKitId]: qty };
    });
  };

  const setPendingQty = (programKitId: number, value: string) => {
    const parsed = Math.max(1, Math.floor(Number(value) || 1));
    setPendingAdditions((prev) =>
      programKitId in prev ? { ...prev, [programKitId]: parsed } : prev,
    );
  };

  const handleAddSelected = () => {
    if (pendingCount === 0) return;
    const additions: SelectedRow[] = [];
    for (const [idStr, qty] of pendingEntries) {
      const row = availableRows.find((r) => r.programKitId === Number(idStr));
      if (!row) continue;
      additions.push({
        programKitId: row.programKitId,
        name: row.name,
        sku: row.sku ?? null,
        quantity: Math.max(1, Math.floor(Number(qty) || 1)),
        availableQty: Number(row.availableQty ?? 0),
        categoryName: row.category ?? null,
      });
    }
    if (additions.length === 0) return;
    setSelectedRows((prev) => [...prev, ...additions]);
    setPendingAdditions({});
    setSearch("");
  };

  const handleSave = async () => {
    if (!agreementId) return;
    setSaving(true);
    try {
      const updated = await setAgreementProgramKitItems(
        agreementId,
        selectedRows.map((row) => ({
          programKitId: row.programKitId,
          quantity: Math.max(1, Math.floor(Number(row.quantity) || 1)),
        })),
      );
      setSelectedRows(toSelectedRows(updated));
      await queryClient.invalidateQueries({ queryKey });
      toast.success("Agreement kit items updated.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update kit items."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {!canManage ? (
        <p className="rounded-lg border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
          This agreement does not have a program mapped yet, so kit item
          management is unavailable.
        </p>
      ) : agreementKitQuery.isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading kit items...
        </div>
      ) : (
        <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border">
              <div className="border-b bg-muted/40 px-3 py-2.5 text-sm font-medium">
                Selected items
              </div>
              {selectedRows.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  No kit items selected for this agreement.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20 text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Item</th>
                        <th className="px-3 py-2 font-medium">Category</th>
                        <th className="px-3 py-2 text-center font-medium">
                          Quantity
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRows.map((row) => (
                        <tr key={row.programKitId} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{row.name}</span>
                              {row.sku ? (
                                <Badge variant="outline" className="text-[10px]">
                                  {row.sku}
                                </Badge>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {row.categoryName ?? "-"}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Input
                              type="number"
                              min={1}
                              className="mx-auto h-8 w-24 text-center"
                              value={row.quantity}
                              onChange={(event) =>
                                handleQuantityChange(
                                  row.programKitId,
                                  event.target.value,
                                )
                              }
                              onFocus={selectInputValueOnFocus}
                              disabled={saving}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive"
                              onClick={() => handleRemove(row.programKitId)}
                              disabled={saving}
                              title={`Remove ${row.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <LinkPicker
              addTitle="Add items"
              pendingCount={pendingCount}
              onSave={handleAddSelected}
              saveLabel={`Add ${pendingCount} item${pendingCount === 1 ? "" : "s"}`}
              pendingTitle={
                pendingCount > 0
                  ? `${pendingCount} item${pendingCount === 1 ? "" : "s"} to add`
                  : "To add"
              }
              pendingEmptyMessage="Tick items on the left to add them, then click “Add items”."
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "Search by name, SKU, or category…",
              }}
              renderPending={() => (
                <div className="space-y-1.5">
                  {pendingEntries.map(([idStr, qty]) => {
                    const id = Number(idStr);
                    const row = availableRows.find((r) => r.programKitId === id);
                    if (!row) return null;
                    return (
                      <div
                        key={id}
                        className="space-y-1.5 rounded-md border border-border bg-card px-2.5 py-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-card-foreground">
                            {row.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePending(row)}
                            aria-label={`Remove ${row.name} from selection`}
                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="w-8 shrink-0">Qty</span>
                          <Input
                            type="number"
                            min={1}
                            inputMode="numeric"
                            value={String(qty)}
                            onChange={(event) =>
                              setPendingQty(id, event.target.value)
                            }
                            onFocus={selectInputValueOnFocus}
                            aria-label={`Quantity for ${row.name}`}
                            className="h-7 w-full min-w-0 px-2 text-sm"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
              list={{
                items: filteredAvailable,
                isLoading: false,
                getKey: (row) => row.programKitId,
                isChecked: (row) => row.programKitId in pendingAdditions,
                onToggle: (row) => togglePending(row),
                emptyMessage:
                  availableRows.length === 0
                    ? "All available items are already selected."
                    : "No item matches your search.",
                renderRow: (row, checked) => (
                  <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => togglePending(row)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-card-foreground">
                        {row.name}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                        {row.sku ? <span>{row.sku}</span> : null}
                        {row.category ? <span>{row.category}</span> : null}
                        <span>Avail {row.availableQty}</span>
                      </div>
                    </div>
                  </label>
                ),
              }}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save changes
              </Button>
            </div>
          </div>
        )}
    </div>
  );
}
