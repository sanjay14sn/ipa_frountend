"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  assignInventoryToProgramKit,
  removeInventoryFromProgramKit,
  updateProgramKitItem,
  type Inventory,
} from "@/services/inventory.service";
import {
  invalidateProgramKitItems,
  useKitCatalog,
  useProgramKitItems,
  type ProgramKitItemSummary,
} from "@/hooks/api/inventory.hooks";

interface ProgramKitManagementProps {
  programId: number;
  programName: string;
  onCountChange?: (count: number) => void;
}

function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0;
}

export function ProgramKitManagement({
  programId,
  programName,
  onCountChange,
}: ProgramKitManagementProps) {
  const { toast } = useToast();
  const onCountChangeRef = useRef(onCountChange);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [hasRequestedCatalog, setHasRequestedCatalog] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(
    null,
  );
  const [newQuantity, setNewQuantity] = useState("1");
  const [draftQuantities, setDraftQuantities] = useState<
    Record<number, string>
  >({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  const programKitQuery = useProgramKitItems(programId);
  const kitItems = (programKitQuery.data ?? []) as ProgramKitItemSummary[];
  const kitCatalogQuery = useKitCatalog(hasRequestedCatalog);
  const catalog = (kitCatalogQuery.data ?? []) as Inventory[];
  const isLoading = programKitQuery.isLoading;
  const isCatalogLoading = kitCatalogQuery.isLoading;

  useEffect(() => {
    setDraftQuantities(
      Object.fromEntries(
        kitItems.map((row) => [row.programKitId, String(row.defaultQuantity ?? 1)]),
      ),
    );
    onCountChangeRef.current?.(kitItems.length);
  }, [kitItems]);

  useEffect(() => {
    setIsCatalogOpen(false);
    setHasRequestedCatalog(false);
    setSelectedInventoryId(null);
    setNewQuantity("1");
  }, [programId]);

  const handleCatalogOpenChange = (open: boolean) => {
    setIsCatalogOpen(open);
    if (open && !hasRequestedCatalog) {
      setHasRequestedCatalog(true);
    }
  };

  const availableCatalog = useMemo(() => {
    const assignedInventoryIds = new Set(kitItems.map((item) => item.inventoryId));
    return catalog.filter((item) => !assignedInventoryIds.has(item.id));
  }, [catalog, kitItems]);

  const selectedInventory = useMemo(
    () =>
      availableCatalog.find((item) => item.id === selectedInventoryId) ?? null,
    [availableCatalog, selectedInventoryId],
  );

  const addQuantityValue = Number(newQuantity);
  const addQuantityValid = isPositiveInteger(addQuantityValue);

  const handleAdd = async () => {
    if (!selectedInventoryId) {
      toast({
        title: "Error",
        description: "Select an inventory item to add",
        variant: "destructive",
      });
      return;
    }

    if (!addQuantityValid) {
      toast({
        title: "Error",
        description: "Default quantity must be a positive whole number",
        variant: "destructive",
      });
      return;
    }

    setPendingKey("add");
    try {
      await assignInventoryToProgramKit(
        programId,
        selectedInventoryId,
        addQuantityValue,
      );
      await invalidateProgramKitItems(programId);
      toast({ title: "Item added to kit" });
      setSelectedInventoryId(null);
      setNewQuantity("1");
      setIsCatalogOpen(false);
      await programKitQuery.refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: getUserFriendlyMessage(error),
        variant: "destructive",
      });
    } finally {
      setPendingKey(null);
    }
  };

  const handleQuantityChange = (programKitId: number, value: string) => {
    setDraftQuantities((prev) => ({
      ...prev,
      [programKitId]: value,
    }));
  };

  const handleSaveQuantity = async (item: ProgramKitItemSummary) => {
    const rawValue =
      draftQuantities[item.programKitId] ?? String(item.defaultQuantity ?? 1);
    const quantity = Number(rawValue);

    if (!isPositiveInteger(quantity)) {
      toast({
        title: "Error",
        description: "Default quantity must be a positive whole number",
        variant: "destructive",
      });
      return;
    }

    if (quantity === Number(item.defaultQuantity ?? 1)) {
      return;
    }

    setPendingKey(`save-${item.programKitId}`);
    try {
      await updateProgramKitItem(item.programId, item.programKitId, {
        defaultQuantity: quantity,
      });
      await invalidateProgramKitItems(programId);
      toast({ title: "Quantity updated" });
      await programKitQuery.refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: getUserFriendlyMessage(error),
        variant: "destructive",
      });
    } finally {
      setPendingKey(null);
    }
  };

  const handleRemove = async (item: ProgramKitItemSummary) => {
    setPendingKey(`remove-${item.programKitId}`);
    try {
      await removeInventoryFromProgramKit(item.programId, item.programKitId);
      await invalidateProgramKitItems(programId);
      toast({ title: "Removed from kit" });
      await programKitQuery.refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: getUserFriendlyMessage(error),
        variant: "destructive",
      });
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-gray-900">
            Program kit items
          </h3>
          <Badge variant="secondary">{kitItems.length} items</Badge>
        </div>
        <p className="text-xs text-gray-500">
          Add default kit inventory for {programName}.
        </p>
      </div>

      <div className="mt-4 space-y-4">
        <div className="overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2.5">
            <h4 className="text-sm font-medium text-gray-900">Assigned items</h4>
            {!isLoading && kitItems.length > 0 ? (
              <span className="text-xs text-gray-500">Edit quantity inline</span>
            ) : null}
          </div>

          {isLoading ? (
            <div className="px-3 py-5 text-sm text-gray-500">
              Loading kit items...
            </div>
          ) : kitItems.length === 0 ? (
            <div className="bg-emerald-50/40 px-3 py-5 text-sm text-gray-600">
              No kit items assigned yet. Add items from inventory below.
            </div>
          ) : (
            <div className="overflow-x-auto bg-white">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[36%]" />
                  <col className="w-[20%]" />
                  <col className="w-[28%]" />
                  <col className="w-[110px]" />
                </colgroup>
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-3 py-3 text-left font-medium text-gray-700">
                      Item
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">
                      Details
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">
                      Default qty
                    </th>
                    <th className="px-3 py-3 text-right font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {kitItems.map((item) => {
                    const rawDraft =
                      draftQuantities[item.programKitId] ??
                      String(item.defaultQuantity ?? 1);
                    const parsedDraft = Number(rawDraft);
                    const quantityChanged =
                      rawDraft !== "" &&
                      parsedDraft !== Number(item.defaultQuantity ?? 1);
                    const quantityValid = isPositiveInteger(parsedDraft);
                    const saveDisabled =
                      pendingKey !== null ||
                      !quantityChanged ||
                      !quantityValid;

                    return (
                      <tr
                        key={item.programKitId}
                        className="border-b border-gray-100 align-top last:border-b-0"
                      >
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-gray-900">
                              {item.name}
                            </p>
                            {item.sku ? (
                              <Badge variant="outline" className="text-[10px]">
                                {item.sku}
                              </Badge>
                            ) : null}
                            {!item.isActive || !item.inventoryIsActive ? (
                              <Badge
                                variant="outline"
                                className="border-amber-200 bg-amber-50 text-amber-700"
                              >
                                Inactive
                              </Badge>
                            ) : null}
                          </div>
                          {item.description ? (
                            <div className="mt-1 text-xs text-gray-500">
                              {item.description}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 align-top text-xs text-gray-500">
                          <div>{item.category?.name || "Uncategorized"}</div>
                          <div className="mt-1">Available {item.availableQty}</div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                              id={`kit-qty-${item.programKitId}`}
                              type="number"
                              min="1"
                              inputMode="numeric"
                              value={rawDraft}
                              onChange={(event) =>
                                handleQuantityChange(
                                  item.programKitId,
                                  event.target.value,
                                )
                              }
                              className="h-9 w-full sm:w-24"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={saveDisabled}
                              onClick={() => void handleSaveQuantity(item)}
                              className="sm:h-9"
                            >
                              <Save className="mr-2 h-4 w-4" />
                              Save
                            </Button>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right align-top">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={pendingKey !== null}
                            onClick={() => void handleRemove(item)}
                            className="h-8 w-8 rounded-md p-0 text-destructive hover:bg-red-50 hover:text-destructive"
                            title={`Remove ${item.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-dashed bg-slate-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Add existing inventory
              </h4>
              <p className="mt-1 text-xs text-gray-600">
                Inventory loads only when you open the picker.
              </p>
            </div>
          </div>

          <div className="mt-3">
            <Popover open={isCatalogOpen} onOpenChange={handleCatalogOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={isCatalogOpen}
                  className="w-full justify-between border-dashed bg-white text-left font-normal text-gray-700 hover:bg-muted/20"
                >
                  <span className="truncate">
                    {selectedInventory
                      ? selectedInventory.name
                      : isCatalogLoading
                        ? "Loading inventory catalog..."
                        : hasRequestedCatalog
                          ? "Choose an inventory item"
                          : "Open inventory catalog"}
                  </span>
                  {isCatalogLoading ? (
                    <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin text-gray-500" />
                  ) : (
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-500" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[var(--radix-popover-trigger-width)] p-0"
              >
                <Command>
                  <CommandInput placeholder="Search inventory items..." />
                  <CommandList className="max-h-56">
                    {isCatalogLoading ? (
                      <div className="px-3 py-6 text-sm text-gray-500">
                        Loading inventory items...
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>
                          {availableCatalog.length === 0
                            ? "All available inventory items are already assigned."
                            : "No inventory items match your search."}
                        </CommandEmpty>
                        <CommandGroup heading="Inventory catalog">
                          {availableCatalog.map((item) => {
                            const selected = item.id === selectedInventoryId;
                            return (
                              <CommandItem
                                key={item.id}
                                value={[
                                  item.name,
                                  item.sku,
                                  item.category?.name,
                                  item.description,
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                onSelect={() => {
                                  setSelectedInventoryId(item.id);
                                  setIsCatalogOpen(false);
                                }}
                                className="items-start gap-3 px-3 py-3"
                              >
                                <div
                                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                    selected
                                      ? "border-emerald-600 bg-emerald-600 text-white"
                                      : "border-gray-300 bg-white text-transparent"
                                  }`}
                                >
                                  <Check className="h-3 w-3" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium text-gray-900">
                                    {item.name}
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                                    {item.sku ? <span>{item.sku}</span> : null}
                                    {item.category?.name ? (
                                      <span>{item.category.name}</span>
                                    ) : null}
                                    <span>Available {item.availableQty}</span>
                                  </div>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedInventory ? (
            <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-3">
              <p className="text-sm font-medium text-emerald-950">
                {selectedInventory.name}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-emerald-800/80">
                {selectedInventory.sku ? (
                  <span>SKU {selectedInventory.sku}</span>
                ) : null}
                {selectedInventory.category?.name ? (
                  <span>{selectedInventory.category.name}</span>
                ) : null}
                <span>Available {selectedInventory.availableQty}</span>
              </div>
            </div>
          ) : null}

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:w-24">
              <Label
                htmlFor={`program-kit-add-${programId}`}
                className="text-xs text-gray-600"
              >
                Quantity
              </Label>
              <Input
                id={`program-kit-add-${programId}`}
                type="number"
                min="1"
                inputMode="numeric"
                value={newQuantity}
                onChange={(event) => setNewQuantity(event.target.value)}
                className="mt-1 h-9"
              />
            </div>
            <Button
              type="button"
              onClick={() => void handleAdd()}
              disabled={
                pendingKey !== null ||
                !selectedInventoryId ||
                !addQuantityValid ||
                availableCatalog.length === 0
              }
              className="bg-primary hover:bg-primary/90 sm:h-9"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add to kit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
