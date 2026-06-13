"use client";

import { useState, useCallback, useMemo } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import {
  AppDialog,
  AppDialogBody,
  AppDialogFooter,
  AppDialogHeader,
} from "@/components/shared/dialog";
import { type StudentData } from "@/services/student.service";
import {
  initiateOrderPayment,
} from "@/services/order.service";
import { useUnifiedInvoicePreview } from "@/hooks/use-unified-invoice-preview";
import { useTshirtInventory } from "@/hooks/use-tshirt-inventory";
import { useStreamsByProgram } from "@/hooks/api/stream.hooks";
import { useProgramId } from "@/hooks/use-scope";
import { useCourseInstructors } from "@/hooks/api/course-instructor.hooks";
import type { CourseInstructorData } from "@/services/course-instructor.service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAvailableItems } from "@/hooks/api/order.hooks";
import type { StudentAvailableItems } from "@/services/order.service";
import UnifiedInvoiceGroupedSummary, {
  studentLineItems,
} from "./UnifiedInvoiceGroupedSummary";
import { formatRupees } from "@/lib/currency-utils";

interface UnifiedMaterialRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onPaymentInitiated: (paymentData: unknown) => void;
  eligibleStudents: StudentData[];
  /** Students who have already ordered materials — eligible for custom (re-order)
   * items in the Custom Materials tab. */
  customEligibleStudents: StudentData[];
}

function getStudentLevelName(student: StudentData): string {
  let raw = "";
  if (student.level && typeof student.level === "object") {
    const l = student.level as { name?: string; code?: string };
    // Show the level CODE (e.g. "L1"), not the name.
    raw = l.code ?? l.name ?? "";
  } else {
    raw = String(student.level ?? "");
  }
  const t = raw.trim();
  if (t === "" || t === "_") return "";
  return t;
}

function displayInstructorCode(id: string | number | undefined | null): string {
  const t = String(id ?? "").trim();
  if (t === "" || t === "_") return "";
  return t;
}

