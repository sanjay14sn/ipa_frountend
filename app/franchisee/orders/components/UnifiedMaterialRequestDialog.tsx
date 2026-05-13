"use client";

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
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
  previewOrderInvoice,
  initiateOrderPayment,
  type InvoicePreview,
} from "@/services/order.service";
import { getAllStreams, type Stream } from "@/services/stream.service";
import { useCourseInstructors } from "@/hooks/api/course-instructor.hooks";
import type { CourseInstructorData } from "@/services/course-instructor.service";
import InvoiceGroupCard from "./checkout/InvoiceGroupCard";

interface UnifiedMaterialRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onPaymentInitiated: (paymentData: unknown) => void;
  eligibleStudents: StudentData[];
  franchiseId: string;
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function getStudentLevelName(student: StudentData): string {
  if (student.level && typeof student.level === "object") {
    const l = student.level as { name?: string; code?: string };
    return l.name ?? l.code ?? "";
  }
  return String(student.level ?? "");
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
  franchiseId,
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

  const invoiceQuery = useQuery({
    queryKey: [
      "unified-invoice-preview",
      selectedStudentIds,
      selectedInstructorIds,
      startingKitItems.map((i) => `${i.streamId}:${i.quantity}`).join(","),
      franchiseId,
    ],
    queryFn: () =>
      previewOrderInvoice({
        studentIds: selectedStudentIds,
        instructorIds: selectedInstructorIds,
        startingKitItems: startingKitItems.map((i) => ({
          streamId: i.streamId,
          quantity: i.quantity,
        })),
        franchiseId,
      }),
    enabled: open && hasSelection,
    staleTime: 30_000,
  });

  const preview = invoiceQuery.data;
  const lastKitUnitByStreamRef = useRef<Record<number, number>>({});

  useEffect(() => {
    if (!preview?.startingKitGroups?.length) return;
    for (const g of preview.startingKitGroups) {
      lastKitUnitByStreamRef.current[g.streamId] =
        g.materialUnit + g.kitUnit + g.royaltyUnit;
    }
  }, [preview?.startingKitGroups]);

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
  const cardCount =
    startingKitItems.length +
    selectedStudentIds.length +
    selectedInstructorIds.length;

  const instructorById = useMemo(() => {
    const m = new Map<number, CourseInstructorData>();
    for (const c of orderableInstructors) m.set(c.id, c);
    return m;
  }, [orderableInstructors]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-full max-w-6xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Request materials
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Pick starting kits, students, and CI instructors on the left — the
            invoice on the right updates live.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Left — selection */}
          <div className="flex min-h-0 w-full flex-col border-border lg:w-[min(420px,42%)] lg:border-r">
            <div className="shrink-0 border-b border-border px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                Step 1
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  Choose what to include
                </h3>
                <span className="text-xs text-muted-foreground">
                  {selectedKitsTotalQty +
                    selectedStudentIds.length +
                    selectedInstructorIds.length}{" "}
                  selected
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
              {/* Kits */}
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    Starting kits
                  </h4>
                  <span
                    className={
                      selectedKitsTotalQty === 0
                        ? "rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        : "rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
                    }
                  >
                    {selectedKitsTotalQty}
                  </span>
                </div>
                {streamsQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading streams…
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(streamsQuery.data ?? []).map((stream) => {
                      const qty = startingKitQuantities[stream.id] ?? 0;
                      const unit =
                        streamUnitByStreamId.get(stream.id) ??
                        lastKitUnitByStreamRef.current[stream.id];
                      return (
                        <div
                          key={stream.id}
                          className={
                            "flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 " +
                            (qty > 0
                              ? "border-primary/30 bg-primary/[0.04]"
                              : "border-border bg-card")
                          }
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-foreground">
                              {stream.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              First-level starter materials
                              {unit != null && unit > 0 ? (
                                <>
                                  {" "}
                                  <span className="text-muted-foreground/50">
                                    ·
                                  </span>{" "}
                                  <span className="font-medium text-foreground">
                                    {currencyFormatter.format(unit)} each
                                  </span>
                                </>
                              ) : null}
                            </div>
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
                  <h4 className="text-sm font-semibold text-foreground">
                    Student materials
                  </h4>
                  <span
                    className={
                      selectedStudentIds.length === 0
                        ? "rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        : "rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
                    }
                  >
                    {selectedStudentIds.length}
                  </span>
                  <span className="flex-1" />
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={toggleAllStudents}
                    disabled={stuFiltered.length === 0}
                  >
                    {stuFiltered.length > 0 &&
                    stuFiltered.every((s) =>
                      selectedStudentIds.includes(s.id),
                    )
                      ? "Clear shown"
                      : "Select all shown"}
                  </button>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Search by name or level"
                    aria-label="Search students by name or level"
                    value={stuQuery}
                    onChange={(e) => setStuQuery(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background py-2 pl-8 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border">
                  {stuFiltered.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No matches.
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
                      return (
                        <button
                          key={s.id}
                          type="button"
                          aria-pressed={sel}
                          onClick={() => toggleStudent(s.id)}
                          className={
                            "flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-muted/50 " +
                            (sel ? "bg-primary/[0.06]" : "")
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
                            <div className="font-medium text-foreground">
                              {s.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {bd != null
                                ? `${currencyFormatter.format(bd.totalPrice)} · ${itemCount} ${itemCount === 1 ? "item" : "items"}`
                                : invoiceQuery.isFetching
                                  ? "…"
                                  : "—"}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            {getStudentLevelName(s)}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              {/* CI */}
              <section>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    CI training materials
                  </h4>
                  <span
                    className={
                      selectedInstructorIds.length === 0
                        ? "rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        : "rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
                    }
                  >
                    {selectedInstructorIds.length}
                  </span>
                  <span className="flex-1" />
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={toggleAllInstructors}
                    disabled={ciFiltered.length === 0}
                  >
                    {ciFiltered.length > 0 &&
                    ciFiltered.every((c) =>
                      selectedInstructorIds.includes(c.id),
                    )
                      ? "Clear shown"
                      : "Select all shown"}
                  </button>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Search instructors"
                    aria-label="Search instructors by name or code"
                    value={ciQuery}
                    onChange={(e) => setCiQuery(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background py-2 pl-8 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border">
                  {ciListLoading ? (
                    <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading instructors…
                    </div>
                  ) : ciFiltered.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No matches.
                    </p>
                  ) : (
                    ciFiltered.map((c) => {
                      const sel = selectedInstructorIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          aria-pressed={sel}
                          onClick={() => toggleInstructor(c.id)}
                          className={
                            "flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-muted/50 " +
                            (sel ? "bg-primary/[0.06]" : "")
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
                            <div className="font-medium text-foreground">
                              {c.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {c.instructorId}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                            No charge
                          </span>
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
              <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                Live invoice
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  Order summary
                </h3>
                <span className="text-xs text-muted-foreground">
                  {emptyInvoice
                    ? "Nothing added yet"
                    : `${cardCount} ${cardCount === 1 ? "card" : "cards"}`}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {emptyInvoice && (
                <div className="mx-auto max-w-md rounded-xl border border-dashed border-border bg-card/80 px-6 py-10 text-center">
                  <div className="text-base font-semibold text-foreground">
                    Your invoice is empty
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Pick a kit, student, or instructor on the left to start
                    building the order. Costs roll up per group — kit cost +
                    material + royalty per kit, material + royalty per student.
                  </p>
                </div>
              )}

              {!emptyInvoice && invoiceQuery.isLoading && (
                <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading invoice…
                </div>
              )}

              {!emptyInvoice && invoiceQuery.isError && (
                <p className="py-6 text-sm text-destructive">
                  Could not load the invoice for this selection.
                </p>
              )}

              {!emptyInvoice && preview && (
                <div className="space-y-6">
                  {startingKitItems.length > 0 &&
                    (preview.startingKitGroups?.length ?? 0) > 0 && (
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Starting kits
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
                          Student materials
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
                                Loading {student?.name ?? "student"}…
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
                              subtitle={bd.levelName}
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
                          CI training materials
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {selectedInstructorIds.length} instructor
                          {selectedInstructorIds.length !== 1 ? "s" : ""} · no
                          charge
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
                              subtitle={
                                ins?.instructorId ?? grp?.instructorCode ?? ""
                              }
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Estimated total
              </div>
              <div className="text-2xl font-semibold tabular-nums text-foreground">
                {currencyFormatter.format(preview?.totalAmount ?? 0)}
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">
                    {selectedKitsTotalQty}
                  </span>{" "}
                  kits
                </div>
                <div>
                  <span className="font-semibold text-foreground">
                    {selectedStudentIds.length}
                  </span>{" "}
                  students
                </div>
                <div>
                  <span className="font-semibold text-foreground">
                    {selectedInstructorIds.length}
                  </span>{" "}
                  CIs
                </div>
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleContinue}
                disabled={
                  !hasSelection ||
                  isSubmitting ||
                  invoiceQuery.isLoading ||
                  invoiceQuery.isFetching ||
                  invoiceQuery.isError
                }
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Continue
              </Button>
            </div>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
