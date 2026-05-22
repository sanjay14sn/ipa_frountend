"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  useAllInventory,
  useInventoryItemsForLevel,
  invalidateLevelItems,
} from "@/hooks/api/inventory.hooks";
import {
  bulkAssignInventoryToLevel,
  unassignInventoryFromLevel,
} from "@/services/inventory.service";
import { InventoryCheckboxLinkPanel } from "@/components/inventory/InventoryCheckboxLinkPanel";
import {
  AppDialog,
  AppDialogBody,
  AppDialogHeader,
} from "@/components/shared/dialog";

export function LevelMaterialsPicker({
  levelId,
  disabled,
}: {
  levelId: number;
  disabled?: boolean;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  const { data: catalog = [], isLoading: isLoadingCatalog } = useAllInventory(
    hasRequested,
  );
  const {
    data: assigned = [],
    isLoading: isLoadingAssigned,
    refetch: refetchAssigned,
  } = useInventoryItemsForLevel(levelId, hasRequested);

  const assignedIds = useMemo(
    () => new Set(assigned.map((item) => item.id)),
    [assigned],
  );

  const handleRemove = async (inventoryId: number) => {
    try {
      await unassignInventoryFromLevel(levelId, inventoryId);
      toast.success("Removed from level");
      await refetchAssigned();
    } catch (e) {
      toast.error(getUserFriendlyMessage(e));
    }
  };

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {!hasRequested ? (
        <span className="text-xs text-muted-foreground">Open to load</span>
      ) : isLoadingAssigned || isLoadingCatalog ? (
        <span className="text-xs text-muted-foreground">Loading...</span>
      ) : (
        <span className="text-xs text-muted-foreground">
          {assigned.length} linked
        </span>
      )}

      {!disabled ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-6 w-6 shrink-0"
            title="Manage materials"
            aria-label="Manage materials"
            onClick={() => {
              if (!hasRequested) setHasRequested(true);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>

          <AppDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            size="xl"
            padding="flush"
            scrollBody
          >
            <AppDialogHeader
              title="Level Materials"
              description="Add and remove inventory items for this level."
              sticky
            />
            <AppDialogBody>
              <InventoryCheckboxLinkPanel
                key={levelId}
                linkedItems={assigned}
                linkedInventoryIds={assignedIds}
                catalogItems={catalog}
                isCatalogLoading={isLoadingCatalog}
                onUnlink={(item) => void handleRemove(item.id)}
                onSave={async (items) => {
                  const { assigned: count, failed } =
                    await bulkAssignInventoryToLevel(levelId, items);
                  await invalidateLevelItems(levelId);
                  await refetchAssigned();
                  if (failed.length > 0) {
                    toast.error(`${count} linked, ${failed.length} failed`);
                  } else {
                    toast.success(
                      `${items.length} item${items.length !== 1 ? "s" : ""} linked to level`,
                    );
                  }
                }}
              />
            </AppDialogBody>
          </AppDialog>
        </>
      ) : null}
    </div>
  );
}