export default function UnifiedMaterialRequestDialog({
  open,
  onClose,
  onPaymentInitiated,
  eligibleStudents,
  customEligibleStudents,
}: UnifiedMaterialRequestDialogProps) {
  const { courseInstructors, isLoading: ciListLoading } = useCourseInstructors(
    { page: 1, limit: 10_000 },
    { enabled: open },
  );

  const orderableInstructors = useMemo(
    () =>
      courseInstructors.filter(
        (ci) =>
          (ci.operationalStatus === "valid" || ci.status === "Training") &&
          !ci.materialsOrdered,
      ),
    [courseInstructors],
  );

  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [selectedInstructorIds, setSelectedInstructorIds] = useState<
    number[]
  >([]);
  type KitRow = {
    streamId: number;
    tshirtItemId: number | null;
    count: number;
  };
  const [kitRows, setKitRows] = useState<KitRow[]>([]);

  // Custom Materials tab: students chosen to re-order for, and the per-student
  // inventory lines they've added.
  const [selectedCustomStudentIds, setSelectedCustomStudentIds] = useState<
    number[]
  >([]);
  type CustomLine = {
    studentId: number;
    inventoryItemId: number;
    quantity: number;
  };
  const [customLines, setCustomLines] = useState<CustomLine[]>([]);
  const [customStuQuery, setCustomStuQuery] = useState("");

  const [stuQuery, setStuQuery] = useState("");
  const [ciQuery, setCiQuery] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available (level + kit) items for the students chosen in the Custom tab.
  const availableQuery = useAvailableItems(
    selectedCustomStudentIds,
    open && selectedCustomStudentIds.length > 0,
  );
  const availableByStudentId = useMemo(() => {
    const m = new Map<number, StudentAvailableItems>();
    for (const row of availableQuery.data ?? []) m.set(row.studentId, row);
    return m;
  }, [availableQuery.data]);

  const customItems = useMemo(
    () => customLines.filter((l) => l.quantity > 0),
    [customLines],
  );

  const programId = useProgramId();
  const streamsQuery = useStreamsByProgram(
    open && programId != null ? programId : undefined,
  );

  const tshirtQuery = useTshirtInventory(open, programId);
  const tshirts = tshirtQuery.data ?? [];

  // Aggregate kitRows into API payload: merge duplicate (streamId, tshirtItemId) pairs
  // and drop count===0 rows (which only exist as in-progress UI rows).
  const startingKitItems = useMemo(() => {
    const map = new Map<
      string,
      { streamId: number; tshirtItemId: number | null; quantity: number }
    >();
    for (const r of kitRows) {
      if (r.count <= 0) continue;
      const key = `${r.streamId}:${r.tshirtItemId ?? "none"}`;
      const existing = map.get(key);
      if (existing) existing.quantity += r.count;
      else
        map.set(key, {
          streamId: r.streamId,
          tshirtItemId: r.tshirtItemId,
          quantity: r.count,
        });
    }
    return [...map.values()];
  }, [kitRows]);

  const hasSelection =
    selectedStudentIds.length > 0 ||
    selectedInstructorIds.length > 0 ||
    startingKitItems.length > 0 ||
    customItems.length > 0;

  const invoicePreview = useUnifiedInvoicePreview({
    open,
    hasSelection,
    selectedStudentIds,
    selectedInstructorIds,
    startingKitItems,
    customItems,
  });

  const preview = invoicePreview.preview;

  const tshirtNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of tshirts) m.set(t.id, t.name);
    return m;
  }, [tshirts]);

  // Per-stream metrics derived from the live preview.
  const streamMetricsByStreamId = useMemo(() => {
    const m = new Map<number, { quantity: number; total: number }>();
    for (const g of preview?.startingKitGroups ?? []) {
      m.set(g.streamId, {
        quantity: g.quantity,
        total: (g.kitUnit + g.royaltyUnit) * g.quantity,
      });
    }
    return m;
  }, [preview?.startingKitGroups]);

  const stuFiltered = useMemo(() => {
    const q = stuQuery.trim().toLowerCase();
    if (!q) return eligibleStudents;
    return eligibleStudents.filter((s) => {
      const name = s.name?.toLowerCase() ?? "";
      const level = getStudentLevelName(s).toLowerCase();
      return name.includes(q) || level.includes(q);
    });
  }, [eligibleStudents, stuQuery]);

  const ciFiltered = useMemo(() => {
    const q = ciQuery.trim().toLowerCase();
    if (!q) return orderableInstructors;
    return orderableInstructors.filter((c) => {
      const name = c.name?.toLowerCase() ?? "";
      const code = String(c.instructorId ?? "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [orderableInstructors, ciQuery]);

  const customStuFiltered = useMemo(() => {
    const q = customStuQuery.trim().toLowerCase();
    if (!q) return customEligibleStudents;
    return customEligibleStudents.filter((s) => {
      const name = s.name?.toLowerCase() ?? "";
      const level = getStudentLevelName(s).toLowerCase();
      return name.includes(q) || level.includes(q);
    });
  }, [customEligibleStudents, customStuQuery]);

  const selectedKitsTotalQty = kitRows.reduce((s, r) => s + r.count, 0);

  const toggleStudent = useCallback((id: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }, []);

  const toggleInstructor = useCallback((id: number) => {
    setSelectedInstructorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const addKitRow = useCallback((streamId: number) => {
    setKitRows((prev) => [
      ...prev,
      { streamId, tshirtItemId: null, count: 0 },
    ]);
  }, []);

  const updateKitRowAt = useCallback(
    (index: number, patch: Partial<KitRow>) => {
      setKitRows((prev) =>
        prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
      );
    },
    [],
  );

  const removeKitRowAt = useCallback((index: number) => {
    setKitRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeKitStream = useCallback((streamId: number) => {
    setKitRows((prev) => prev.filter((r) => r.streamId !== streamId));
  }, []);

  const toggleAllStudents = useCallback(() => {
    const ids = stuFiltered.map((s) => s.id);
    const allFilteredSelected =
      ids.length > 0 && ids.every((id) => selectedStudentIds.includes(id));
    setSelectedStudentIds((prev) => {
      if (allFilteredSelected) {
        const drop = new Set(ids);
        return prev.filter((id) => !drop.has(id));
      }
      return [...new Set([...prev, ...ids])];
    });
  }, [stuFiltered, selectedStudentIds]);

  const toggleCustomStudent = useCallback((id: number) => {
    setSelectedCustomStudentIds((prev) => {
      if (prev.includes(id)) {
        // Deselecting a student also drops any custom lines added for them.
        setCustomLines((lines) => lines.filter((l) => l.studentId !== id));
        return prev.filter((s) => s !== id);
      }
      return [...prev, id];
    });
  }, []);

  const addCustomLine = useCallback(
    (studentId: number, inventoryItemId: number) => {
      setCustomLines((prev) => {
        const existing = prev.find(
          (l) =>
            l.studentId === studentId && l.inventoryItemId === inventoryItemId,
        );
        if (existing) {
          return prev.map((l) =>
            l === existing ? { ...l, quantity: l.quantity + 1 } : l,
          );
        }
        return [...prev, { studentId, inventoryItemId, quantity: 1 }];
      });
    },
    [],
  );

  const setCustomLineQty = useCallback(
    (studentId: number, inventoryItemId: number, quantity: number) => {
      setCustomLines((prev) =>
        quantity <= 0
          ? prev.filter(
              (l) =>
                !(
                  l.studentId === studentId &&
                  l.inventoryItemId === inventoryItemId
                ),
            )
          : prev.map((l) =>
              l.studentId === studentId && l.inventoryItemId === inventoryItemId
                ? { ...l, quantity }
                : l,
            ),
      );
    },
    [],
  );

  const toggleAllInstructors = useCallback(() => {
    const ids = ciFiltered.map((c) => c.id);
    const allFilteredSelected =
      ids.length > 0 && ids.every((id) => selectedInstructorIds.includes(id));
    setSelectedInstructorIds((prev) => {
      if (allFilteredSelected) {
        const drop = new Set(ids);
        return prev.filter((id) => !drop.has(id));
      }
      return [...new Set([...prev, ...ids])];
    });
  }, [ciFiltered, selectedInstructorIds]);

  const handleContinue = async () => {
    const totalAmount = preview?.totalAmount ?? 0;
    // `preview.gstAmount` is the GST portion the backend computed in
    // `previewUnified`; pass it along so the payment row records it
    // (the order doesn't exist yet — created post-verify).
    const goodsGstAmount = preview?.gstAmount;
    setIsSubmitting(true);
    try {
      const result = await initiateOrderPayment({
        studentIds: selectedStudentIds,
        instructorIds: selectedInstructorIds,
        startingKitItems: kitRows
          .filter((r) => r.count > 0)
          .map((r) => ({
            streamId: r.streamId,
            tshirtItemId: r.tshirtItemId,
            quantity: r.count,
          })),
        customItems,
        notes: undefined,
        paymentRecordId: undefined,
        totalAmount,
        goodsGstAmount,
      });
      onPaymentInitiated(result);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  const emptyInvoice = !hasSelection;

  const instructorById = useMemo(() => {
    const m = new Map<number, CourseInstructorData>();
    for (const c of orderableInstructors) m.set(c.id, c);
    return m;
  }, [orderableInstructors]);

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      size="2xl"
      padding="flush"
      scrollBody
      maxHeight="max-h-[min(58rem,92vh)]"
    >
      <AppDialogHeader
        title="Request materials"
        description="Select line items, review invoice, pay."
      />

      <AppDialogBody layout="fill" className="px-0 py-0">
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Left — selection */}
          <Tabs
            defaultValue="standard"
            className="flex min-h-0 w-full flex-col border-border lg:w-[min(420px,42%)] lg:border-r"
          >
            <div className="shrink-0 space-y-3 border-b border-border px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-card-foreground">
                  Selection
                </h3>
                {(() => {
                  const totalSelected =
                    selectedKitsTotalQty +
                    selectedStudentIds.length +
                    selectedInstructorIds.length +
                    customItems.length;
                  return totalSelected > 0 ? (
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground tabular-nums">
                      {totalSelected}
                    </span>
                  ) : null;
                })()}
              </div>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="standard">Standard</TabsTrigger>
                <TabsTrigger value="custom">
                  Custom Materials
                  {customItems.length > 0 ? (
                    <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground tabular-nums">
                      {customItems.length}
                    </span>
                  ) : null}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="standard"
              className="mt-0 min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 focus-visible:outline-none"
            >
              {/* Kits */}
              <section>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Kits
                </h4>
                {streamsQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(streamsQuery.data ?? [])
                      .filter((stream) => stream.hasStartingKit !== false)
                      .map((stream) => {
                      const rowEntries = kitRows
                        .map((row, index) => ({ row, index }))
                        .filter((e) => e.row.streamId === stream.id);
                      const isActive = rowEntries.length > 0;
                      const metrics = streamMetricsByStreamId.get(stream.id);
                      const headerQty = metrics?.quantity ?? 0;
                      const headerTotal = metrics?.total ?? 0;

                      if (!isActive) {
                        return (
                          <div
                            key={stream.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
                          >
                            <h5 className="truncate text-sm font-semibold text-card-foreground">
                              {stream.name}
                            </h5>
                            <button
                              type="button"
                              onClick={() => addKitRow(stream.id)}
                              className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-card-foreground hover:bg-muted"
                            >
                              + Add
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={stream.id}
                          className="rounded-xl border border-primary/50 bg-primary/5 px-4 py-3"
                        >
                          {/* Card header */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <h5 className="truncate text-sm font-semibold text-card-foreground">
                                {stream.name}
                              </h5>
                              {headerQty > 0 ? (
                                <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                  {headerQty} {headerQty === 1 ? "kit" : "kits"}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                              {headerTotal > 0 ? (
                                <span className="text-sm font-semibold tabular-nums text-card-foreground">
                                  {formatRupees(headerTotal)}
                                </span>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => removeKitStream(stream.id)}
                                aria-label={`Remove ${stream.name} from selection`}
                                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-card-foreground"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Column labels */}
                          <div className="mt-3 grid grid-cols-[8rem_1fr_auto] gap-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <span>Qty</span>
                            <span>T-shirt size</span>
                            <span aria-hidden />
                          </div>

                          {/* Rows */}
                          <div className="mt-1 space-y-2">
                            {rowEntries.map(({ row, index }) => (
                              <div
                                key={index}
                                className="grid grid-cols-[8rem_1fr_auto] items-center gap-3"
                              >
                                <div className="flex h-9 items-center justify-between rounded-lg border border-border bg-background">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateKitRowAt(index, {
                                        count: Math.max(0, row.count - 1),
                                      })
                                    }
                                    disabled={row.count === 0}
                                    aria-label={`Decrease kit quantity for ${stream.name}`}
                                    className="px-2.5 text-base leading-none text-muted-foreground hover:bg-muted disabled:opacity-40"
                                  >
                                    −
                                  </button>
                                  <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums">
                                    {row.count}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateKitRowAt(index, {
                                        count: row.count + 1,
                                      })
                                    }
                                    aria-label={`Increase kit quantity for ${stream.name}`}
                                    className="px-2.5 text-base leading-none text-muted-foreground hover:bg-muted"
                                  >
                                    +
                                  </button>
                                </div>
                                <Select
                                  value={
                                    row.tshirtItemId == null
                                      ? "none"
                                      : String(row.tshirtItemId)
                                  }
                                  onValueChange={(v) =>
                                    updateKitRowAt(index, {
                                      tshirtItemId:
                                        v === "none" ? null : Number(v),
                                    })
                                  }
                                  disabled={tshirtQuery.isLoading}
                                >
                                  <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Select t-shirt" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">
                                      No t-shirt
                                    </SelectItem>
                                    {tshirts.map((t) => (
                                      <SelectItem
                                        key={t.id}
                                        value={String(t.id)}
                                      >
                                        {t.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <button
                                  type="button"
                                  onClick={() => removeKitRowAt(index)}
                                  aria-label="Remove this t-shirt row"
                                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Add another t-shirt size */}
                          <button
                            type="button"
                            onClick={() => addKitRow(stream.id)}
                            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add another t-shirt size
                          </button>
                        </div>
                      );
                    })}

                    {kitRows.length > 0 ? (
                      <p className="pt-1 text-[11px] italic text-muted-foreground">
                        Each t-shirt size you add counts as separate kits towards
                        the total.
                      </p>
                    ) : null}
                  </div>
                )}
              </section>

              {/* Students */}
              <section>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-card-foreground">
                    Students
                  </h4>
                  <span
                    className={
                      selectedStudentIds.length === 0
                        ? "rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        : "rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-card-foreground"
                    }
                  >
                    {selectedStudentIds.length}
                  </span>
                  <span className="flex-1" />
                  <button
                    type="button"
                    className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-card-foreground hover:underline"
                    onClick={toggleAllStudents}
                    disabled={stuFiltered.length === 0}
                  >
                    {stuFiltered.length > 0 &&
                    stuFiltered.every((s) =>
                      selectedStudentIds.includes(s.id),
                    )
                      ? "Clear"
                      : "Select all"}
                  </button>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Search students"
                    aria-label="Search students"
                    value={stuQuery}
                    onChange={(e) => setStuQuery(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background py-2 pl-8 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border">
                  {stuFiltered.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No results.
                    </p>
                  ) : (
                    stuFiltered.map((s) => {
                      const sel = selectedStudentIds.includes(s.id);
                      const bd = preview?.students?.find(
                        (x) => x.studentId === s.id,
                      );
                      const itemCount = preview
                        ? studentLineItems(preview, s.id).length
                        : 0;
                      const levelName = getStudentLevelName(s);
                      const subtitle =
                        bd != null
                          ? `${itemCount} ${itemCount === 1 ? "item" : "items"}`
                          : sel && invoicePreview.isFetching
                            ? "…"
                            : null;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          aria-pressed={sel}
                          onClick={() => toggleStudent(s.id)}
                          className={
                            "flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-muted/50 " +
                            (sel ? "bg-muted/60" : "")
                          }
                        >
                          <span
                            className={
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded border " +
                              (sel
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30")
                            }
                          >
                            {sel ? "✓" : ""}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-card-foreground">
                              {s.name}
                            </div>
                            {subtitle != null ? (
                              <div className="text-xs text-muted-foreground">
                                {subtitle}
                              </div>
                            ) : null}
                          </div>
                          {levelName ? (
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              {levelName}
                            </span>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              {/* CI */}
              <section>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-card-foreground">
                    Instructors
                  </h4>
                  <span
                    className={
                      selectedInstructorIds.length === 0
                        ? "rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        : "rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-card-foreground"
                    }
                  >
                    {selectedInstructorIds.length}
                  </span>
                  <span className="flex-1" />
                  <button
                    type="button"
                    className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-card-foreground hover:underline"
                    onClick={toggleAllInstructors}
                    disabled={ciFiltered.length === 0}
                  >
                    {ciFiltered.length > 0 &&
                    ciFiltered.every((c) =>
                      selectedInstructorIds.includes(c.id),
                    )
                      ? "Clear"
                      : "Select all"}
                  </button>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Search instructors"
                    aria-label="Search instructors"
                    value={ciQuery}
                    onChange={(e) => setCiQuery(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background py-2 pl-8 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border">
                  {ciListLoading ? (
                    <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  ) : ciFiltered.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No results.
                    </p>
                  ) : (
                    ciFiltered.map((c) => {
                      const sel = selectedInstructorIds.includes(c.id);
                      const codeLine = displayInstructorCode(c.instructorId);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          aria-pressed={sel}
                          onClick={() => toggleInstructor(c.id)}
                          className={
                            "flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-muted/50 " +
                            (sel ? "bg-muted/60" : "")
                          }
                        >
                          <span
                            className={
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded border " +
                              (sel
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30")
                            }
                          >
                            {sel ? "✓" : ""}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-card-foreground">
                              {c.name}
                            </div>
                            {codeLine ? (
                              <div className="text-xs text-muted-foreground">
                                {codeLine}
                              </div>
                            ) : null}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>
            </TabsContent>

            {/* Custom Materials — re-order items for students who already ordered */}
            <TabsContent
              value="custom"
              className="mt-0 min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 focus-visible:outline-none"
            >
              <section>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-card-foreground">
                    Students
                  </h4>
                  <span
                    className={
                      selectedCustomStudentIds.length === 0
                        ? "rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        : "rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-card-foreground"
                    }
                  >
                    {selectedCustomStudentIds.length}
                  </span>
                </div>
                <p className="mb-2 text-[11px] text-muted-foreground">
                  Only students who have already ordered materials appear here.
                  Pick a student, then add items from their level &amp; kit.
                </p>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Search students"
                    aria-label="Search students for custom materials"
                    value={customStuQuery}
                    onChange={(e) => setCustomStuQuery(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background py-2 pl-8 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-border">
                  {customStuFiltered.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No eligible students.
                    </p>
                  ) : (
                    customStuFiltered.map((s) => {
                      const sel = selectedCustomStudentIds.includes(s.id);
                      const levelName = getStudentLevelName(s);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          aria-pressed={sel}
                          onClick={() => toggleCustomStudent(s.id)}
                          className={
                            "flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-muted/50 " +
                            (sel ? "bg-muted/60" : "")
                          }
                        >
                          <span
                            className={
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded border " +
                              (sel
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30")
                            }
                          >
                            {sel ? "✓" : ""}
                          </span>
                          <div className="min-w-0 flex-1 font-medium text-card-foreground">
                            {s.name}
                          </div>
                          {levelName ? (
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              {levelName}
                            </span>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              {selectedCustomStudentIds.length > 0 ? (
                <section className="space-y-3">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Items
                  </h4>
                  {availableQuery.isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading items…
                    </div>
                  ) : (
                    selectedCustomStudentIds.map((sid) => {
                      const student = customEligibleStudents.find(
                        (s) => s.id === sid,
                      );
                      const avail = availableByStudentId.get(sid);
                      const lines = customLines.filter(
                        (l) => l.studentId === sid,
                      );
                      const itemNameById = new Map(
                        (avail?.items ?? []).map((it) => [
                          it.inventoryItemId,
                          it,
                        ]),
                      );
                      const addedIds = new Set(
                        lines.map((l) => l.inventoryItemId),
                      );
                      const studentTotal = lines.reduce((sum, l) => {
                        const it = itemNameById.get(l.inventoryItemId);
                        return sum + (it?.unitPrice ?? 0) * l.quantity;
                      }, 0);
                      return (
                        <div
                          key={sid}
                          className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h5 className="truncate text-sm font-semibold text-card-foreground">
                              {student?.name ?? avail?.studentName ?? `#${sid}`}
                            </h5>
                            {studentTotal > 0 ? (
                              <span className="text-sm font-semibold tabular-nums text-card-foreground">
                                {formatRupees(studentTotal)}
                              </span>
                            ) : null}
                          </div>

                          {lines.length > 0 ? (
                            <div className="mt-2 space-y-2">
                              {lines.map((l) => {
                                const it = itemNameById.get(l.inventoryItemId);
                                return (
                                  <div
                                    key={l.inventoryItemId}
                                    className="grid grid-cols-[1fr_auto_auto] items-center gap-2"
                                  >
                                    <span className="min-w-0 truncate text-xs text-card-foreground">
                                      {it?.name ?? `Item ${l.inventoryItemId}`}
                                      {it ? (
                                        <span className="text-muted-foreground">
                                          {" · "}
                                          {formatRupees(it.unitPrice)}
                                        </span>
                                      ) : null}
                                    </span>
                                    <div className="flex h-8 items-center justify-between rounded-lg border border-border bg-background">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setCustomLineQty(
                                            sid,
                                            l.inventoryItemId,
                                            l.quantity - 1,
                                          )
                                        }
                                        aria-label="Decrease quantity"
                                        className="px-2 text-base leading-none text-muted-foreground hover:bg-muted"
                                      >
                                        −
                                      </button>
                                      <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums">
                                        {l.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setCustomLineQty(
                                            sid,
                                            l.inventoryItemId,
                                            l.quantity + 1,
                                          )
                                        }
                                        aria-label="Increase quantity"
                                        className="px-2 text-base leading-none text-muted-foreground hover:bg-muted"
                                      >
                                        +
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCustomLineQty(
                                          sid,
                                          l.inventoryItemId,
                                          0,
                                        )
                                      }
                                      aria-label="Remove item"
                                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}

                          <div className="mt-3">
                            <Select
                              value=""
                              onValueChange={(v) =>
                                addCustomLine(sid, Number(v))
                              }
                              disabled={(avail?.items?.length ?? 0) === 0}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue
                                  placeholder={
                                    (avail?.items?.length ?? 0) === 0
                                      ? "No items available"
                                      : "+ Add item"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {(avail?.items ?? []).map((it) => (
                                  <SelectItem
                                    key={it.inventoryItemId}
                                    value={String(it.inventoryItemId)}
                                  >
                                    {it.name} · {formatRupees(it.unitPrice)}
                                    {it.isKitItem ? " · kit" : ""}
                                    {addedIds.has(it.inventoryItemId)
                                      ? " ✓"
                                      : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </section>
              ) : null}
            </TabsContent>
          </Tabs>

          {/* Right — live invoice */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/20">
            <div className="shrink-0 border-b border-border px-4 py-3">
              <h3 className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-base font-semibold text-card-foreground">
                <span className="shrink-0">Invoice</span>
                <span className="min-w-0 font-normal text-muted-foreground">
                  <span aria-hidden className="text-muted-foreground/80">
                    —
                  </span>{" "}
                  <span className="font-medium tabular-nums text-card-foreground">
                    {selectedKitsTotalQty}
                  </span>{" "}
                  {selectedKitsTotalQty === 1 ? "kit" : "kits"},{" "}
                  <span className="font-medium tabular-nums text-card-foreground">
                    {selectedStudentIds.length}
                  </span>{" "}
                  {selectedStudentIds.length === 1 ? "student" : "students"},{" "}
                  <span className="font-medium tabular-nums text-card-foreground">
                    {selectedInstructorIds.length}
                  </span>{" "}
                  {selectedInstructorIds.length === 1 ? "CI" : "CIs"}
                </span>
              </h3>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {emptyInvoice && (
                <div className="flex min-h-[12rem] items-center justify-center px-4 py-10">
                  <p className="text-sm text-muted-foreground">No selection.</p>
                </div>
              )}

              {!emptyInvoice && invoicePreview.isLoading && (
                <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading…
                </div>
              )}

              {!emptyInvoice && invoicePreview.isError && (
                <p className="py-6 text-sm text-destructive">
                  Unable to load invoice.
                </p>
              )}

              {!emptyInvoice && preview && (
                <UnifiedInvoiceGroupedSummary
                  preview={preview}
                  startingKitRows={startingKitItems}
                  selectedStudentIds={selectedStudentIds}
                  selectedInstructorIds={selectedInstructorIds}
                  showCustomGroups
                  getStudentById={(id) => {
                    const s = eligibleStudents.find((x) => x.id === id);
                    if (s) return { name: s.name };
                    const bd = preview.students.find((x) => x.studentId === id);
                    return bd ? { name: bd.studentName } : undefined;
                  }}
                  getInstructorById={(id) => {
                    const c = instructorById.get(id);
                    return c
                      ? { name: c.name, instructorId: c.instructorId }
                      : undefined;
                  }}
                  onRemoveKit={(streamId) => removeKitStream(streamId)}
                  onRemoveStudent={(sid) => toggleStudent(sid)}
                  onRemoveInstructor={(iid) => toggleInstructor(iid)}
                />
              )}
            </div>
          </div>
        </div>

      </AppDialogBody>

      <AppDialogFooter
        sticky
        leftSlot={
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Estimated total
            </span>
            <span className="text-lg font-semibold tabular-nums text-card-foreground">
              {formatRupees(preview?.totalAmount ?? 0)}
            </span>
          </div>
        }
        secondary={{
          label: "Cancel",
          onClick: onClose,
          disabled: isSubmitting,
        }}
        primary={{
          label: `Pay ${formatRupees(preview?.totalAmount ?? 0)}`,
          onClick: handleContinue,
          loading: isSubmitting,
          disabled:
            !hasSelection ||
            isSubmitting ||
            invoicePreview.isLoading ||
            invoicePreview.isFetching ||
            invoicePreview.isError,
        }}
      />
    </AppDialog>
  );
}
