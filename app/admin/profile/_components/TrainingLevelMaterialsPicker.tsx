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
import { InventoryCheckboxLinkPanel } from "@/components/inventory/InventoryCheckboxLinkPanel";
import { EntityLinkPicker } from "@/components/shared/dialog/entity-link-picker";

export function TrainingLevelMaterialsPicker({
  trainingLevelId,
  disabled,
}: {
  trainingLevelId: number;
  disabled?: boolean;
}) {
  const assign = async (
    items: Array<{ inventoryId: number; quantity: number }>,
  ) => {
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
  };

  return (
    <EntityLinkPicker
      counter="badge"
      triggerLabel="Manage materials"
      dialogTitle="Level Materials"
      dialogDescription="Add and remove inventory items for this CI training level."
      disabled={disabled}
      useCatalog={(enabled) =>
        // eslint-disable-next-line react-hooks/rules-of-hooks -- invoked during EntityLinkPicker render (hook-injection API, CMP-09)
        useAllInventory(enabled)
      }
      useAssigned={(enabled) =>
        // eslint-disable-next-line react-hooks/rules-of-hooks -- invoked during EntityLinkPicker render (hook-injection API, CMP-09)
        useInventoryItemsForTrainingLevel(trainingLevelId, enabled)
      }
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
      renderPanel={({
        catalog,
        isCatalogLoading,
        assigned,
        assignedIds,
        onUnlink,
        refetchAssigned,
      }) => (
        <InventoryCheckboxLinkPanel
          linkedItems={assigned as never}
          linkedInventoryIds={assignedIds}
          catalogItems={catalog as never}
          isCatalogLoading={isCatalogLoading}
          onUnlink={(item) => {
            if (typeof item.id === "number") onUnlink(item.id);
          }}
          onSave={async (items) => {
            await assign(items);
            await refetchAssigned();
          }}
        />
      )}
    />
  );
}
