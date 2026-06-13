"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  bulkAssignFranchiseKitTemplateItems,
  getFranchiseKitTemplateItems,
  removeFranchiseKitTemplateItem,
  updateFranchiseKitTemplateItem,
  type FranchiseKitTemplateItem,
  type Inventory,
} from "@/services/inventory.service";
import { InventoryCheckboxLinkPanel } from "@/components/inventory/InventoryCheckboxLinkPanel";
import { useKitCatalog } from "@/hooks/api/inventory.hooks";
import { queryKeys } from "@/hooks/api/query-keys";

function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0;
}

interface FranchiseKitManagementProps {
  programId: number;
  programName: string;
}

/**
 * Admin master list of franchise kit items for a program — the template every
 * new franchise on that program is seeded from. Per-franchise quantity/price
 * overrides are edited on the franchise agreement workspace.
 */
export function FranchiseKitManagement({
  programId,
  programName,
}: FranchiseKitManagementProps) {
  const queryClient = useQueryClient();
  const [draftQuantities, setDraftQuantities] = useState<Record<number, string>>(
    {},
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const templateQuery = useQuery({
    queryKey: queryKeys.inventory.franchiseKitTemplate(programId),
    queryFn: () => getFranchiseKitTemplateItems(programId),
  });
  const kitItems = useMemo(
    () => (templateQuery.data ?? []) as FranchiseKitTemplateItem[],
    [templateQuery.data],
  );

  const kitCatalogQuery = useKitCatalog();
  const catalog = useMemo(
    () => (kitCatalogQuery.data ?? []) as Inventory[],
    [kitCatalogQuery.data],
  );
  const linkedInventoryIds = useMemo(
    () => new Set(kitItems.map((item) => item.inventoryId)),
    [kitItems],
  );
  const isLoading = templateQuery.isLoading;

  useEffect(() => {
    setDraftQuantities(
      Object.fromEntries(
        kitItems.map((row) => [
          row.franchiseKitItemId,
          String(row.defaultQuantity ?? 1),
        ]),
      ),
    );
  }, [kitItems]);

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.inventory.franchiseKitTemplate(programId),
    });
    await templateQuery.refetch();
  };

  const handleSaveQuantity = async (item: FranchiseKitTemplateItem) => {
    const rawValue =
      draftQuantities[item.franchiseKitItemId] ??
      String(item.defaultQuantity ?? 1);
    const quantity = Number(rawValue);

    if (!isPositiveInteger(quantity)) {
      toast.error("Default quantity must be a positive whole number");
      return;
    }
    if (quantity === Number(item.defaultQuantity ?? 1)) {
      return;
    }

    setPendingKey(`save-${item.franchiseKitItemId}`);
    try {
      await updateFranchiseKitTemplateItem(item.franchiseKitItemId, {
        defaultQuantity: quantity,
      });
      await refresh();
      toast.success("Quantity updated");
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    } finally {
      setPendingKey(null);
    }
  };

  const handleRemove = async (item: FranchiseKitTemplateItem) => {
    setPendingKey(`remove-${item.franchiseKitItemId}`);
    try {
      await removeFranchiseKitTemplateItem(item.franchiseKitItemId);
      await refresh();
      toast.success("Removed from franchise kit");
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-gray-900">
            Franchise kit items
          </h3>
          <Badge variant="secondary">{kitItems.length} items</Badge>
        </div>
        <p className="text-xs text-gray-500">
          Master kit every new {programName} franchise is seeded with. Customize
          per franchise from the franchise agreement.
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
              No franchise kit items yet. Add items from inventory below.
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
                      Catalog price
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
                      draftQuantities[item.franchiseKitItemId] ??
                      String(item.defaultQuantity ?? 1);
                    const parsedDraft = Number(rawDraft);
                    const quantityChanged =
                      rawDraft !== "" &&
                      parsedDraft !== Number(item.defaultQuantity ?? 1);
                    const quantityValid = isPositiveInteger(parsedDraft);
                    const saveDisabled =
                      pendingKey !== null || !quantityChanged || !quantityValid;

                    return (
                      <tr
                        key={item.franchiseKitItemId}
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
                          <div className="mt-1 text-xs text-gray-500">
                            {item.category || "Uncategorized"}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top text-xs text-gray-600">
                          ₹{item.unitPrice.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                              id={`franchise-kit-qty-${item.franchiseKitItemId}`}
                              type="number"
                              min="1"
                              inputMode="numeric"
                              value={rawDraft}
                              onChange={(event) =>
                                setDraftQuantities((prev) => ({
                                  ...prev,
                                  [item.franchiseKitItemId]: event.target.value,
                                }))
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
          linkedInventoryIds={linkedInventoryIds}
          catalogItems={catalog}
          isCatalogLoading={kitCatalogQuery.isLoading}
          onSave={async (items) => {
            const { assigned, failed } =
              await bulkAssignFranchiseKitTemplateItems(programId, items);
            await refresh();
            if (failed.length > 0) {
              toast.error(`${assigned} added, ${failed.length} failed`);
            } else {
              toast.success(
                `${items.length} item${items.length !== 1 ? "s" : ""} added to franchise kit`,
              );
            }
          }}
        />
      </div>
    </div>
  );
}
