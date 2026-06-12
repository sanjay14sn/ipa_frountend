"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, isToday, parseISO } from "date-fns";
import {
  Banknote,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  ReceivableCompactSummary,
  ReceivableFranchiseeSummary,
  ReceivableInstallmentSummary,
  ReceivableSummaryItem,
} from "@/services/agreement.service";
import { GST_RATE_LABEL } from "@/lib/gst";
import { formatRupees } from "@/lib/currency-utils";

export interface EmiTimelineProps {
  summary:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null
    | undefined;
  /** From the parent agreement — used as a fallback when item-level flag absent. */
  gstFranchiseFee?: boolean | null;
  /** Card title. Defaults to "Your payment plan". */
  title?: string;
  /** Shown muted to the right of the title (e.g. "Agreement #8"). */
  agreementRef?: string | null;
  /** Empty-state message when the agreement has no plan. */
  emptyMessage?: string;
  /** Hide the bottom Principal / GST / EMIs-paid summary row. */
  hideSummaryRow?: boolean;
  className?: string;
  /**
   * When provided, renders a pencil button next to the date label on
   * unpaid, non-waived items. Admin-only — omit on franchisee pages.
   */
  onEditDueDate?: (item: ReceivableSummaryItem) => void;
  /**
   * When provided, renders a banknote button on unpaid, non-waived items to
   * record an offline payment. Admin-only — omit on franchisee pages.
   */
  onRecordPayment?: (item: ReceivableSummaryItem) => void;
}

function isFullInstallmentSummary(
  summary:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null
    | undefined,
): summary is ReceivableInstallmentSummary {
  return Boolean(summary && "items" in summary && Array.isArray(summary.items));
}

function hasReceivablePlan(
  summary:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null
    | undefined,
): boolean {
  if (!summary) return false;
  return !("hasPlan" in summary) || Boolean(summary.hasPlan);
}

/** Returns "TODAY" / "JUN 3" / "PAID" / "DUE" depending on the item's state. */
function timelineDateLabel(item: ReceivableSummaryItem): string {
  if (item.paidAt) {
    try {
      return `PAID ${format(parseISO(item.paidAt), "d MMM").toUpperCase()}`;
    } catch {
      return "PAID";
    }
  }
  if (item.dueAt) {
    try {
      const d = parseISO(item.dueAt);
      if (isToday(d)) return "TODAY";
      return format(d, "MMM d").toUpperCase();
    } catch {
      return "DUE";
    }
  }
  if (item.status === "due") return "TODAY";
  return "TBD";
}

function statusBadge(item: ReceivableSummaryItem) {
  if (item.paidAt || item.status === "paid") {
    return { label: "Paid", variant: "default" as const };
  }
  if (item.status === "overdue") {
    return { label: "Overdue", variant: "destructive" as const };
  }
  if (item.status === "due") {
    return { label: "Due today", variant: "default" as const };
  }
  if (item.status === "scheduled") {
    return { label: "Scheduled", variant: "outline" as const };
  }
  if (item.status === "waived") {
    return { label: "Waived", variant: "secondary" as const };
  }
  return { label: item.status, variant: "secondary" as const };
}

function stopDotClasses(item: ReceivableSummaryItem): string {
  if (item.paidAt || item.status === "paid") {
    return "border-primary bg-primary text-primary-foreground";
  }
  if (item.status === "overdue") {
    return "border-destructive bg-destructive text-destructive-foreground";
  }
  if (item.status === "due") {
    return "border-primary bg-primary text-primary-foreground";
  }
  return "border-border bg-background text-muted-foreground";
}

