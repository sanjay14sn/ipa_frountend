"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatRupees } from "@/lib/currency-utils";
import { EmiTimeline } from "@/components/receivables/EmiTimeline";
import {
  type ReceivableCompactSummary,
  type ReceivableFranchiseeSummary,
  type ReceivableInstallmentSummary,
  type ReceivableSummaryItem,
} from "@/services/agreement.service";
import { CreditCard, Loader2 } from "lucide-react";
import {
  fmtShortDate,
  hasReceivablePlan,
  isFullInstallmentSummary,
  prettifyToken,
} from "@/components/agreements/record-detail/agreement-utils";

// ── statusVariant ────────────────────────────────────────────────────────────

export function statusVariant(status: string | null | undefined) {
  switch ((status ?? "").toLowerCase()) {
    case "paid":
    case "completed":
    case "current":
      return "default" as const;
    case "overdue":
    case "on-hold":
    case "failed":
      return "destructive" as const;
    case "due":
    case "grace":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

// ── EmiMetric ────────────────────────────────────────────────────────────────

export function EmiMetric({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 break-words text-sm font-medium leading-snug text-card-foreground",
          strong && "text-primary",
        )}
      >
        {value}
      </p>
      {hint && hint !== "-" ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

// ── EmiScheduleRow ───────────────────────────────────────────────────────────

export function EmiScheduleRow({ item }: { item: ReceivableSummaryItem }) {
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{item.label}</div>
        <div className="text-xs text-muted-foreground">
          {prettifyToken(item.kind)}
          {item.isInitialPayable ? " · initial payment" : ""}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant(item.status)}>{prettifyToken(item.status)}</Badge>
      </TableCell>
      <TableCell>{fmtShortDate(item.dueAt)}</TableCell>
      <TableCell>{fmtShortDate(item.paidAt)}</TableCell>
      <TableCell className="text-right font-medium">{formatRupees(item.amount)}</TableCell>
    </TableRow>
  );
}

// ── AgreementEmiScheduleCard ─────────────────────────────────────────────────

export function AgreementEmiScheduleCard({
  summary,
  onViewFullSchedule,
  viewFullScheduleLabel = "View full schedule",
  onPayReceivableItem,
  isInitiatingReceivablePayment = false,
}: {
  summary:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null
    | undefined;
  onViewFullSchedule?: () => void;
  viewFullScheduleLabel?: string;
  onPayReceivableItem?: () => void;
  isInitiatingReceivablePayment?: boolean;
}) {
  const hasPlan = hasReceivablePlan(summary);

  if (!summary || !hasPlan) {
    return (
      <EmiTimeline summary={summary} title="Franchise fee EMI plan" />
    );
  }

  const fullSummary = isFullInstallmentSummary(summary) ? summary : null;
  const nextDueItem = fullSummary
    ? fullSummary.nextDueItem
    : "nextDueItem" in summary
      ? summary.nextDueItem
      : null;
  const initialPayableItem = fullSummary
    ? fullSummary.initialPayableItem
    : "initialPayableItem" in summary
      ? summary.initialPayableItem
      : null;
  const agreementId = fullSummary
    ? fullSummary.agreementId
    : "agreementId" in summary
      ? summary.agreementId
      : null;
  const payableItem =
    nextDueItem && !nextDueItem.paidAt
      ? nextDueItem
      : initialPayableItem && !initialPayableItem.paidAt
        ? initialPayableItem
        : null;
  const canPayNow = Boolean(payableItem && onPayReceivableItem);
  const payableAmountToShow =
    payableItem?.payableAmount ?? payableItem?.amount ?? null;

  return (
    <div className="space-y-3">
      <EmiTimeline
        summary={summary}
        title="Franchise fee EMI plan"
        agreementRef={agreementId ? `Agreement #${agreementId}` : null}
      />

      {summary.holdReason ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {summary.holdReason}
        </p>
      ) : null}

      {/* Pay-now CTA — only when the franchisee can pay and we have a payable item */}
      {canPayNow && payableItem ? (
        <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
              Next payable
            </p>
            <p className="mt-0.5 text-sm font-medium text-card-foreground">
              {payableItem.label}
              {payableItem.dueAt ? (
                <span className="ml-1 text-xs text-muted-foreground">
                  · due {fmtShortDate(payableItem.dueAt)}
                </span>
              ) : null}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => onPayReceivableItem?.()}
            disabled={isInitiatingReceivablePayment}
          >
            {isInitiatingReceivablePayment ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening payment…
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay {formatRupees(payableAmountToShow)} now
              </>
            )}
          </Button>
        </div>
      ) : null}

      {/* Loading indicator while the full plan is being fetched */}
      {!fullSummary && onViewFullSchedule ? (
        <button
          type="button"
          onClick={onViewFullSchedule}
          disabled={viewFullScheduleLabel.toLowerCase().includes("loading")}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {viewFullScheduleLabel.toLowerCase().includes("loading")
            ? "Loading full schedule…"
            : "Load full schedule"}
        </button>
      ) : null}
    </div>
  );
}
