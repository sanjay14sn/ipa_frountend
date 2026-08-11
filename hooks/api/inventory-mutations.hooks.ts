import { queryKeys } from "@/hooks/api/query-keys";
import { getQueryClientBridge } from "@/hooks/api/query-client-bridge";

export async function invalidateInventoryAdminLists() {
  try {
    const qc = getQueryClientBridge();
    await qc.invalidateQueries({ queryKey: queryKeys.inventory.listPrefix });
    await qc.invalidateQueries({ queryKey: queryKeys.inventory.monitoring });
  } catch {
    /* ignore */
  }
}

/**
 * Invalidate the caches that can change as a side-effect of a manual
 * stock adjustment.
 *
 * @param materialId  The inventory item that was adjusted. Its detail cache
 *   is invalidated first (most targeted). If omitted, only the broad list
 *   keys are refreshed.
 *
 * Cross-domain ripples (intentional):
 *   - Orders: a positive adjustment can flip backordered order lines to
 *     ALLOCATED, changing `allocationStatus` visible in admin/franchisee order
 *     lists and detail pages.
 *   - CI training: CI-material orders are linked to training sessions, so their
 *     allocation state changes too.
 *   - Operations monitoring: shows backorder counts which change on adjustment.
 *
 * These cannot be scoped narrower without a backend change that returns the
 * affected order/session IDs in the stock-adjustment response.
 */
export async function invalidateAfterStockAdjustment(materialId?: number) {
  try {
    const qc = getQueryClientBridge();
    const tasks: Promise<void>[] = [
      // --- Inventory-scoped (most targeted) ---
      qc.invalidateQueries({ queryKey: queryKeys.inventory.listPrefix }),
      qc.invalidateQueries({ queryKey: queryKeys.inventory.monitoring }),
      qc.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    ];

    // Invalidate the specific item's detail cache when we know which item
    // was adjusted — avoids re-fetching every detail page on the next render.
    if (materialId != null) {
      tasks.push(
        qc.invalidateQueries({
          queryKey: queryKeys.inventory.detail(materialId),
        }),
        qc.invalidateQueries({
          queryKey: queryKeys.inventory.movementsPrefix(materialId),
        }),
      );
    }

    // --- Cross-domain (see JSDoc above) ---
    tasks.push(
      // Admin & franchisee order lists / details.
      qc.invalidateQueries({ queryKey: queryKeys.orders.adminListPrefix }),
      qc.invalidateQueries({ queryKey: queryKeys.orders.franchiseeListPrefix }),
      qc.invalidateQueries({ queryKey: queryKeys.orders.adminDetailPrefix }),
      qc.invalidateQueries({ queryKey: queryKeys.orders.franchiseeDetailPrefix }),
      // CI training views surface CI-material order allocation state.
      qc.invalidateQueries({ queryKey: queryKeys.courseInstructors.ciTraining }),
      qc.invalidateQueries({
        queryKey: queryKeys.courseInstructors.trainingList,
      }),
      // Operations monitoring may show backorder counts.
      qc.invalidateQueries({ queryKey: queryKeys.operations.monitoring }),
    );

    await Promise.all(tasks);
  } catch {
    /* ignore */
  }
}

export async function invalidateProgramKitItems(programId: number) {
  try {
    await getQueryClientBridge().invalidateQueries({
      queryKey: queryKeys.inventory.programKitItems(programId),
    });
  } catch {
    /* ignore */
  }
}

export async function invalidateLevelItems(levelId: number) {
  try {
    await getQueryClientBridge().invalidateQueries({
      queryKey: queryKeys.inventory.levelItems(levelId),
    });
  } catch {
    /* ignore */
  }
}

export async function invalidateTrainingLevelItems(trainingLevelId: number) {
  try {
    await getQueryClientBridge().invalidateQueries({
      queryKey: queryKeys.inventory.trainingLevelItems(trainingLevelId),
    });
  } catch {
    /* ignore */
  }
}
