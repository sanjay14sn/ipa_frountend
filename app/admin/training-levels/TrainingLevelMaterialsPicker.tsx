"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
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

export function TrainingLevelMaterialsPicker({
  trainingLevelId,
  disabled,
}: {
  trainingLevelId: number;
  disabled?: boolean;
}) {
  const { toast } = useToast();
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
      toast({ title: "Removed from training level" });
      await refetchAssigned();
    } catch (e) {
      toast({
        title: "Error",
        description: getUserFriendlyMessage(e),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {!hasRequested ? (
        <span className="text-xs text-muted-foreground">Open to load</span>
      ) : isLoadingAssigned || isLoadingCatalog ? (
        <span className="text-xs text-muted-foreground">Loading...</span>
      ) : (
        <span className="text-xs text-muted-foreground">{assigned.length} linked</span>
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

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Level Materials</DialogTitle>
                <DialogDescription>
                  Add and remove inventory items for this CI training level.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Section 1: Already linked */}
                <div className="rounded-lg border p-3">
                  <div className="mb-2 text-sm font-medium">Linked items</div>
                  {isLoadingAssigned || isLoadingCatalog ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : assigned.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No linked items.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {assigned.map((item) => (
                        <Badge
                          key={item.id}
                          variant="secondary"
                          className="h-7 max-w-full gap-1 py-0 pl-1.5 pr-1 font-normal"
                        >
                          <span className="max-w-[220px] truncate">{item.name}</span>
                          <button
                            type="button"
                            disabled={disabled}
                            className="rounded-sm px-1 text-gray-500 hover:bg-muted hover:text-destructive disabled:opacity-50"
                            aria-label={`Remove ${item.name}`}
                            onClick={() => void handleRemove(item.id)}
                          >
                            x
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sections 2 + 3: Pending selections + catalog */}
                <InventoryCheckboxLinkPanel
                  key={trainingLevelId}
                  linkedInventoryIds={assignedIds}
                  catalogItems={catalog}
                  isCatalogLoading={isLoadingCatalog}
                  onSave={async (items) => {
                    const { assigned: count, failed } =
                      await bulkAssignInventoryToTrainingLevel(trainingLevelId, items);
                    await invalidateTrainingLevelItems(trainingLevelId);
                    await refetchAssigned();
                    if (failed.length > 0) {
                      toast({
                        title: `${count} linked, ${failed.length} failed`,
                        variant: "destructive",
                      });
                    } else {
                      toast({
                        title: `${items.length} item${items.length !== 1 ? "s" : ""} linked to training level`,
                      });
                    }
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}
