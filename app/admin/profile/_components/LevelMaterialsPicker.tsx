"use client";

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
import { EntityLinkPicker } from "@/components/shared/dialog/entity-link-picker";

export function LevelMaterialsPicker({
  levelId,
  disabled,
}: {
  levelId: number;
  disabled?: boolean;
}) {
  return (
    <EntityLinkPicker
      panel="inventory"
      triggerLabel="Manage materials"
      dialogTitle="Level Materials"
      dialogDescription="Add and remove inventory items for this level."
      disabled={disabled}
      useCatalog={(enabled) =>
        // eslint-disable-next-line react-hooks/rules-of-hooks -- invoked during EntityLinkPicker render (hook-injection API, CMP-09)
        useAllInventory(enabled)
      }
      useAssigned={(enabled) =>
        // eslint-disable-next-line react-hooks/rules-of-hooks -- invoked during EntityLinkPicker render (hook-injection API, CMP-09)
        useInventoryItemsForLevel(levelId, enabled)
      }
      assign={async (items) => {
        const { assigned: count, failed } = await bulkAssignInventoryToLevel(
          levelId,
          items,
        );
        await invalidateLevelItems(levelId);
        if (failed.length > 0) {
          toast.error(`${count} linked, ${failed.length} failed`);
        } else {
          toast.success(
            `${items.length} item${items.length !== 1 ? "s" : ""} linked to level`,
          );
        }
      }}
      unassign={async (inventoryId) => {
        try {
          await unassignInventoryFromLevel(levelId, inventoryId);
          toast.success("Removed from level");
        } catch (e) {
          toast.error(getUserFriendlyMessage(e));
        }
      }}
    />
  );
}
