"use client";

import React, { useState } from "react";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  History,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AppDialog,
  AppDialogBody,
  AppDialogFooter,
  AppDialogHeader,
} from "@/components/shared/dialog";
import {
  DateToolbarField,
  EmptyState,
  ItemsTable,
  StatusBadge,
  type ItemsTableColumn,
  type StatusTone,
} from "@/components/shared";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/date-utils";
import { useInventoryMovementsQuery } from "@/hooks/api/inventory.hooks";
import type {
  InventoryItemSummary,
  StockMovementRow,
  StockMovementType,
} from "@/services/inventory.service";

const MOVEMENTS_PER_PAGE = 10;

const MOVEMENT_TYPE_META: Record<
  StockMovementType,
  { label: string; tone: StatusTone }
> = {
  SUPPLIER_RECEIVED: { label: "Received", tone: "success" },
  ORDER_FULFILL: { label: "Dispatched", tone: "info" },
  MANUAL_ADJUSTMENT: { label: "Adjusted", tone: "warning" },
  ORDER_RESERVE: { label: "Allocated", tone: "info" },
  ORDER_BACKORDER: { label: "Backordered", tone: "warning" },
  ORDER_CANCEL_RELEASE: { label: "Released", tone: "neutral" },
};

const TYPE_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All types" },
  ...Object.entries(MOVEMENT_TYPE_META).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const QUICK_RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

/** Local-date ISO (yyyy-MM-dd) — toISOString would shift the day near midnight IST. */
function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function MovementReferenceCell({ movement }: { movement: StockMovementRow }) {
  if (movement.order) {
    return (
      <div className="min-w-[12rem] whitespace-normal">
        <div className="font-medium">Order {movement.order.referenceId}</div>
        {movement.order.franchiseName ? (
          <div className="text-xs text-muted-foreground">
            {movement.order.franchiseName}
          </div>
        ) : null}
      </div>
    );
  }
  if (movement.receipt) {
    return (
      <div className="min-w-[12rem] whitespace-normal">
        <div className="font-medium">
          {movement.receipt.poReferenceNo ??
            movement.receipt.supplierName ??
            "Purchase receipt"}
        </div>
        {movement.receipt.poReferenceNo && movement.receipt.supplierName ? (
          <div className="text-xs text-muted-foreground">
            {movement.receipt.supplierName}
          </div>
        ) : null}
      </div>
    );
  }
  if (movement.note) {
    return (
      <div className="min-w-[12rem] whitespace-normal">
        <div className="font-medium">{movement.note}</div>
        <div className="text-xs text-muted-foreground">Manual adjustment</div>
      </div>
    );
  }
  return <>—</>;
}

const MOVEMENT_COLUMNS: ItemsTableColumn<StockMovementRow>[] = [
  {
    key: "occurredAt",
    header: "Date",
    render: (m) => (
      <span className="whitespace-nowrap">{formatDateTime(m.occurredAt)}</span>
    ),
  },
  {
    key: "movement",
    header: "Movement",
    render: (m) => {
      const meta = MOVEMENT_TYPE_META[m.movementType];
      return (
        <div>
          <StatusBadge
            tone={meta?.tone}
            label={meta?.label ?? m.movementType}
          />
          {m.bucket === "ON_ORDER" ? (
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              on order
            </span>
          ) : null}
        </div>
      );
    },
  },
  {
    key: "deltaQty",
    header: "Qty change",
    align: "right",
    render: (m) => (
      <span
        className={cn(
          "font-medium tabular-nums",
          m.deltaQty > 0 ? "text-success" : "text-destructive",
        )}
      >
        {m.deltaQty > 0 ? `+${m.deltaQty}` : m.deltaQty}
      </span>
    ),
  },
  {
    key: "onHandAfter",
    header: "On hand after",
    align: "right",
    render: (m) =>
      m.onHandAfter == null ? (
        <span
          className="text-muted-foreground"
          title={
            m.backfilled
              ? "Recorded before the movement ledger existed — running balance unknown."
              : "Reservation movements do not change on-hand stock."
          }
        >
          —
        </span>
      ) : (
        <span className="tabular-nums">{m.onHandAfter}</span>
      ),
  },
  {
    key: "reference",
    header: "Reference",
    render: (m) => <MovementReferenceCell movement={m} />,
  },
  {
    key: "actor",
    header: "By",
    render: (m) => m.actorName ?? "System",
  },
];

export interface MovementHistoryDialogProps {
  open: boolean;
  item: InventoryItemSummary | null;
  /** Super-admin region view: scope to this warehouse location. */
  regionLocationId?: number;
  onClose: () => void;
}

/**
 * Per-item stock movement ledger. Deliberately fetch-on-demand: nothing loads
 * until the admin picks a date range and presses "Load history" — the backend
 * enforces the same rule by requiring the range.
 */
