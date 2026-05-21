import type {
  InvoicePreview,
  InstructorGroupPreview,
  StartingKitGroupPreview,
  StudentBreakdown,
  StudentGroupPreview,
} from "../services/order.service";

/**
 * Overlay merge for partial API blocks: `incoming` upserts by id (incoming wins).
 * Order: first occurrence order from `existing` (one row per id), then ids that appear only in `incoming`
 * (in incoming order). Duplicate ids in `existing` are collapsed to the first occurrence's slot with
 * map values (last write to map wins for that id).
 * Removals: caller filters `existing` before calling.
 */
function mergeOverlayByNumericId<T extends object>(
  existing: T[],
  incoming: T[],
  idKey: keyof T,
): T[] {
  const map = new Map<number, T>();
  for (const g of existing) map.set(Number((g as never)[idKey]), g);
  for (const g of incoming) map.set(Number((g as never)[idKey]), g);

  const seen = new Set<number>();
  const out: T[] = [];
  for (const g of existing) {
    const id = Number((g as never)[idKey]);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    seen.add(id);
    const row = map.get(id);
    if (row != null) out.push(row);
  }
  for (const g of incoming) {
    const id = Number((g as never)[idKey]);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    seen.add(id);
    const row = map.get(id);
    if (row != null) out.push(row);
  }
  return out;
}

/**
 * Scale a starting-kit group to a new stream quantity. Preserves unit prices and stream metadata.
 * Caller should omit the group when the desired quantity is 0.
 *
 * Note: `tshirtBreakdown` is shallow-cloned but its per-row `quantity` values are NOT scaled.
 * Per-t-shirt counts are an authoritative selection (one row per chosen t-shirt), not derived
 * from the group total — scaling them proportionally would silently corrupt user intent. When
 * t-shirt selections change, the hook re-fetches the full kit block instead of relying on
 * incremental scaling (see `hooks/use-unified-invoice-preview.ts`).
 */
export function scaleStartingKitGroup(
  group: StartingKitGroupPreview,
  newQty: number,
): StartingKitGroupPreview {
  if (newQty <= 0) {
    throw new RangeError("scaleStartingKitGroup: newQty must be positive");
  }
  const oldQty = group.quantity;
  if (oldQty <= 0) {
    throw new RangeError(
      "scaleStartingKitGroup: existing quantity must be positive",
    );
  }

  const factor = newQty / oldQty;
  return {
    streamId: group.streamId,
    streamName: group.streamName,
    quantity: newQty,
    kitUnit: group.kitUnit,
    royaltyUnit: group.royaltyUnit,
    tshirtBreakdown: group.tshirtBreakdown.map((t) => ({ ...t })),
    items: group.items.map((it) => ({
      ...it,
      quantity: Math.round(it.quantity * factor),
    })),
  };
}

export function mergeStudentGroups(
  existing: StudentGroupPreview[],
  incoming: StudentGroupPreview[],
): StudentGroupPreview[] {
  return mergeOverlayByNumericId(existing, incoming, "studentId" as keyof StudentGroupPreview);
}

export function mergeInstructorGroups(
  existing: InstructorGroupPreview[],
  incoming: InstructorGroupPreview[],
): InstructorGroupPreview[] {
  return mergeOverlayByNumericId(
    existing,
    incoming,
    "instructorId" as keyof InstructorGroupPreview,
  );
}

export function mergeStartingKitGroups(
  existing: StartingKitGroupPreview[],
  incoming: StartingKitGroupPreview[],
): StartingKitGroupPreview[] {
  return mergeOverlayByNumericId(
    existing,
    incoming,
    "streamId" as keyof StartingKitGroupPreview,
  );
}

/** Same field mapping as `previewOrderInvoice` when building `students` from `studentGroups`. */
export function studentGroupsToBreakdowns(
  groups: StudentGroupPreview[],
): StudentBreakdown[] {
  return groups.map((g) => ({
    studentId: g.studentId,
    studentName: g.studentName,
    levelId: g.levelId,
    levelName: g.levelName,
    isFirstLevel: g.isFirstLevel,
    royalty: g.royalty,
    materialCost: g.materialCost,
    kitCost: g.kitCost,
    totalPrice: g.totalPrice,
    durationInMonths: g.durationInMonths,
  }));
}

export function recomputeTotalAmount(preview: InvoicePreview): number {
  let total = 0;
  for (const g of preview.studentGroups ?? []) {
    total += g.totalPrice;
  }
  for (const g of preview.startingKitGroups ?? []) {
    total += (g.kitUnit + g.royaltyUnit) * Math.max(0, g.quantity);
  }
  return total;
}

export function applyRecomputedTotal(preview: InvoicePreview): InvoicePreview {
  return {
    ...preview,
    totalAmount: recomputeTotalAmount(preview),
  };
}

/** Drop groups not in the current selection. `kitQtyByStreamId` only includes streams with quantity &gt; 0. */
export function filterInvoicePreviewBySelection(
  preview: InvoicePreview,
  opts: {
    studentIds: Set<number>;
    instructorIds: Set<number>;
    kitQtyByStreamId: Map<number, number>;
  },
): InvoicePreview {
  const studentGroups = (preview.studentGroups ?? []).filter((g) =>
    opts.studentIds.has(g.studentId),
  );
  const instructorGroups = (preview.instructorGroups ?? []).filter((g) =>
    opts.instructorIds.has(g.instructorId),
  );
  const startingKitGroups = (preview.startingKitGroups ?? []).filter((g) =>
    opts.kitQtyByStreamId.has(g.streamId),
  );
  return applyRecomputedTotal({
    ...preview,
    studentGroups,
    instructorGroups,
    startingKitGroups,
    students: studentGroupsToBreakdowns(studentGroups),
  });
}

/**
 * For each stream in `kitQtyByStreamId`, if a group exists and its quantity differs, scale in place.
 * Caller should pass only streams that already have a priced group (qty &gt; 0).
 */
export function applyStartingKitQuantityScales(
  preview: InvoicePreview,
  kitQtyByStreamId: Map<number, number>,
): InvoicePreview {
  const groups = preview.startingKitGroups ?? [];
  let changed = false;
  const nextGroups = groups.map((g) => {
    const target = kitQtyByStreamId.get(g.streamId);
    if (target == null || target === g.quantity) return g;
    changed = true;
    return scaleStartingKitGroup(g, target);
  });
  if (!changed) return preview;
  return applyRecomputedTotal({
    ...preview,
    startingKitGroups: nextGroups,
  });
}
