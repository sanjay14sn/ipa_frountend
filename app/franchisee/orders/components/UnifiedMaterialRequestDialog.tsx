"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type StudentData } from "@/services/student.service";
import {
  initiateOrderPayment,
  type InvoicePreview,
} from "@/services/order.service";
import { useUnifiedInvoicePreview } from "@/hooks/use-unified-invoice-preview";
import { getAllStreams, type Stream } from "@/services/stream.service";
import { useCourseInstructors } from "@/hooks/api/course-instructor.hooks";
import type { CourseInstructorData } from "@/services/course-instructor.service";
import InvoiceGroupCard from "./checkout/InvoiceGroupCard";

interface UnifiedMaterialRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onPaymentInitiated: (paymentData: unknown) => void;
  eligibleStudents: StudentData[];
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function getStudentLevelName(student: StudentData): string {
  let raw = "";
  if (student.level && typeof student.level === "object") {
    const l = student.level as { name?: string; code?: string };
    raw = l.name ?? l.code ?? "";
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

function stripStudentLineDescription(description: string): string {
  const idx = description.indexOf(" - ");
  return idx !== -1 ? description.slice(idx + 3) : description;
}

function studentLineItems(
  preview: InvoicePreview | undefined,
  studentId: number,
): Array<{ name: string; quantity: number }> {
  if (!preview) return [];
  const group = preview.studentGroups?.find((g) => g.studentId === studentId);
  if (group?.items?.length) {
    return group.items
      .filter((it) => it.itemType === "LEVEL" || it.itemType === "KIT")
      .map((it) => ({ name: it.name, quantity: it.quantity }));
  }
  return preview.lines
    .filter(
      (l) =>
        l.studentId === studentId &&
        (l.itemType === "LEVEL" || l.itemType === "KIT"),
    )
    .map((l) => ({
      name: stripStudentLineDescription(l.description),
      quantity: l.quantity,
    }));
}

export default function UnifiedMaterialRequestDialog({
  open,
  onClose,
  onPaymentInitiated,
  eligibleStudents,
}: UnifiedMaterialRequestDialogProps) {
  const { courseInstructors, isLoading: ciListLoading } = useCourseInstructors(
    { page: 1, limit: 10_000 },
    { enabled: open },
  );

  const orderableInstructors = useMemo(
    () =>
      courseInstructors.filter(
        (ci) =>
          (ci.status === "Active" || ci.status === "Training") &&
          !ci.materialsOrdered,
      ),
    [courseInstructors],
  );

  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [selectedInstructorIds, setSelectedInstructorIds] = useState<
    number[]
  >([]);
  const [startingKitQuantities, setStartingKitQuantities] = useState<
    Record<number, number>
  >({});

  const [stuQuery, setStuQuery] = useState("");
  const [ciQuery, setCiQuery] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const streamsQuery = useQuery<Stream[]>({
    queryKey: ["streams"],
    queryFn: getAllStreams,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const startingKitItems = (streamsQuery.data ?? [])
    .filter((s) => (startingKitQuantities[s.id] ?? 0) > 0)
    .map((s) => ({
      streamId: s.id,
      streamName: s.name,
      quantity: startingKitQuantities[s.id],
    }));

  const hasSelection =
    selectedStudentIds.length > 0 ||
    selectedInstructorIds.length > 0 ||
    startingKitItems.length > 0;

  const invoicePreview = useUnifiedInvoicePreview({
    open,
    hasSelection,
    selectedStudentIds,
    selectedInstructorIds,
    startingKitItems: startingKitItems.map((i) => ({
      streamId: i.streamId,
      quantity: i.quantity,
    })),
  });

  const preview = invoicePreview.preview;

  const streamUnitByStreamId = useMemo(() => {
    const m = new Map<number, number>();
    for (const g of preview?.startingKitGroups ?? []) {
      m.set(g.streamId, g.materialUnit + g.kitUnit + g.royaltyUnit);
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

  const selectedKitsTotalQty = startingKitItems.reduce(
    (s, i) => s + i.quantity,
    0,
  );

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

  const setKitQty = useCallback((streamId: number, n: number) => {
    setStartingKitQuantities((m) => {
      const next = { ...m };
      if (n <= 0) delete next[streamId];
      else next[streamId] = n;
      return next;
    });
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
    setIsSubmitting(true);
    try {
      const result = await initiateOrderPayment({
        studentIds: selectedStudentIds,
        instructorIds: selectedInstructorIds,
        startingKitItems: startingKitItems.map((i) => ({
          streamId: i.streamId,
          quantity: i.quantity,
        })),
        notes: undefined,
        paymentRecordId: undefined,
        totalAmount,
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[min(58rem,92vh)] min-h-[min(58rem,92vh)] max-h-[min(58rem,92vh)] w-full max-w-6xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle>Request materials</DialogTitle>
          <DialogDescription className="sr-only">
            Select line items, review invoice, pay.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Left — selection */}
          <div className="flex min-h-0 w-full flex-col border-border lg:w-[min(420px,42%)] lg:border-r">
            <div className="shrink-0 border-b border-border px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-card-foreground">
                  Selection
                </h3>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {selectedKitsTotalQty +
                    selectedStudentIds.length +
                    selectedInstructorIds.length}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
              {/* Kits */}
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-card-foreground">
                    Kits
                  </h4>
                  <span
                    className={
                      selectedKitsTotalQty === 0
                        ? "rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        : "rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-card-foreground"
                    }
                  >
                    {selectedKitsTotalQty}
                  </span>
                </div>
                {streamsQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(streamsQuery.data ?? []).map((stream) => {
                      const qty = startingKitQuantities[stream.id] ?? 0;
                      const unit = streamUnitByStreamId.get(stream.id);
                      return (
                        <div
                          key={stream.id}
                          className={
                            "flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 " +
                            (qty > 0
                              ? "border-border bg-muted/50"
                              : "border-border bg-card")
                          }
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-card-foreground">
                              {stream.name}
                            </div>
                            {unit != null && unit > 0 ? (
                              <div className="text-xs tabular-nums text-muted-foreground">
                                {currencyFormatter.format(unit)}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center rounded-lg border border-border bg-background">
                            <button
                              type="button"
                              className="px-2.5 py-1.5 text-lg leading-none text-muted-foreground hover:bg-muted disabled:opacity-40"
                              aria-label={`Decrease starting kit quantity for ${stream.name}`}
                              disabled={qty === 0}
                              onClick={() =>
                                setKitQty(stream.id, Math.max(0, qty - 1))
                              }
                            >
                              −
                            </button>
                            <div className="min-w-[2rem] px-1 text-center text-sm font-semibold tabular-nums">
                              {qty}
                            </div>
                            <button
                              type="button"
                              className="px-2.5 py-1.5 text-lg leading-none text-muted-foreground hover:bg-muted"
                              aria-label={`Increase starting kit quantity for ${stream.name}`}
                              onClick={() => setKitQty(stream.id, qty + 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
            </div>
          </div>

          {/* Right — live invoice */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/20">
            <div className="shrink-0 border-b border-border px-4 py-3">
              <h3 className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-base font-semibold text-card-foreground">
                <span className="shrink-0">Invoice</span>
                <span className="min-w-0 font-normal text-muted-foreground">
                  <span aria-hidden className="text-muted-foreground/80">
                    -
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
                <div className="space-y-6">
                  {startingKitItems.length > 0 &&
                    (preview.startingKitGroups?.length ?? 0) > 0 && (
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Kits
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            {selectedKitsTotalQty}{" "}
                            {selectedKitsTotalQty === 1 ? "kit" : "kits"}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {(preview.startingKitGroups ?? []).map((g) => (
                            <InvoiceGroupCard
                              key={g.streamId}
                              kind="KIT"
                              title={g.streamName}
                              kitQty={g.quantity}
                              costs={[
                                { label: "Material cost", unit: g.materialUnit },
                                { label: "Kit cost", unit: g.kitUnit },
                                { label: "Royalty", unit: g.royaltyUnit },
                              ]}
                              items={g.items.map((it) => ({
                                name: it.name,
                                quantity: it.quantity,
                              }))}
                              totalAmount={
                                (g.materialUnit + g.kitUnit + g.royaltyUnit) *
                                g.quantity
                              }
                              onRemove={() => setKitQty(g.streamId, 0)}
                              removeAriaLabel={`Remove starting kit ${g.streamName} from invoice`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  {selectedStudentIds.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Students
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {selectedStudentIds.length}{" "}
                          {selectedStudentIds.length === 1
                            ? "student"
                            : "students"}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {selectedStudentIds.map((sid) => {
                          const student = eligibleStudents.find(
                            (x) => x.id === sid,
                          );
                          const bd = preview.students?.find(
                            (x) => x.studentId === sid,
                          );
                          if (!student || !bd) {
                            return (
                              <div
                                key={sid}
                                className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
                              >
                                Loading…
                              </div>
                            );
                          }
                          const costs = [];
                          if (bd.materialCost > 0) {
                            costs.push({
                              label: "Material cost",
                              amount: bd.materialCost,
                            });
                          }
                          if (bd.kitCost > 0) {
                            costs.push({
                              label: "Starting kit",
                              amount: bd.kitCost,
                            });
                          }
                          if (bd.royalty > 0) {
                            costs.push({
                              label: "Royalty",
                              amount: bd.royalty,
                            });
                          }
                          return (
                            <InvoiceGroupCard
                              key={sid}
                              kind="STUDENT"
                              title={student.name}
                              subtitle={(() => {
                                const n = String(bd.levelName ?? "").trim();
                                if (!n || n === "_") return undefined;
                                return n;
                              })()}
                              costs={costs}
                              items={studentLineItems(preview, sid)}
                              totalAmount={bd.totalPrice}
                              onRemove={() => toggleStudent(sid)}
                              removeAriaLabel={`Remove student ${student.name} from invoice`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedInstructorIds.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Instructors
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {selectedInstructorIds.length} instructor
                          {selectedInstructorIds.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {selectedInstructorIds.map((iid) => {
                          const ins = instructorById.get(iid);
                          const grp = preview.instructorGroups?.find(
                            (g) => g.instructorId === iid,
                          );
                          return (
                            <InvoiceGroupCard
                              key={iid}
                              kind="CI"
                              title={ins?.name ?? grp?.name ?? "Instructor"}
                              subtitle={(() => {
                                const raw =
                                  ins?.instructorId ?? grp?.instructorCode;
                                const s = displayInstructorCode(raw);
                                return s || undefined;
                              })()}
                              free
                              items={
                                grp?.items?.length
                                  ? grp.items.map((it) => ({
                                      name: it.name,
                                      quantity: it.quantity,
                                    }))
                                  : []
                              }
                              totalAmount={0}
                              onRemove={() => toggleInstructor(iid)}
                              removeAriaLabel={`Remove instructor ${ins?.name ?? grp?.name ?? "unknown"} from invoice`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-border bg-card px-4 py-4">
          <div className="ml-auto flex w-full max-w-md flex-col items-end gap-2 text-right">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estimated total
            </div>
            <div className="flex w-full shrink-0 flex-nowrap justify-end gap-2 sm:w-auto">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="min-w-0 flex-1 sm:flex-initial"
              >
                Cancel
              </Button>
              <Button
                className="min-w-0 flex-1 sm:flex-initial"
                onClick={handleContinue}
                disabled={
                  !hasSelection ||
                  isSubmitting ||
                  invoicePreview.isLoading ||
                  invoicePreview.isFetching ||
                  invoicePreview.isError
                }
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Pay {currencyFormatter.format(preview?.totalAmount ?? 0)}
              </Button>
            </div>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