export function MovementHistoryDialog({
  open,
  item,
  regionLocationId,
  onClose,
}: MovementHistoryDialogProps) {
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [appliedRange, setAppliedRange] = useState<{
    fromDate: string;
    toDate: string;
  } | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rangeError, setRangeError] = useState<string | null>(null);

  // Reset on close (covers X, overlay, Esc, and the footer button) so the
  // next open always starts blank — reopening must never auto-fetch.
  function handleClose() {
    setDraftFrom("");
    setDraftTo("");
    setAppliedRange(null);
    setTypeFilter("all");
    setPage(1);
    setRangeError(null);
    onClose();
  }

  const movementsQuery = useInventoryMovementsQuery(
    item && appliedRange
      ? {
          itemId: item.id,
          fromDate: appliedRange.fromDate,
          toDate: appliedRange.toDate,
          movementType:
            typeFilter === "all"
              ? undefined
              : (typeFilter as StockMovementType),
          page,
          limit: MOVEMENTS_PER_PAGE,
          regionLocationId,
        }
      : null,
  );

  function applyQuickRange(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    setDraftFrom(toIsoDate(from));
    setDraftTo(toIsoDate(to));
    setRangeError(null);
  }

  function handleLoad() {
    if (!draftFrom || !draftTo) {
      setRangeError(
        "Choose both dates — movements are fetched only for an explicit range.",
      );
      return;
    }
    if (draftFrom > draftTo) {
      setRangeError("The From date must be on or before the To date.");
      return;
    }
    setRangeError(null);
    setPage(1);
    if (
      appliedRange &&
      appliedRange.fromDate === draftFrom &&
      appliedRange.toDate === draftTo
    ) {
      void movementsQuery.refetch();
      return;
    }
    setAppliedRange({ fromDate: draftFrom, toDate: draftTo });
  }

  const data = movementsQuery.data;
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const showSkeleton = Boolean(appliedRange) && movementsQuery.isPending;

  return (
    <AppDialog open={open} onOpenChange={(next) => !next && handleClose()} size="xl" scrollBody>
      <AppDialogHeader
        icon={History}
        title="Movement history"
        description={item ? `${item.name} · SKU ${item.sku}` : undefined}
      />
      <AppDialogBody>
        {item ? (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div>
                  <div className="text-muted-foreground">On hand</div>
                  <div className="text-base font-medium text-foreground">
                    {item.onHandQty}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Reserved</div>
                  <div className="text-base font-medium text-foreground">
                    {item.reservedQty}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Available</div>
                  <div className="text-base font-medium text-foreground">
                    {item.availableQty}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">On order</div>
                  <div className="text-base font-medium text-foreground">
                    {item.onOrderQty}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <DateToolbarField
                label="From"
                value={draftFrom}
                onChange={(value) => {
                  setDraftFrom(value);
                  setRangeError(null);
                }}
              />
              <DateToolbarField
                label="To"
                value={draftTo}
                onChange={(value) => {
                  setDraftTo(value);
                  setRangeError(null);
                }}
              />
              <div className="flex gap-1 pb-0.5">
                {QUICK_RANGES.map((range) => (
                  <Button
                    key={range.days}
                    variant="outline"
                    size="sm"
                    onClick={() => applyQuickRange(range.days)}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Movement type
                </Label>
                <Select
                  value={typeFilter}
                  onValueChange={(value) => {
                    setTypeFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleLoad}>Load history</Button>
            </div>
            {rangeError ? (
              <p className="text-xs text-destructive">{rangeError}</p>
            ) : null}

            {!appliedRange ? (
              <EmptyState
                icon={CalendarRange}
                title="Select a date range to load movement history."
                hint="Nothing is fetched until you choose a range and press Load history."
                className="py-8"
              />
            ) : showSkeleton ? (
              <div className="space-y-2" aria-hidden data-testid="movement-history-loading">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-10 animate-pulse rounded-md bg-muted"
                  />
                ))}
              </div>
            ) : movementsQuery.isError ? (
              <EmptyState
                icon={TriangleAlert}
                title="Couldn't load movement history."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void movementsQuery.refetch()}
                  >
                    Retry
                  </Button>
                }
                className="py-8"
              />
            ) : (
              <div
                className={cn(
                  "space-y-2",
                  movementsQuery.isFetching && "opacity-60",
                )}
              >
                <p className="text-xs text-muted-foreground">
                  {total} movement{total !== 1 ? "s" : ""} between{" "}
                  {formatDate(appliedRange.fromDate)} and{" "}
                  {formatDate(appliedRange.toDate)}
                  {typeFilter !== "all"
                    ? ` · filtered to ${MOVEMENT_TYPE_META[typeFilter as StockMovementType]?.label ?? typeFilter}`
                    : ""}
                </p>
                <ItemsTable
                  columns={MOVEMENT_COLUMNS}
                  rows={data?.rows ?? []}
                  emptyLabel="No movements recorded in this range."
                />
                {totalPages > 1 ? (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs text-muted-foreground">
                      Page {page} of {totalPages} ·{" "}
                      {(page - 1) * MOVEMENTS_PER_PAGE + 1}–
                      {Math.min(page * MOVEMENTS_PER_PAGE, total)} of {total}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((prev) => prev - 1)}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((prev) => prev + 1)}
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </AppDialogBody>
      <AppDialogFooter
        padded
        leftSlot={
          <span className="text-xs text-muted-foreground">
            Movements are recorded automatically by orders, dispatches,
            receipts, and manual adjustments.
          </span>
        }
        secondary={{ label: "Close", variant: "outline", onClick: handleClose }}
      />
    </AppDialog>
  );
}
