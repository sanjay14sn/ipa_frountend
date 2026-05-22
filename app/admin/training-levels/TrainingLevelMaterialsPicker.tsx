"use client";

import { useMemo, useState } from "react";
import { Plus, Package as PackageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  useAllInventory,
  useInventoryItemsForTrainingLevel,
  invalidateTrainingLevelItems,
} from "@/hooks/api/inventory.hooks";
import {
  bulkAssignInventoryToTrainingLevel,
  unassignInventoryFromTrainingLevel,
} from "@/services/inventory.service";
import { InventoryCheckboxLinkPanel } from "@/components/inventory/InventoryCheckboxLinkPanel";
import {
  AppDialog,
  AppDialogBody,
  AppDialogHeader,
} from "@/components/shared/dialog";

export function TrainingLevelMaterialsPicker({
  trainingLevelId,
  disabled,
}: {
  trainingLevelId: number;
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
  } = useInventoryItemsForTrainingLevel(trainingLevelId, hasRequested);

  const assignedIds = useMemo(
    () => new Set(assigned.map((item) => item.id)),
    [assigned],
  );

  const handleRemove = async (inventoryId: number) => {
    try {
      await unassignInventoryFromTrainingLevel(trainingLevelId, inventoryId);
      toast.success("Removed from training level");
      await refetchAssigned();
    } catch (e) {
      toast.error(getUserFriendlyMessage(e));
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {!hasRequested ? (
        <span className="text-xs italic text-muted-foreground">Open to load</span>
      ) : isLoadingAssigned || isLoadingCatalog ? (
        <span className="text-xs text-muted-foreground">Loading…</span>
      ) : assigned.length > 0 ? (
        <Badge
          variant="outline"
          className="gap-1 rounded-full border-border bg-card font-normal text-card-foreground"
        >
          <PackageIcon className="h-3 w-3 text-muted-foreground" />
          {assigned.length} {assigned.length === 1 ? "item" : "items"}
        </Badge>
      ) : (
        <span className="text-xs italic text-muted-foreground">Open to load</span>
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
              description="Add and remove inventory items for this CI training level."
              sticky
            />
            <AppDialogBody>
              <InventoryCheckboxLinkPanel
                key={trainingLevelId}
                linkedItems={assigned}
                linkedInventoryIds={assignedIds}
                catalogItems={catalog}
                isCatalogLoading={isLoadingCatalog}
                onUnlink={(item) => void handleRemove(item.id)}
                onSave={async (items) => {
                  const { assigned: count, failed } =
                    await bulkAssignInventoryToTrainingLevel(
                      trainingLevelId,
                      items,
                    );
                  await invalidateTrainingLevelItems(trainingLevelId);
                  await refetchAssigned();
                  if (failed.length > 0) {
                    toast.error(`${count} linked, ${failed.length} failed`);
                  } else {
                    toast.success(
                      `${items.length} item${items.length !== 1 ? "s" : ""} linked to training level`,
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