function TimelineStop({
  item,
  gstFranchiseFee,
  isFirst,
  isLast,
  onEditDueDate,
  onRecordPayment,
}: {
  item: ReceivableSummaryItem;
  gstFranchiseFee: boolean | null | undefined;
  isFirst: boolean;
  isLast: boolean;
  onEditDueDate?: (item: ReceivableSummaryItem) => void;
  onRecordPayment?: (item: ReceivableSummaryItem) => void;
}) {
  // Prefer the item's own GST flag; fall back to the parent agreement's.
  const itemInclusive = item.isGstInclusive ?? (gstFranchiseFee === true);
  const principal = item.principalAmount ?? item.amount;
  const gst =
    item.gstAmount ??
    (itemInclusive ? 0 : Math.round(item.amount * 0.18 * 100) / 100);
  const payable =
    item.payableAmount ?? (itemInclusive ? item.amount : item.amount + gst);
  const showSplit = !itemInclusive && gst > 0;
  const isPaid = Boolean(item.paidAt) || item.status === "paid";
  const badge = statusBadge(item);
  const dotClasses = stopDotClasses(item);

  return (
    <div className="flex w-[180px] shrink-0 snap-start flex-col items-stretch px-2 sm:w-[200px]">
      {/* Track + dot row */}
      <div className="relative flex h-6 items-center">
        <div
          className={cn(
            "absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border",
            isFirst && "left-1/2",
            isLast && "right-1/2",
          )}
        />
        <div
          className={cn(
            "relative z-10 mx-auto flex h-5 w-5 items-center justify-center rounded-full border-2",
            dotClasses,
          )}
        >
          {isPaid ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </div>
      </div>

      {/* Stop content */}
      <div className="mt-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {timelineDateLabel(item)}
          </p>
          {onEditDueDate &&
            !item.paidAt &&
            item.status !== "paid" &&
            item.status !== "waived" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Edit due date"
              className="h-4 w-4 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => onEditDueDate(item)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          ) : null}
          {onRecordPayment &&
            !item.paidAt &&
            item.status !== "paid" &&
            item.status !== "waived" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Record payment"
              className="h-4 w-4 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => onRecordPayment(item)}
            >
              <Banknote className="h-3 w-3" />
            </Button>
          ) : null}
        </div>
        <p className="mt-1 text-lg font-semibold tabular-nums text-card-foreground">
          {formatRupees(payable)}
        </p>
        {showSplit ? (
          <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
            {formatRupees(principal)} + GST {formatRupees(gst)}
          </p>
        ) : (
          <p className="mt-0.5 text-[11px] text-muted-foreground/70">
            {itemInclusive ? "GST inclusive" : ""}
          </p>
        )}
        <p className="mt-2 text-xs text-card-foreground">{item.label}</p>
        <div className="mt-2 flex justify-center">
          <Badge variant={badge.variant} className="font-normal">
            {badge.label}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export function EmiTimeline({
  summary,
  gstFranchiseFee = null,
  title = "Your payment plan",
  agreementRef = null,
  emptyMessage = "No EMI plan is linked to this agreement.",
  hideSummaryRow = false,
  className,
  onEditDueDate,
  onRecordPayment,
}: EmiTimelineProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, summary]);

  const scrollBy = (direction: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const delta = direction === "left" ? -el.clientWidth * 0.7 : el.clientWidth * 0.7;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  // Empty / no-plan state
  if (!hasReceivablePlan(summary)) {
    return (
      <Card className={cn("rounded-xl", className)}>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-2 text-base font-medium text-card-foreground">
            <CreditCard className="h-4 w-4" />
            {title}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  // For compact summaries (no items array), render a simplified version with
  // just the totals — the timeline strip is omitted because we don't have
  // per-item data.
  if (!isFullInstallmentSummary(summary)) {
    const compact = summary!;
    const paid = compact.payablePaidAmount ?? compact.paidAmount;
    const outstanding =
      compact.payableOutstandingAmount ?? compact.outstandingAmount;
    return (
      <Card className={cn("overflow-hidden rounded-xl shadow-sm", className)}>
        <CardHeader className="border-b border-border bg-accent/30 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-base font-medium text-card-foreground">
              <CreditCard className="h-4 w-4" />
              {title}
            </div>
            {agreementRef ? (
              <span className="text-xs text-muted-foreground">{agreementRef}</span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <SummaryCell label="Paid" value={formatRupees(paid)} />
          <SummaryCell label="Outstanding" value={formatRupees(outstanding)} />
          <SummaryCell
            label="EMIs paid"
            value={
              compact.paidItemCount != null && compact.installmentCount != null
                ? `${compact.paidItemCount} of ${compact.installmentCount}`
                : "-"
            }
          />
        </CardContent>
      </Card>
    );
  }

  // Full plan — timeline + summary row
  const full = summary;
  const items = full.items
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const principalTotal = full.totals.principal;
  const gstTotal = full.totals.gstAmount ?? 0;
  const payableTotal = full.totals.payableAmount ?? principalTotal;
  const isInclusive = gstTotal === 0;
  const downPaymentCount = items.filter((i) => i.kind === "down-payment").length;
  const installmentCount = full.totals.installmentCount;
  const paidItemCount = full.totals.paidItemCount;
  const planStandingLabel = full.standing
    ?.replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const showActivePill =
    full.standing === "current" || full.standing === "awaiting-initial-payment";

  return (
    <Card className={cn("overflow-hidden rounded-xl shadow-sm", className)}>
      <CardHeader className="border-b border-border bg-accent/30 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-base font-medium text-card-foreground">
              <CreditCard className="h-4 w-4" />
              {title}
            </div>
            <p className="text-xs text-muted-foreground">
              Franchise fee · {formatRupees(payableTotal)} total ·{" "}
              {downPaymentCount > 0
                ? `${downPaymentCount} down payment + ${installmentCount} monthly EMI${
                    installmentCount === 1 ? "" : "s"
                  }`
                : `${installmentCount} monthly EMI${
                    installmentCount === 1 ? "" : "s"
                  }`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {showActivePill ? (
              <Badge variant="default" className="font-normal">
                {full.standing === "awaiting-initial-payment"
                  ? "Active plan"
                  : "Active plan"}
              </Badge>
            ) : (
              <Badge variant="secondary" className="font-normal">
                {planStandingLabel ?? "Plan"}
              </Badge>
            )}
            {agreementRef ? (
              <span className="text-xs text-muted-foreground">{agreementRef}</span>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Timeline */}
        <div className="relative">
          {/* Left arrow */}
          {canScrollLeft ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Scroll timeline left"
              onClick={() => scrollBy("left")}
              className="absolute left-2 top-1/2 z-20 h-8 w-8 -translate-y-1/2 rounded-full bg-background shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : null}
          {/* Right arrow */}
          {canScrollRight ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Scroll timeline right"
              onClick={() => scrollBy("right")}
              className="absolute right-2 top-1/2 z-20 h-8 w-8 -translate-y-1/2 rounded-full bg-background shadow-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : null}

          <div
            ref={scrollerRef}
            className="snap-x snap-mandatory overflow-x-auto [scrollbar-width:thin]"
          >
            {/*
              Inner flex carries `min-w-full justify-center` so the stops
              cluster in the middle when there's room (avoiding the awkward
              left-aligned look in wide modals), and naturally overflow into
              the outer scroller when the timeline is longer than the card.
              `snap-x` lives on the outer (scrolling) container so per-stop
              `snap-start` resolves correctly during scroll.
            */}
            <div className="flex min-w-full justify-center gap-0 px-4 py-5">
              {items.map((item, idx) => (
                <TimelineStop
                  key={item.receivableItemId}
                  item={item}
                  gstFranchiseFee={gstFranchiseFee}
                  isFirst={idx === 0}
                  isLast={idx === items.length - 1}
                  onEditDueDate={onEditDueDate}
                  onRecordPayment={onRecordPayment}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom summary row */}
        {!hideSummaryRow ? (
          <div className="grid grid-cols-2 gap-3 border-t border-border bg-muted/30 p-4 sm:grid-cols-3">
            <SummaryCell
              label="Principal"
              value={formatRupees(principalTotal)}
            />
            <SummaryCell
              label={isInclusive ? "GST" : `GST (${GST_RATE_LABEL})`}
              value={formatRupees(gstTotal)}
            />
            <SummaryCell
              label="EMIs paid"
              value={`${paidItemCount} of ${installmentCount}`}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold tabular-nums text-card-foreground">
        {value}
      </p>
    </div>
  );
}

// Re-export the icon for compatibility with consumers replacing
// InstallmentSummaryCard.
export { CalendarDays };
