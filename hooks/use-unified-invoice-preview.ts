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
} from "@/services/order.service";

export interface StartingKitSelectionItem {
  streamId: number;
  quantity: number;
  tshirtItemId: number | null;
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
  franchiseId,
}: UseUnifiedInvoicePreviewArgs): UseUnifiedInvoicePreviewResult {
  // Franchisee JWT: server resolves franchise from token; `franchiseId` here is for admin-style calls only.
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTick, setRefetchTick] = useState(0);

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

  const refetch = useCallback(() => {
    mergedRef.current = null;
    setPreview(null);
    setError(null);
    setRefetchTick((t) => t + 1);
  }, []);

  const isLoading = Boolean(
    open && hasSelection && preview == null && !error && isFetching,
  );

  return {
    preview: preview ?? undefined,
    isLoading,
    isFetching,
    isError: error != null,
    error,
    refetch,
  };
}
