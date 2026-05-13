"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { type StudentData } from "@/services/student.service";
import {
  previewOrderInvoice,
  initiateOrderPayment,
} from "@/services/order.service";
import { getAllStreams, type Stream } from "@/services/stream.service";
import InvoicePreviewCard from "./InvoicePreviewCard";

interface UnifiedMaterialRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onPaymentInitiated: (paymentData: unknown) => void;
  eligibleStudents: StudentData[];
  franchiseId: string;
}

function getStudentLevelName(student: StudentData): string {
  if (student.level && typeof student.level === "object") {
    const l = student.level as { name?: string; code?: string };
    return l.name ?? l.code ?? "";
  }
  return String(student.level ?? "");
}

function SectionHeader({
  title,
  open,
  onToggle,
  count,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-muted/70"
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
        {title}
        {count != null && count > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
            {count}
          </span>
        )}
      </span>
      {open ? (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}

export default function UnifiedMaterialRequestDialog({
  open,
  onClose,
  onPaymentInitiated,
  eligibleStudents,
  franchiseId,
}: UnifiedMaterialRequestDialogProps) {
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const selectedInstructorIds: number[] = [];
  const [startingKitQuantities, setStartingKitQuantities] = useState<
    Record<number, number>
  >({});

  const [studentsOpen, setStudentsOpen] = useState(true);
  const [kitOpen, setKitOpen] = useState(false);
  const [ciOpen, setCiOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const streamsQuery = useQuery<Stream[]>({
    queryKey: ["streams"],
    queryFn: getAllStreams,
    staleTime: 5 * 60 * 1000,
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
    enabled: hasSelection,
    staleTime: 30_000,
  });

  const toggleStudent = useCallback((id: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }, []);

  const toggleAllStudents = useCallback(() => {
    setSelectedStudentIds((prev) =>
      prev.length === eligibleStudents.length
        ? []
        : eligibleStudents.map((s) => s.id),
    );
  }, [eligibleStudents]);

  const handleKitQuantityChange = (streamId: number, value: string) => {
    const qty = parseInt(value, 10);
    setStartingKitQuantities((prev) => ({
      ...prev,
      [streamId]: isNaN(qty) || qty < 0 ? 0 : qty,
    }));
  };

  const handleContinue = async () => {
    const totalAmount = invoiceQuery.data?.totalAmount ?? 0;
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Request Materials</DialogTitle>
          <DialogDescription>
            Select students, starting kit items, and CI instructors to include
            in this material request.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {/* Section 1 — Student Materials */}
          <div className="space-y-2">
            <SectionHeader
              title="Student Materials"
              open={studentsOpen}
              onToggle={() => setStudentsOpen((v) => !v)}
              count={selectedStudentIds.length}
            />
            {studentsOpen && (
              <div className="rounded-lg border border-border bg-card">
                {eligibleStudents.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    No eligible students found.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
                      <Checkbox
                        id="select-all-students"
                        checked={
                          eligibleStudents.length > 0 &&
                          selectedStudentIds.length === eligibleStudents.length
                        }
                        onCheckedChange={toggleAllStudents}
                      />
                      <label
                        htmlFor="select-all-students"
                        className="cursor-pointer text-xs font-medium text-muted-foreground"
                      >
                        Select all ({eligibleStudents.length})
                      </label>
                    </div>
                    <div className="max-h-52 divide-y divide-border overflow-y-auto">
                      {eligibleStudents.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center gap-3 px-4 py-2.5"
                        >
                          <Checkbox
                            id={`student-${student.id}`}
                            checked={selectedStudentIds.includes(student.id)}
                            onCheckedChange={() => toggleStudent(student.id)}
                          />
                          <label
                            htmlFor={`student-${student.id}`}
                            className="flex flex-1 cursor-pointer items-center justify-between"
                          >
                            <span className="text-sm font-medium text-card-foreground">
                              {student.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {getStudentLevelName(student)}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Section 2 — Starting Kit */}
          <div className="space-y-2">
            <SectionHeader
              title="Starting Kit"
              open={kitOpen}
              onToggle={() => setKitOpen((v) => !v)}
              count={startingKitItems.length}
            />
            {kitOpen && (
              <div className="rounded-lg border border-border bg-card">
                {streamsQuery.isLoading ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading streams…
                  </div>
                ) : streamsQuery.isError ? (
                  <p className="px-4 py-3 text-sm text-destructive">
                    Failed to load streams.
                  </p>
                ) : (streamsQuery.data ?? []).length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    No streams available.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {(streamsQuery.data ?? []).map((stream) => (
                      <div
                        key={stream.id}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <span className="text-sm text-card-foreground">
                          {stream.name}
                        </span>
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={startingKitQuantities[stream.id] || ""}
                          onChange={(e) =>
                            handleKitQuantityChange(stream.id, e.target.value)
                          }
                          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {startingKitItems.length > 0 && (
                  <div className="border-t border-border bg-muted/30 px-4 py-2.5">
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                      Selected kit items:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {startingKitItems.map((item) => (
                        <span
                          key={item.streamId}
                          className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                        >
                          {item.streamName} ×{item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3 — CI Instructor Materials */}
          <div className="space-y-2">
            <SectionHeader
              title="CI Instructor Materials"
              open={ciOpen}
              onToggle={() => setCiOpen((v) => !v)}
              count={selectedInstructorIds.length}
            />
            {ciOpen && (
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  CI instructor selection coming soon.
                </p>
              </div>
            )}
          </div>

          {/* Invoice Preview */}
          {hasSelection && (
            <div className="pt-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Invoice Preview
              </p>
              <InvoicePreviewCard
                loading={invoiceQuery.isLoading || invoiceQuery.isFetching}
                preview={invoiceQuery.data ?? null}
                selected={
                  selectedStudentIds.length +
                  selectedInstructorIds.length +
                  startingKitItems.length
                }
                emptyMessage="Select at least one item to preview the invoice."
                copyVariant="preview"
                variant="embedded"
              />
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!hasSelection || isSubmitting}
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
