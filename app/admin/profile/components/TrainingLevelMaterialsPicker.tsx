"use client";

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
import { EntityLinkPicker } from "@/components/shared/dialog/entity-link-picker";

export function TrainingLevelMaterialsPicker({
  trainingLevelId,
  disabled,
}: {
  trainingLevelId: number;
  disabled?: boolean;
}) {
  return (
    <EntityLinkPicker
      panel="inventory"
      counter="badge"
      triggerLabel="Manage materials"
      dialogTitle="Level Materials"
      dialogDescription="Add and remove inventory items for this CI training level."
      disabled={disabled}
      useCatalog={(enabled) => useAllInventory(enabled)}
      useAssigned={(enabled) =>
        useInventoryItemsForTrainingLevel(trainingLevelId, enabled)
      }
      assign={async (items) => {
        const { assigned: count, failed } =
          await bulkAssignInventoryToTrainingLevel(trainingLevelId, items);
        await invalidateTrainingLevelItems(trainingLevelId);
        if (failed.length > 0) {
          toast.error(`${count} linked, ${failed.length} failed`);
        } else {
          toast.success(
            `${items.length} item${items.length !== 1 ? "s" : ""} linked to training level`,
          );
        }
      }}
      unassign={async (inventoryId) => {
        try {
          await unassignInventoryFromTrainingLevel(
            trainingLevelId,
            inventoryId,
          );
          toast.success("Removed from training level");
        } catch (e) {
          toast.error(getUserFriendlyMessage(e));
        }
      }}
    />
  );
}
