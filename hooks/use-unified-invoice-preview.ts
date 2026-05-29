"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyRecomputedTotal,
  applyStartingKitQuantityScales,
  filterInvoicePreviewBySelection,
  mergeInstructorGroups,
  mergeStartingKitGroups,
  mergeStudentGroups,
  studentGroupsToBreakdowns,
} from "@/lib/invoice-preview-merge";
import {
  previewOrderInvoice,
  type InvoicePreview,
  type CustomGroupPreview,
} from "@/services/order.service";

export interface StartingKitSelectionItem {
  streamId: number;
  quantity: number;
  tshirtItemId: number | null;
}

export interface CustomMaterialSelectionItem {
  studentId: number;
  inventoryItemId: number;
  quantity: number;
}

function emptyPreview(seed?: Partial<InvoicePreview>): InvoicePreview {
  return {
    franchiseId: seed?.franchiseId ?? "",
    programId: seed?.programId ?? 0,
    levelId: seed?.levelId ?? 0,
    isFirstLevel: seed?.isFirstLevel ?? false,
    students: [],
    lines: [],
    totalAmount: 0,
    studentGroups: [],
    startingKitGroups: [],
    instructorGroups: [],
  };
}

function mergeOnePreviewBlock(
  base: InvoicePreview,
  part: InvoicePreview,
): InvoicePreview {
  const studentGroups = mergeStudentGroups(
    base.studentGroups ?? [],
    part.studentGroups ?? [],
  );
  const instructorGroups = mergeInstructorGroups(
    base.instructorGroups ?? [],
    part.instructorGroups ?? [],
  );
  const startingKitGroups = mergeStartingKitGroups(
    base.startingKitGroups ?? [],
    part.startingKitGroups ?? [],
  );
  return applyRecomputedTotal({
    ...base,
    franchiseId: part.franchiseId ?? base.franchiseId,
    programId: part.programId ?? base.programId,
    levelId: part.levelId ?? base.levelId,
    isFirstLevel: part.isFirstLevel ?? base.isFirstLevel,
    studentGroups,
    instructorGroups,
    startingKitGroups,
    students: studentGroupsToBreakdowns(studentGroups),
    lines: [],
  });
}

export interface UseUnifiedInvoicePreviewArgs {
  open: boolean;
  hasSelection: boolean;
  selectedStudentIds: number[];
  selectedInstructorIds: number[];
  startingKitItems: StartingKitSelectionItem[];
  /** Custom (re-order) inventory lines folded into the same order. Priced off
   * inventory unitPrice with no GST; fetched as a standalone preview block. */
  customItems?: CustomMaterialSelectionItem[];
  franchiseId?: string | number;
}

export interface UseUnifiedInvoicePreviewResult {
  preview: InvoicePreview | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useUnifiedInvoicePreview({
  open,
  hasSelection,
  selectedStudentIds,
  selectedInstructorIds,
  startingKitItems,
  customItems = [],
  franchiseId,
}: UseUnifiedInvoicePreviewArgs): UseUnifiedInvoicePreviewResult {
  // Franchisee JWT: server resolves franchise from token; `franchiseId` here is for admin-style calls only.
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTick, setRefetchTick] = useState(0);

  // Custom items are priced independently (inventory unitPrice, no GST), so we
  // fetch them as a standalone block and overlay onto the merged preview rather
  // than threading them through the incremental student/CI/kit merge engine.
  const [customBlock, setCustomBlock] = useState<{
    customGroups: CustomGroupPreview[];
    totalAmount: number;
  } | null>(null);
  const [isCustomFetching, setIsCustomFetching] = useState(false);
  const customGenRef = useRef(0);

  const genRef = useRef(0);
  const mergedRef = useRef<InvoicePreview | null>(null);

  const studentKey = useMemo(
    () => [...selectedStudentIds].sort((a, b) => a - b).join(","),
    [selectedStudentIds],
  );
  const instructorKey = useMemo(
    () => [...selectedInstructorIds].sort((a, b) => a - b).join(","),
    [selectedInstructorIds],
  );
  const kitKey = useMemo(
    () =>
      [...startingKitItems]
        .sort((a, b) => a.streamId - b.streamId)
        .map((i) => `${i.streamId}:${i.tshirtItemId ?? "none"}:${i.quantity}`)
        .join(","),
    [startingKitItems],
  );
  const customKey = useMemo(
    () =>
      [...customItems]
        .sort(
          (a, b) =>
            a.studentId - b.studentId || a.inventoryItemId - b.inventoryItemId,
        )
        .map((i) => `${i.studentId}:${i.inventoryItemId}:${i.quantity}`)
        .join(","),
    [customItems],
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!open || !hasSelection) {
        genRef.current += 1;
        mergedRef.current = null;
        setPreview(null);
        setError(null);
        setIsFetching(false);
        return;
      }

      const myGen = ++genRef.current;
      setIsFetching(true);
      setError(null);

      const studentSet = new Set(selectedStudentIds);
      const instructorSet = new Set(selectedInstructorIds);
      // Sum quantities per streamId — a stream may appear in multiple rows
      // (one per t-shirt selection), and downstream filter/scale operate on
      // the total quantity per stream group.
      const kitQtyByStreamId = new Map<number, number>();
      for (const i of startingKitItems) {
        kitQtyByStreamId.set(
          i.streamId,
          (kitQtyByStreamId.get(i.streamId) ?? 0) + i.quantity,
        );
      }

