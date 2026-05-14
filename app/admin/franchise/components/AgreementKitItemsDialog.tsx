"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, Plus, Save, Trash2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
      categoryName: row.category?.name ?? null,
    }));
}

interface AgreementKitItemsDialogProps {
  agreement: AgreementRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgreementKitItemsDialog({
  agreement,
  open,
  onOpenChange,
}: AgreementKitItemsDialogProps) {
  const queryClient = useQueryClient();
  const agreementId = agreement?.id ?? null;
  const canManage = agreementId != null && agreement?.programId != null;
  const [selectedRows, setSelectedRows] = useState<SelectedRow[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedProgramKitId, setSelectedProgramKitId] = useState<number | null>(
    null,
  );
  const [addQuantity, setAddQuantity] = useState("1");
  const [saving, setSaving] = useState(false);

  const queryKey = ["inventory", "agreement-kit-items", agreementId] as const;
  const agreementKitQuery = useQuery({
    queryKey,
    queryFn: () => getAgreementProgramKitItems(agreementId!),
    enabled: open && canManage,
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
  const selectedToAdd =
    availableRows.find((row) => row.programKitId === selectedProgramKitId) ?? null;

  useEffect(() => {
    if (!agreementKitQuery.data) return;
    setSelectedRows(toSelectedRows(agreementKitQuery.data));
  }, [agreementKitQuery.data]);

  useEffect(() => {
    if (!open) {
      setCatalogOpen(false);
      setSelectedProgramKitId(null);
      setAddQuantity("1");
    }
  }, [open]);

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

  const handleAdd = () => {
    if (!selectedToAdd) {
      toast.error("Select a program kit item to add.");
      return;
    }
    const qty = Math.max(1, Math.floor(Number(addQuantity) || 1));
    setSelectedRows((prev) => [
      ...prev,
      {
        programKitId: selectedToAdd.programKitId,
        name: selectedToAdd.name,
        sku: selectedToAdd.sku ?? null,
        quantity: qty,
        availableQty: Number(selectedToAdd.availableQty ?? 0),
        categoryName: selectedToAdd.category?.name ?? null,
      },
    ]);
    setSelectedProgramKitId(null);
    setAddQuantity("1");
    setCatalogOpen(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {agreementId
              ? `Manage kit items - Agreement #${agreementId}`
              : "Manage kit items"}
          </DialogTitle>
          <DialogDescription>
            Edit selected program kit items for this agreement.
          </DialogDescription>
        </DialogHeader>

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

            <div className="rounded-lg border border-dashed bg-muted/20 p-3">
              <h4 className="text-sm font-medium">Add item</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick from available program kit items and set quantity.
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
                        {selectedToAdd
                          ? selectedToAdd.name
                          : "Select program kit item"}
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
                            ? "All available items are already selected."
                            : "No item matches your search."}
                        </CommandEmpty>
                        <CommandGroup>
                          {availableRows.map((row) => (
                            <CommandItem
                              key={row.programKitId}
                              value={`${row.name} ${row.sku ?? ""} ${row.category?.name ?? ""}`}
                              onSelect={() =>
                                setSelectedProgramKitId(row.programKitId)
                              }
                              className="gap-2"
                            >
                              <Check
                                className={`h-4 w-4 ${
                                  row.programKitId === selectedProgramKitId
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              <div className="min-w-0">
                                <div className="truncate">{row.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {row.sku ?? "-"} | {row.category?.name ?? "-"}
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
                      htmlFor="agreement-kit-qty"
                      className="text-xs text-muted-foreground"
                    >
                      Quantity
                    </Label>
                    <Input
                      id="agreement-kit-qty"
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Close
              </Button>
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
      </DialogContent>
    </Dialog>
  );
}
