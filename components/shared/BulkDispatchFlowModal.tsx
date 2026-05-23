"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Truck, X } from "lucide-react";
import { toast } from "sonner";
import {
  AppDialog,
  AppDialogBody,
  AppDialogFooter,
  AppDialogHeader,
} from "@/components/shared/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  usePreviewBulkDispatch,
  useConfirmBulkDispatch,
  useDispatchEligibleCertificates,
} from "@/hooks/api/certificate-dispatch.hooks";
import type { DispatchEligibleOrder } from "@/components/shared/BulkDispatchPickerModal";

interface DispatchEligibleCertRow {
  id: number;
  studentName: string;
  studentRollNo: string;
  requestDate: string;
  marksObtained: number;
  totalMarks: number;
  levelTotalMarks: number;
  instructorName: string;
  studentLevel: string;
  studentLevelCode?: string;
}

function rowToItem(row: DispatchEligibleCertRow) {
  const denominator = row.totalMarks || row.levelTotalMarks || 1;
  return {
    id: row.id,
    label: row.studentName,
    sublabel: row.studentRollNo,
    requestDate: (row.requestDate ?? "").slice(0, 10),
    levelMarks: `${row.marksObtained}/${denominator}`,
    ciName: row.instructorName,
    levelCode: row.studentLevelCode?.trim() || row.studentLevel || undefined,
  };
}

function normalizeEligibleRows(payload: unknown): DispatchEligibleCertRow[] {
  if (!payload) return [];
  const container =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  const rawRows = Array.isArray(payload)
    ? payload
    : Array.isArray(container.rows)
      ? container.rows
      : Array.isArray(container.data)
        ? container.data
        : [];

  return (rawRows as Array<Record<string, unknown>>).map((raw) => {
    const student =
      raw.student && typeof raw.student === "object"
        ? (raw.student as Record<string, unknown>)
        : {};
    const instructor =
      raw.instructor && typeof raw.instructor === "object"
        ? (raw.instructor as Record<string, unknown>)
        : {};
    const level =
      raw.level && typeof raw.level === "object"
        ? (raw.level as Record<string, unknown>)
        : {};

    return {
      id: Number(raw.id),
      studentName: String(
        raw.studentName ?? student.name ?? `Student #${raw.studentId ?? ""}`,
      ),
      studentRollNo: String(raw.studentRollNo ?? student.rollNo ?? ""),
      requestDate: String(raw.requestDate ?? ""),
      marksObtained: Number(raw.marksObtained ?? 0),
      totalMarks: Number(raw.totalMarks ?? level.totalMarks ?? 0),
      levelTotalMarks: Number(level.totalMarks ?? raw.levelTotalMarks ?? 0),
      instructorName: String(raw.instructorName ?? instructor.name ?? ""),
      studentLevel: String(
        raw.studentLevel ?? level.name ?? level.code ?? "",
      ),
      studentLevelCode:
        raw.studentLevelCode != null
          ? String(raw.studentLevelCode)
          : level.code != null
            ? String(level.code)
            : undefined,
    };
  });
}

function itemMatchesSearch(
  item: ReturnType<typeof rowToItem>,
  q: string,
) {
  if (!q.trim()) return true;
  const blob = [
    item.label,
    item.sublabel,
    item.requestDate,
    item.levelMarks,
    item.ciName,
    item.levelCode,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return blob.includes(q.trim().toLowerCase());
}

function itemMetaLine(item: ReturnType<typeof rowToItem>) {
  const parts: string[] = [];
  if (item.levelCode) parts.push(item.levelCode);
  if (item.levelMarks) parts.push(`Marks ${item.levelMarks}`);
  if (item.ciName) parts.push(item.ciName);
  if (item.requestDate) parts.push(item.requestDate);
  return parts.join(" · ");
}

function formatYyyymmdd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

interface BulkDispatchFlowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  franchiseId: string;
  eligibleOrders: DispatchEligibleOrder[];
  isLoadingOrders: boolean;
  onComplete: () => void;
}

