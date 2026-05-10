"use client";

import { useEffect, useRef, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  bulkAssignInventoryToProgramKit,
  removeInventoryFromProgramKit,
  updateProgramKitItem,
  type Inventory,
} from "@/services/inventory.service";
import { InventoryCheckboxLinkPanel } from "@/components/inventory/InventoryCheckboxLinkPanel";
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
  const [draftQuantities, setDraftQuantities] = useState<
    Record<number, string>
  >({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  const programKitQuery = useProgramKitItems(programId);
  const kitItems = (programKitQuery.data ?? []) as ProgramKitItemSummary[];
  const kitCatalogQuery = useKitCatalog();
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

        <InventoryCheckboxLinkPanel
          linkedInventoryIds={new Set(kitItems.map((item) => item.inventoryId))}
          catalogItems={catalog}
          isCatalogLoading={isCatalogLoading}
          onSave={async (items) => {
            await bulkAssignInventoryToProgramKit(programId, items);
            await invalidateProgramKitItems(programId);
            await programKitQuery.refetch();
            toast({ title: `${items.length} item${items.length !== 1 ? "s" : ""} added to kit` });
          }}
        />
      </div>
    </div>
  );
}