      let working: InvoicePreview | null = mergedRef.current;

      if (working != null) {
        working = filterInvoicePreviewBySelection(working, {
          studentIds: studentSet,
          instructorIds: instructorSet,
          kitQtyByStreamId,
        });
        working = applyStartingKitQuantityScales(working, kitQtyByStreamId);
      } else {
        working = emptyPreview();
      }

      const inStudentPreview = new Set(
        (working.studentGroups ?? []).map((g) => g.studentId),
      );
      const addedStudentIds = selectedStudentIds.filter(
        (id) => !inStudentPreview.has(id),
      );

      const inInstructorPreview = new Set(
        (working.instructorGroups ?? []).map((g) => g.instructorId),
      );
      const addedInstructorIds = selectedInstructorIds.filter(
        (id) => !inInstructorPreview.has(id),
      );

      // Always re-request the full kit block when kits change. Each group may
      // contain multiple t-shirt rows, and the per-(streamId, tshirtItemId)
      // dedupe would need to inspect all of `tshirtBreakdown` — the optimization
      // isn't worth the complexity; kit previews are cheap. (Note: the cached
      // kit groups in `working` get overlay-replaced by streamId during merge,
      // so freshly-fetched groups win.)
      const newKitPayload = startingKitItems;

      const dtoBase =
        franchiseId != null && franchiseId !== ""
          ? { franchiseId: String(franchiseId) }
          : {};

      const tasks: Promise<InvoicePreview>[] = [];
      if (addedStudentIds.length > 0) {
        tasks.push(
          previewOrderInvoice({
            ...dtoBase,
            studentIds: addedStudentIds,
          }),
        );
      }
      if (addedInstructorIds.length > 0) {
        tasks.push(
          previewOrderInvoice({
            ...dtoBase,
            instructorIds: addedInstructorIds,
          }),
        );
      }
      if (newKitPayload.length > 0) {
        tasks.push(
          previewOrderInvoice({
            ...dtoBase,
            startingKitItems: newKitPayload.map((i) => ({
              streamId: i.streamId,
              quantity: i.quantity,
              tshirtItemId: i.tshirtItemId,
            })),
          }),
        );
      }

      try {
        if (tasks.length > 0) {
          const parts = await Promise.all(tasks);
          if (cancelled || myGen !== genRef.current) return;
          let merged = working;
          for (const part of parts) {
            merged = mergeOnePreviewBlock(merged, part);
          }
          mergedRef.current = merged;
          setPreview(merged);
        } else {
          if (cancelled || myGen !== genRef.current) return;
          mergedRef.current = working;
          setPreview(working);
        }
      } catch (e) {
        if (cancelled || myGen !== genRef.current) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled && myGen === genRef.current) {
          setIsFetching(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    hasSelection,
    studentKey,
    instructorKey,
    kitKey,
    franchiseId,
    refetchTick,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!open || customItems.length === 0) {
        customGenRef.current += 1;
        setCustomBlock(null);
        setIsCustomFetching(false);
        return;
      }
      const myGen = ++customGenRef.current;
      setIsCustomFetching(true);
      try {
        const dtoBase =
          franchiseId != null && franchiseId !== ""
            ? { franchiseId: String(franchiseId) }
            : {};
        const part = await previewOrderInvoice({
          ...dtoBase,
          customItems: customItems.map((i) => ({
            studentId: i.studentId,
            inventoryItemId: i.inventoryItemId,
            quantity: i.quantity,
          })),
        });
        if (cancelled || myGen !== customGenRef.current) return;
        setCustomBlock({
          customGroups: part.customGroups ?? [],
          totalAmount: Number(part.totalAmount ?? 0),
        });
      } catch (e) {
        if (cancelled || myGen !== customGenRef.current) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled && myGen === customGenRef.current) {
          setIsCustomFetching(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, customKey, franchiseId, refetchTick]);

  const refetch = useCallback(() => {
    mergedRef.current = null;
    setPreview(null);
    setCustomBlock(null);
    setError(null);
    setRefetchTick((t) => t + 1);
  }, []);

  // Overlay the custom block: custom items add to the grand total (and to the
  // pre-GST subtotal, since they carry no GST) and surface as `customGroups`.
  const combinedPreview = useMemo<InvoicePreview | undefined>(() => {
    const hasCustom = (customBlock?.customGroups.length ?? 0) > 0;
    if (preview == null) {
      if (!hasCustom || customBlock == null) return preview ?? undefined;
      return {
        ...emptyPreview({ franchiseId: String(franchiseId ?? "") }),
        customGroups: customBlock.customGroups,
        totalAmount: customBlock.totalAmount,
        subtotalAmount: customBlock.totalAmount,
        gstAmount: 0,
        isGstInclusive: true,
      };
    }
    if (!hasCustom || customBlock == null) return preview;
    const baseSubtotal = preview.subtotalAmount ?? preview.totalAmount;
    return {
      ...preview,
      customGroups: customBlock.customGroups,
      totalAmount: preview.totalAmount + customBlock.totalAmount,
      subtotalAmount: baseSubtotal + customBlock.totalAmount,
    };
  }, [preview, customBlock, franchiseId]);

  const isLoading = Boolean(
    open &&
      hasSelection &&
      combinedPreview == null &&
      !error &&
      (isFetching || isCustomFetching),
  );

  return {
    preview: combinedPreview,
    isLoading,
    isFetching: isFetching || isCustomFetching,
    isError: error != null,
    error,
    refetch,
  };
}