export function BulkDispatchFlowModal({
  open,
  onOpenChange,
  franchiseId,
  eligibleOrders,
  isLoadingOrders,
  onComplete,
}: BulkDispatchFlowModalProps) {
  const [step, setStep] = useState<"select" | "preview">("select");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [orderMode, setOrderMode] = useState<"new" | "existing">("new");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const downloadedKeyRef = useRef<string | null>(null);

  const eligibleQuery = useDispatchEligibleCertificates(
    { franchiseId, page: 1, limit: 500 },
    open,
  );
  const previewMutation = usePreviewBulkDispatch();
  const confirmMutation = useConfirmBulkDispatch();

  const eligibleRows = useMemo(
    () => normalizeEligibleRows(eligibleQuery.data),
    [eligibleQuery.data],
  );
  const items = useMemo(() => eligibleRows.map(rowToItem), [eligibleRows]);
  const filtered = useMemo(
    () => items.filter((i) => itemMatchesSearch(i, search)),
    [items, search],
  );

  function resetAll() {
    setStep("select");
    setSelectedIds([]);
    setSearch("");
    setOrderMode("new");
    setSelectedOrderId(null);
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
    }
    setPdfUrl(null);
    downloadedKeyRef.current = null;
  }

  useEffect(() => {
    if (!open) {
      resetAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-download once when entering preview step with a fresh blob URL.
  useEffect(() => {
    if (step !== "preview" || !pdfUrl) return;
    const key = pdfUrl;
    if (downloadedKeyRef.current === key) return;
    downloadedKeyRef.current = key;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `certificates-bulk-${formatYyyymmdd(new Date())}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [step, pdfUrl]);

  function toggle(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleGeneratePdf() {
    if (selectedIds.length === 0) return;
    try {
      const blob = await previewMutation.mutateAsync(selectedIds);
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
      setStep("preview");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate PDF";
      toast.error(message);
    }
  }

  async function handleConfirm() {
    try {
      const result = await confirmMutation.mutateAsync({
        ids: selectedIds,
        orderId: orderMode === "existing" ? selectedOrderId ?? undefined : undefined,
      });
      const dispatched = result?.dispatched?.length ?? selectedIds.length;
      const skipped = result?.skipped?.length ?? 0;
      toast.success(
        `Dispatched ${dispatched}${skipped ? ` (${skipped} skipped)` : ""}`,
      );
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
      setPdfUrl(null);
      onComplete();
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to confirm dispatch";
      toast.error(message);
    }
  }

  function handleBack() {
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    downloadedKeyRef.current = null;
    setStep("select");
  }

  const pendingCount = selectedIds.length;
  const isDirty = pendingCount > 0;
  const isGenerating = previewMutation.isPending;
  const isSubmitting = confirmMutation.isPending;

  const isGenerateDisabled = selectedIds.length === 0 || isGenerating;
  const isConfirmDisabled =
    isSubmitting ||
    (orderMode === "existing" && selectedOrderId === null);

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size={step === "preview" ? "2xl" : "xl"}
      scrollBody
      maxHeight="max-h-[90vh]"
      className={step === "preview" ? "h-[90vh]" : undefined}
    >
      <AppDialogHeader
        title={
          step === "select"
            ? "Dispatch Certificates — Select"
            : "Dispatch Certificates — Preview & Confirm"
        }
        description={
          step === "select"
            ? "Pick the certificates to include in this dispatch batch."
            : "Review the merged certificate PDF, then confirm to dispatch."
        }
        icon={Truck}
      />

      {step === "select" ? (
        <AppDialogBody>
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-medium text-gray-900">
                  Dispatch-eligible certificates
                </h4>
                <span className="text-xs text-muted-foreground">
                  {eligibleQuery.isLoading
                    ? "Loading…"
                    : `${items.length} eligible`}
                </span>
              </div>

              {isDirty ? (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="mb-2 text-xs font-medium text-gray-900">
                    {pendingCount} selected — not yet dispatched
                  </p>
                  {selectedIds.map((id) => {
                    const item = items.find((i) => i.id === id);
                    if (!item) return null;
                    const meta = itemMetaLine(item);
                    return (
                      <div key={id} className="flex items-center gap-2 py-1">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-gray-900">
                            {item.label}
                          </div>
                          {meta ? (
                            <div className="truncate text-xs text-gray-500">
                              {meta}
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggle(id)}
                          aria-label={`Remove ${item.label} from selection`}
                          className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <Input
                className="mt-3"
                placeholder="Search by name, roll number, marks, or instructor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border bg-white">
                {eligibleQuery.isLoading ? (
                  <div className="flex items-center gap-2 px-3 py-6 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading eligible certificates…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="px-3 py-6 text-sm text-gray-500">
                    {items.length === 0
                      ? "No dispatch-eligible certificates available."
                      : "No certificates match your search."}
                  </div>
                ) : (
                  filtered.map((item) => {
                    const checked = selectedIds.includes(item.id);
                    const meta = itemMetaLine(item);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 border-b px-3 py-2.5 transition-colors last:border-b-0",
                          checked ? "bg-primary/10" : "hover:bg-gray-50",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggle(item.id)}
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                            checked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-gray-300 bg-white text-transparent",
                          )}
                          aria-label={
                            checked
                              ? `Uncheck ${item.label}`
                              : `Check ${item.label}`
                          }
                        >
                          <Check className="h-3 w-3" />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-gray-900">
                            {item.label}
                          </div>
                          {meta ? (
                            <div className="mt-0.5 truncate text-xs text-gray-500">
                              {meta}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </AppDialogBody>
      ) : (
        <AppDialogBody layout="fill" className="!p-0">
          <div className="flex h-full min-h-0 flex-col lg:flex-row">
            {/* Left — PDF preview grows with the popup width but always leaves
                room for the orders panel on the right. */}
            <div className="min-h-0 min-w-0 overflow-hidden border-b border-border bg-muted px-4 py-4 sm:px-5 lg:flex-1 lg:border-b-0 lg:border-r">
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  title="Bulk certificate dispatch preview"
                  className="block h-full w-full rounded-md border border-border/60 bg-white shadow-sm"
                />
              ) : (
                <div className="flex h-full items-center justify-center rounded-md border border-border/60 bg-white text-sm text-muted-foreground shadow-sm">
                  Preview unavailable.
                </div>
              )}
            </div>

            {/* Right — dispatch-as panel is a fixed sidebar so it never gets clipped. */}
            <div className="flex min-h-0 min-w-0 shrink-0 flex-col overflow-y-auto px-4 py-4 sm:px-5 lg:w-[26rem]">
              <p className="text-sm font-semibold text-card-foreground">
                Dispatch as
              </p>
              <div className="mt-2 space-y-1 text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="bulkDispatchFlowOrderMode"
                    checked={orderMode === "new"}
                    onChange={() => {
                      setOrderMode("new");
                      setSelectedOrderId(null);
                    }}
                    className="h-4 w-4 accent-primary"
                  />
                  Create as new dispatch order
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="bulkDispatchFlowOrderMode"
                    checked={orderMode === "existing"}
                    onChange={() => setOrderMode("existing")}
                    className="h-4 w-4 accent-primary"
                  />
                  Add to existing order
                </label>
              </div>

              {orderMode === "existing" ? (
                <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-white">
                  <div className="border-b bg-muted/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Eligible orders
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {isLoadingOrders ? (
                      <div className="flex items-center gap-2 px-3 py-6 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading orders…
                      </div>
                    ) : eligibleOrders.length === 0 ? (
                      <div className="px-3 py-6 text-sm text-gray-500">
                        No eligible orders found for this franchise.
                      </div>
                    ) : (
                      eligibleOrders.map((order) => {
                        const selected = selectedOrderId === order.id;
                        return (
                          <label
                            key={order.id}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 border-b px-3 py-2.5 text-sm transition-colors last:border-b-0",
                              selected ? "bg-primary/10" : "hover:bg-gray-50",
                            )}
                          >
                            <input
                              type="radio"
                              name="bulkDispatchFlowSelectedOrder"
                              checked={selected}
                              onChange={() => setSelectedOrderId(order.id)}
                              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-gray-900">
                                {order.referenceId}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                <span className="truncate">
                                  {order.orderType}
                                </span>
                                <span>·</span>
                                <span>
                                  {order.shipment?.status ?? "Awaiting shipment"}
                                </span>
                                <span>·</span>
                                <span>
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </AppDialogBody>
      )}

      <AppDialogFooter
        sticky
        tertiary={
          step === "preview"
            ? {
                label: "Back",
                onClick: handleBack,
                disabled: isSubmitting,
                variant: "outline",
              }
            : undefined
        }
        secondary={{
          label: "Cancel",
          onClick: () => onOpenChange(false),
        }}
        primary={
          step === "select"
            ? {
                label: isGenerating
                  ? "Generating…"
                  : `Generate merged PDF${selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}`,
                onClick: () => void handleGeneratePdf(),
                loading: isGenerating,
                disabled: isGenerateDisabled,
              }
            : {
                label: isSubmitting ? "Confirming…" : "Confirm dispatch",
                onClick: () => void handleConfirm(),
                loading: isSubmitting,
                disabled: isConfirmDisabled,
              }
        }
      />
    </AppDialog>
  );
}
