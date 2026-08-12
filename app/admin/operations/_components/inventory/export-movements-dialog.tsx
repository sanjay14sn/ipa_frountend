"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/shared/dialog";
import { DateToolbarField } from "@/components/shared";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  exportInventoryMovementsCsv,
  type ExportInventoryMovementsParams,
} from "@/services/inventory.service";
import { MOVEMENT_QUICK_RANGES, quickRangeDates } from "./types";

export type ExportMovementsFilters = Omit<
  ExportInventoryMovementsParams,
  "fromDate" | "toDate"
>;

/**
 * Movement-summary CSV export: mandatory date range (never exports without
 * one), one row per item matching the table's current filters — program and
 * level included — with stock-in / stock-out counts for the range.
 */
export function ExportMovementsDialog({
  open,
  filters,
  onClose,
}: {
  open: boolean;
  /** The inventory table's live filter state; applied verbatim to the export. */
  filters: ExportMovementsFilters;
  onClose: () => void;
}) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  function handleClose() {
    if (isExporting) return;
    setFromDate("");
    setToDate("");
    setRangeError(null);
    onClose();
  }

  async function handleExport() {
    if (!fromDate || !toDate) {
      setRangeError("Choose both dates — the export needs an explicit range.");
      return;
    }
    if (fromDate > toDate) {
      setRangeError("The From date must be on or before the To date.");
      return;
    }
    setRangeError(null);
    try {
      setIsExporting(true);
      await exportInventoryMovementsCsv({ ...filters, fromDate, toDate });
      toast.success("Movement summary exported.");
      handleClose();
    } catch (error) {
      toast.error(getUserFriendlyMessage(error, "Failed to export CSV."));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
      size="md"
      title="Export movement summary"
      formId="export-movements-form"
      onSubmit={(e) => {
        e.preventDefault();
        void handleExport();
      }}
      isSubmitting={isExporting}
      submitLabel={isExporting ? "Exporting..." : "Export CSV"}
      cancelLabel="Cancel"
      canSubmit={!isExporting && Boolean(fromDate) && Boolean(toDate)}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          One CSV row per item matching the current table filters (search,
          program, level, category, status, stock level). Each movement type
          gets its own column for the chosen range — Received, Dispatched,
          Adjusted (increase and decrease), Allocated, Backordered, Released —
          plus stock-in / stock-out totals and net change.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <DateToolbarField
            label="From"
            value={fromDate}
            onChange={(value) => {
              setFromDate(value);
              setRangeError(null);
            }}
          />
          <DateToolbarField
            label="To"
            value={toDate}
            onChange={(value) => {
              setToDate(value);
              setRangeError(null);
            }}
          />
        </div>
        <div className="flex gap-1">
          {MOVEMENT_QUICK_RANGES.map((range) => (
            <Button
              key={range.days}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const preset = quickRangeDates(range.days);
                setFromDate(preset.from);
                setToDate(preset.to);
                setRangeError(null);
              }}
            >
              {range.label}
            </Button>
          ))}
        </div>
        {rangeError ? (
          <p className="text-xs text-destructive">{rangeError}</p>
        ) : null}
      </div>
    </FormDialog>
  );
}
