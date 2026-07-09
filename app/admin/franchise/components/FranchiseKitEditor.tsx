"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getFranchiseKit,
  setFranchiseKit,
  type FranchiseKitSelectionItem,
} from "@/services/inventory.service";
import { getErrorMessage } from "@/lib/error-utils";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";
import { queryKeys } from "@/hooks/api/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { formatRupees } from "@/lib/currency-utils";

type SelectedRow = {
  franchiseKitItemId: number;
  name: string;
  sku: string | null;
  categoryName: string | null;
  catalogPrice: number;
  quantity: number;
  /** Empty string = inherit catalog price. */
  priceDraft: string;
};

function toSelectedRows(rows: FranchiseKitSelectionItem[]): SelectedRow[] {
  return rows
    .filter((row) => row.selected)
    .map((row) => ({
      franchiseKitItemId: row.franchiseKitItemId,
      name: row.name,
      sku: row.sku ?? null,
      categoryName: row.category ?? null,
      catalogPrice: Number(row.unitPrice ?? 0),
      quantity: Number(row.quantity ?? row.defaultQuantity ?? 1),
      priceDraft:
        row.unitPriceOverride != null ? String(row.unitPriceOverride) : "",
    }));
}

interface FranchiseKitPanelProps {
  franchiseId: string | null;
  programId: number | null;
}

/**
 * Per-franchise kit editor for a program: which template items the franchise
 * receives, with quantity and an optional unit-price override (blank = catalog
 * price). Used for the free first dispatch and as the franchisee's re-order
 * catalog. Rendered without dialog chrome so it can live inside the tabbed
 * `ManageKitDialog`.
 */
