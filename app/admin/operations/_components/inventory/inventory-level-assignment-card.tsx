"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Unlink2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  bulkAssignInventoryToLevel,
  getAllInventory,
  unassignInventoryFromLevel,
  type InventoryItemSummary,
} from "@/services/inventory.service";
import { InventoryCheckboxLinkPanel } from "@/components/inventory/InventoryCheckboxLinkPanel";
import { invalidateLevelItems } from "@/hooks/api/inventory.hooks";

type Props = {
  levelIdNum: number;
  assignedItems: InventoryItemSummary[];
  onRefresh: () => Promise<void>;
  onAssignedItemsRefetch: () => Promise<unknown>;
};

export function InventoryLevelAssignmentCard({
  levelIdNum,
  assignedItems,
  onRefresh,
  onAssignedItemsRefetch,
}: Props) {
  const catalogQuery = useQuery({
    queryKey: ["inventory", "catalog", "all"],
    queryFn: getAllInventory,
  });

  async function handleUnassign(inventoryId: number) {
    try {
      await unassignInventoryFromLevel(levelIdNum, inventoryId);
      toast.success("Removed from level");
      await onRefresh();
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    }
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Level template assignments</CardTitle>
        <p className="text-sm text-muted-foreground">
          The selected level currently has {assignedItems.length} assigned catalog item
          {assignedItems.length !== 1 ? "s" : ""}.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          {assignedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No items assigned to this level yet.
            </p>
          ) : (
            assignedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.sku} · default qty {item.defaultQuantity ?? 1}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => void handleUnassign(item.id)}
                >
                  <Unlink2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </div>
            ))
          )}
        </div>

        <InventoryCheckboxLinkPanel
          key={levelIdNum}
          linkedInventoryIds={new Set(assignedItems.map((item) => item.id))}
          catalogItems={catalogQuery.data ?? []}
          isCatalogLoading={catalogQuery.isLoading}
          onSave={async (items) => {
            const { assigned, failed } = await bulkAssignInventoryToLevel(levelIdNum, items);
            await invalidateLevelItems(levelIdNum);
            await onAssignedItemsRefetch();
            if (failed.length > 0) {
              toast.error(`${assigned} assigned, ${failed.length} failed`);
            } else {
              toast.success(`${items.length} item${items.length !== 1 ? "s" : ""} assigned to level`);
            }
          }}
        />
      </CardContent>
    </Card>
  );
}