export function FranchiseKitPanel({
  franchiseId,
  programId,
}: FranchiseKitPanelProps) {
  const queryClient = useQueryClient();
  const [selectedRows, setSelectedRows] = useState<SelectedRow[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedKitItemId, setSelectedKitItemId] = useState<number | null>(null);
  const [addQuantity, setAddQuantity] = useState("1");
  const [saving, setSaving] = useState(false);

  const queryKey = queryKeys.inventory.franchiseKit(
    franchiseId ?? "",
    programId ?? 0,
  );
  const kitQuery = useQuery({
    queryKey,
    queryFn: () => getFranchiseKit(franchiseId!, programId!),
    enabled: franchiseId != null && programId != null,
  });

  const allRows = useMemo(() => kitQuery.data ?? [], [kitQuery.data]);
  const selectedIdSet = useMemo(
    () => new Set(selectedRows.map((row) => row.franchiseKitItemId)),
    [selectedRows],
  );
  const availableRows = useMemo(
    () =>
      allRows.filter(
        (row) => row.isActive && !selectedIdSet.has(row.franchiseKitItemId),
      ),
    [allRows, selectedIdSet],
  );
  const selectedToAdd =
    availableRows.find((row) => row.franchiseKitItemId === selectedKitItemId) ??
    null;

  useEffect(() => {
    if (!kitQuery.data) return;
    setSelectedRows(toSelectedRows(kitQuery.data));
  }, [kitQuery.data]);

  const updateRow = (
    franchiseKitItemId: number,
    patch: Partial<SelectedRow>,
  ) => {
    setSelectedRows((prev) =>
      prev.map((row) =>
        row.franchiseKitItemId === franchiseKitItemId
          ? { ...row, ...patch }
          : row,
      ),
    );
  };

  const handleAdd = () => {
    if (!selectedToAdd) {
      toast.error("Select a kit item to add.");
      return;
    }
    const qty = Math.max(1, Math.floor(Number(addQuantity) || 1));
    setSelectedRows((prev) => [
      ...prev,
      {
        franchiseKitItemId: selectedToAdd.franchiseKitItemId,
        name: selectedToAdd.name,
        sku: selectedToAdd.sku ?? null,
        categoryName: selectedToAdd.category ?? null,
        catalogPrice: Number(selectedToAdd.unitPrice ?? 0),
        quantity: qty,
        priceDraft: "",
      },
    ]);
    setSelectedKitItemId(null);
    setAddQuantity("1");
    setCatalogOpen(false);
  };

  const handleSave = async () => {
    if (!franchiseId || programId == null) return;

    for (const row of selectedRows) {
      if (row.priceDraft !== "" && !(Number(row.priceDraft) >= 0)) {
        toast.error(`Invalid price override for ${row.name}`);
        return;
      }
    }

    setSaving(true);
    try {
      const updated = await setFranchiseKit(
        franchiseId,
        programId,
        selectedRows.map((row) => ({
          franchiseKitItemId: row.franchiseKitItemId,
          quantity: Math.max(1, Math.floor(Number(row.quantity) || 1)),
          unitPriceOverride:
            row.priceDraft === "" ? null : Number(row.priceDraft),
        })),
      );
      setSelectedRows(toSelectedRows(updated));
      await queryClient.invalidateQueries({ queryKey });
      toast.success("Franchise kit updated.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update franchise kit."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {kitQuery.isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading franchise kit...
        </div>
      ) : (
        <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border">
              <div className="border-b bg-muted/40 px-3 py-2.5 text-sm font-medium">
                Selected items
              </div>
              {selectedRows.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  No kit items selected for this franchise.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-0 hover:bg-transparent">
                        <TableHead>Item</TableHead>
                        <TableHead className="text-center">Quantity</TableHead>
                        <TableHead className="text-center">
                          Unit price (₹)
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRows.map((row) => (
                        <TableRow key={row.franchiseKitItemId}>
                          <TableCell className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{row.name}</span>
                              {row.sku ? (
                                <Badge variant="outline" className="text-[10px]">
                                  {row.sku}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {row.categoryName ?? "-"}
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-2 text-center">
                            <Input
                              type="number"
                              min={1}
                              className="mx-auto h-8 w-20 text-center"
                              value={row.quantity}
                              onChange={(event) =>
                                updateRow(row.franchiseKitItemId, {
                                  quantity: Math.max(
                                    1,
                                    Math.floor(Number(event.target.value) || 1),
                                  ),
                                })
                              }
                              onFocus={selectInputValueOnFocus}
                              disabled={saving}
                            />
                          </TableCell>
                          <TableCell className="px-3 py-2 text-center">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              className="mx-auto h-8 w-28 text-center"
                              placeholder={row.catalogPrice.toFixed(2)}
                              value={row.priceDraft}
                              onChange={(event) =>
                                updateRow(row.franchiseKitItemId, {
                                  priceDraft: event.target.value,
                                })
                              }
                              onFocus={selectInputValueOnFocus}
                              disabled={saving}
                              title="Leave blank to use the catalog price"
                            />
                          </TableCell>
                          <TableCell className="px-3 py-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive"
                              onClick={() =>
                                setSelectedRows((prev) =>
                                  prev.filter(
                                    (r) =>
                                      r.franchiseKitItemId !==
                                      row.franchiseKitItemId,
                                  ),
                                )
                              }
                              disabled={saving}
                              title={`Remove ${row.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-dashed bg-muted/20 p-3">
              <h4 className="text-sm font-medium">Add item</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick from the franchise kit template and set quantity.
              </p>

              <div className="mt-3 space-y-3">
                <Popover open={catalogOpen} onOpenChange={setCatalogOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={catalogOpen}
                      className="w-full justify-between"
                    >
                      <span className="truncate">
                        {selectedToAdd ? selectedToAdd.name : "Select kit item"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-70" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                  >
                    <Command>
                      <CommandInput placeholder="Search kit item..." />
                      <CommandList className="max-h-60">
                        <CommandEmpty>
                          {availableRows.length === 0
                            ? "All template items are already selected."
                            : "No item matches your search."}
                        </CommandEmpty>
                        <CommandGroup>
                          {availableRows.map((row) => (
                            <CommandItem
                              key={row.franchiseKitItemId}
                              value={`${row.name} ${row.sku ?? ""} ${row.category ?? ""}`}
                              onSelect={() =>
                                setSelectedKitItemId(row.franchiseKitItemId)
                              }
                              className="gap-2"
                            >
                              <Check
                                className={`h-4 w-4 ${
                                  row.franchiseKitItemId === selectedKitItemId
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              <div className="min-w-0">
                                <div className="truncate">{row.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {row.sku ?? "-"} |{" "}
                                  {formatRupees(Number(row.unitPrice ?? 0))}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <div className="flex items-end gap-2">
                  <div className="w-24">
                    <Label
                      htmlFor="franchise-kit-add-qty"
                      className="text-xs text-muted-foreground"
                    >
                      Quantity
                    </Label>
                    <Input
                      id="franchise-kit-add-qty"
                      type="number"
                      min={1}
                      value={addQuantity}
                      onChange={(event) => setAddQuantity(event.target.value)}
                      onFocus={selectInputValueOnFocus}
                      className="mt-1 h-9"
                      disabled={saving}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAdd}
                    disabled={!selectedToAdd || saving}
                    className="h-9"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add item
                  </Button>
                </div>
              </div>
            </div>

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
