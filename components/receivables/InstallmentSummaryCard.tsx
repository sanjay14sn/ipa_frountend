"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ArrowRight, CalendarDays, CreditCard, IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ReceivableCompactSummary,
  ReceivableFranchiseeSummary,
  ReceivableInstallmentSummary,
  ReceivableSummaryItem,
} from "@/services/agreement.service";
import { GST_RATE_LABEL } from "@/lib/gst";
import { formatDate } from "@/lib/date-utils";
import { formatRupees } from "@/lib/currency-utils";

function prettify(value: string | null | undefined): string {
  if (!value) return "-";
  return value
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusVariant(status: string | null | undefined) {
  switch ((status ?? "").toLowerCase()) {
    case "paid":
    case "completed":
    case "current":
      return "default" as const;
    case "overdue":
    case "on-hold":
      return "destructive" as const;
    case "due":
    case "grace":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
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

function ReceivableStatusBadge({
  summary,
}: {
  summary:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null
    | undefined;
}) {
  if (!summary) return <span className="text-muted-foreground">-</span>;
  if ("hasPlan" in summary && !summary.hasPlan) {
    return <span className="text-muted-foreground">-</span>;
  }
  return (
    <Badge variant={statusVariant(summary.standing)}>
      EMI {prettify(summary.standing)}
    </Badge>
  );
}

export function ReceivableCompactLine({
  summary,
}: {
  summary:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null
    | undefined;
}) {
  if (!summary) return <span className="text-muted-foreground">No EMI plan</span>;
  if ("hasPlan" in summary && !summary.hasPlan) {
    return <span className="text-muted-foreground">No EMI plan</span>;
  }

  // Prefer payable (principal + GST) — that's what the franchisee actually
  // pays / owes via Razorpay. Falls back to legacy principal-only on older
  // backend responses that don't carry the split yet.
  const paid = isFullInstallmentSummary(summary)
    ? summary.totals.payablePaidAmount ?? summary.totals.paidAmount
    : summary.payablePaidAmount ?? summary.paidAmount;
  const outstanding = isFullInstallmentSummary(summary)
    ? summary.totals.payableOutstandingAmount ?? summary.totals.outstandingAmount
    : summary.payableOutstandingAmount ?? summary.outstandingAmount;
  const nextDueAt = isFullInstallmentSummary(summary)
    ? summary.nextDueItem?.dueAt
    : summary.nextDueAt;
  const paidCount = isFullInstallmentSummary(summary)
    ? summary.totals.paidItemCount
    : summary.paidItemCount;
  const totalCount = isFullInstallmentSummary(summary)
    ? summary.totals.installmentCount
    : summary.installmentCount;

  // Stacked + width-capped so table auto-layout can't inflate the column
  // into a horizontal scroll (the old single line measured ~500px).
  return (
    <div className="flex max-w-[230px] flex-col leading-snug">
      <span className="whitespace-normal text-sm text-muted-foreground">
        Paid {formatRupees(paid)}{" · "}Due {formatRupees(outstanding)}
      </span>
      <span className="whitespace-normal text-xs text-muted-foreground">
        {paidCount != null && totalCount != null
          ? `${paidCount}/${totalCount} EMIs`
          : ""}
        {nextDueAt
          ? `${paidCount != null && totalCount != null ? " · " : ""}Next ${formatDate(nextDueAt)}`
          : ""}
      </span>
    </div>
  );
}

export function ReceivableCompactProgress({
  summary,
}: {
  summary:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null
    | undefined;
}) {
  if (!summary) return <span className="text-muted-foreground">No EMI plan</span>;
  if ("hasPlan" in summary && !summary.hasPlan) {
    return <span className="text-muted-foreground">No EMI plan</span>;
  }

  // Use payable (principal + GST) for amounts shown to the franchisee — that
  // matches the Razorpay charge. Fall back to principal-only for older
  // backend responses.
  const paid = isFullInstallmentSummary(summary)
    ? summary.totals.payablePaidAmount ?? summary.totals.paidAmount
    : summary.payablePaidAmount ?? summary.paidAmount;
  const outstanding = isFullInstallmentSummary(summary)
    ? summary.totals.payableOutstandingAmount ?? summary.totals.outstandingAmount
    : summary.payableOutstandingAmount ?? summary.outstandingAmount;
  const total = isFullInstallmentSummary(summary)
    ? summary.totals.payableAmount ?? summary.totals.principal ?? summary.principal
    : paid + outstanding;
  const nextDueAt = isFullInstallmentSummary(summary)
    ? summary.nextDueItem?.dueAt
    : summary.nextDueAt;
  const paidCount = isFullInstallmentSummary(summary)
    ? summary.totals.paidItemCount
    : summary.paidItemCount;
  const totalCount = isFullInstallmentSummary(summary)
    ? summary.totals.installmentCount
    : summary.installmentCount;
  const progressValue =
    total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 0;

  return (
    <div className="flex min-w-[180px] max-w-[230px] flex-col gap-1.5">
      <div className="relative">
        <Progress value={progressValue} className="h-3 bg-success-soft" />
      </div>
      <div className="flex flex-col leading-snug">
        <span className="whitespace-normal text-sm text-muted-foreground">
          Paid {formatRupees(paid)}{" · "}Due {formatRupees(outstanding)}
        </span>
        <span className="whitespace-normal text-xs text-muted-foreground">
          {paidCount != null && totalCount != null
            ? `${paidCount}/${totalCount} EMIs`
            : ""}
          {nextDueAt
            ? `${paidCount != null && totalCount != null ? " · " : ""}Next ${formatDate(nextDueAt)}`
            : ""}
        </span>
      </div>
    </div>
  );
}

function ItemRows({
  items,
  gstFranchiseFee,
}: {
  items: ReceivableSummaryItem[];
  gstFranchiseFee?: boolean | null;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Due date</TableHead>
          <TableHead>Paid date</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          // Prefer per-item GST split from backend; fall back to the parent
          // `gstFranchiseFee` flag for legacy responses without the split.
          const itemInclusive =
            item.isGstInclusive ?? (gstFranchiseFee !== false);
          const principal = item.principalAmount ?? item.amount;
          const gst =
            item.gstAmount ??
            (itemInclusive ? 0 : Math.round(item.amount * 0.18 * 100) / 100);
          const payable =
            item.payableAmount ??
            (itemInclusive ? item.amount : item.amount + gst);
          const showSplit = !itemInclusive && gst > 0;
          return (
            <TableRow key={item.receivableItemId}>
              <TableCell>
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">
                  {prettify(item.kind)}
                  {item.isInitialPayable ? " · initial payment" : ""}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(item.status)}>
                  {prettify(item.status)}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(item.dueAt)}</TableCell>
              <TableCell>{formatDate(item.paidAt)}</TableCell>
              <TableCell className="text-right font-medium">
                <div className="flex flex-col items-end gap-0.5">
                  <span>{formatRupees(payable)}</span>
                  {showSplit ? (
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {formatRupees(principal)} + {GST_RATE_LABEL} {formatRupees(gst)}
                    </span>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function InstallmentSummaryCard({
  summary,
  gstFranchiseFee = null,
  title = "Franchise fee EMI schedule",
  emptyMessage = "No EMI plan is linked to this agreement.",
  onViewFullSchedule,
  viewFullScheduleLabel = "View full schedule",
}: {
  summary:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null
    | undefined;
  /**
   * From the parent agreement. When `false` the franchise fee is NOT
   * GST-inclusive — each receivable item (down payment + monthly installments)
   * gets a "+18% GST at payment" badge so the franchisee knows the actual
   * Razorpay total will be 18% higher than the row amount.
   */
  gstFranchiseFee?: boolean | null;
  title?: string;
  emptyMessage?: string;
  onViewFullSchedule?: () => void;
  viewFullScheduleLabel?: string;
}) {
  // `gstFranchiseFee === false` historically toggled a "+18% GST at payment"
  // badge on item rows. With the new per-item GST split, the breakdown is
  // shown inline (principal + GST = payable), so the badge is no longer
  // needed. We still use the flag as a fallback for legacy responses.
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  if (!isFullInstallmentSummary(summary)) {
    if (summary && (!("hasPlan" in summary) || summary.hasPlan)) {
      const nextDueAmount = summary.nextDueAmount;
      const nextDueAt = summary.nextDueAt;
      const initialPayable =
        "initialPayableItem" in summary
          ? summary.initialPayableItem
          : null;
      const nextDueItem =
        "nextDueItem" in summary ? summary.nextDueItem : null;
      // Prefer payable totals — that's what the franchisee was charged / owes.
      const compactPaid =
        summary.payablePaidAmount ?? summary.paidAmount;
      const compactOutstanding =
        summary.payableOutstandingAmount ?? summary.outstandingAmount;
      const compactGst = summary.gstAmount ?? 0;
      return (
        <Card className="overflow-hidden rounded-xl border-border shadow-sm">
          <CardHeader className="border-b bg-accent/30 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-medium leading-normal tracking-normal text-card-foreground">
                  <CreditCard className="h-4 w-4" />
                  {title}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  EMI summary with next payable details. Full schedule is available on demand.
                </p>
              </div>
              <Badge variant={statusVariant(summary.standing)}>
                {prettify(summary.standing)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Fact icon={IndianRupee} label="Paid" value={formatRupees(compactPaid)} />
              <Fact
                icon={IndianRupee}
                label="Outstanding"
                value={formatRupees(compactOutstanding)}
              />
              {compactGst > 0 ? (
                <Fact
                  icon={IndianRupee}
                  label={`GST included (${GST_RATE_LABEL})`}
                  value={formatRupees(compactGst)}
                />
              ) : null}
              <Fact
                icon={CalendarDays}
                label="Next due"
                value={
                  nextDueAt
                    ? `${formatRupees(nextDueAmount)} on ${formatDate(nextDueAt)}`
                    : "-"
                }
              />
            </div>
            <div className="rounded-lg border bg-card p-3 text-sm">
              <div className="grid gap-3 md:grid-cols-3">
                <Info
                  label="Initial payable"
                  value={initialPayable?.label ?? summary.initialPayableLabel ?? "-"}
                />
                <Info
                  label="Next item"
                  value={nextDueItem?.label ?? (nextDueAt ? "Upcoming EMI" : "-")}
                />
                <Info
                  label="EMIs paid"
                  value={
                    summary.paidItemCount != null &&
                    summary.installmentCount != null
                      ? `${summary.paidItemCount} of ${summary.installmentCount}`
                      : "paymentHistoryCount" in summary
                        ? `${summary.paymentHistoryCount} paid item${summary.paymentHistoryCount === 1 ? "" : "s"}`
                        : "-"
                  }
                />
              </div>
            </div>
            {summary.holdReason ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {summary.holdReason}
              </p>
            ) : null}
            {onViewFullSchedule ? (
              <Button type="button" variant="outline" onClick={onViewFullSchedule}>
                {viewFullScheduleLabel}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="rounded-xl">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium leading-normal tracking-normal text-card-foreground">
            <CreditCard className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  const fullScheduleButtonLabel = showFullSchedule
    ? "Hide full schedule"
    : viewFullScheduleLabel;

  return (
    <Card className="overflow-hidden rounded-xl border-border shadow-sm">
      <CardHeader className="border-b bg-accent/30 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-medium leading-normal tracking-normal text-card-foreground">
              <CreditCard className="h-4 w-4" />
              {title}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Split-up for the franchise fee linked to Agreement #{summary.agreementId}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariant(summary.standing)}>
              {prettify(summary.standing)}
            </Badge>
            {summary.holdReason ? (
              <Badge variant="destructive">{summary.holdReason}</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <Fact
            icon={IndianRupee}
            label="Franchise fee"
            value={formatRupees(summary.totals.payableAmount ?? summary.principal)}
          />
          <Fact
            icon={IndianRupee}
            label="Paid"
            value={formatRupees(
              summary.totals.payablePaidAmount ?? summary.totals.paidAmount,
            )}
          />
          <Fact
            icon={IndianRupee}
            label="Outstanding"
            value={formatRupees(
              summary.totals.payableOutstandingAmount ??
                summary.totals.outstandingAmount,
            )}
          />
          {(summary.totals.gstAmount ?? 0) > 0 ? (
            <Fact
              icon={IndianRupee}
              label={`GST included (${GST_RATE_LABEL})`}
              value={formatRupees(summary.totals.gstAmount)}
            />
          ) : null}
          <Fact
            icon={CalendarDays}
            label="Next due"
            value={
              summary.nextDueItem
                ? `${formatRupees(summary.nextDueItem.payableAmount ?? summary.nextDueItem.amount)} on ${formatDate(summary.nextDueItem.dueAt)}`
                : "-"
            }
          />
        </div>

        <div className="rounded-lg border bg-card p-3 text-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <Info label="Initial payable" value={summary.initialPayableItem?.label ?? "-"} />
            <Info
              label="Down payment"
              value={
                summary.downPayment
                  ? formatRupees(
                      summary.downPayment.payableAmount ??
                        summary.downPayment.amount,
                    )
                  : "Not set"
              }
              trailing={
                summary.downPayment &&
                summary.downPayment.gstAmount != null &&
                summary.downPayment.gstAmount > 0 ? (
                  <span className="text-[11px] text-muted-foreground">
                    incl. {GST_RATE_LABEL} {formatRupees(summary.downPayment.gstAmount)}
                  </span>
                ) : null
              }
            />
            <Info
              label="EMIs paid"
              value={`${summary.totals.paidItemCount} of ${summary.totals.installmentCount}`}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowFullSchedule((current) => !current)}
          >
            {fullScheduleButtonLabel}
            <ArrowRight
              className={`ml-2 h-4 w-4 transition-transform ${
                showFullSchedule ? "rotate-90" : ""
              }`}
            />
          </Button>
        </div>

        {showFullSchedule ? (
          <div className="overflow-x-auto rounded-lg border">
            <ItemRows items={summary.items} gstFranchiseFee={gstFranchiseFee} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof IndianRupee;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-1 flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-medium uppercase tracking-[0.08em]">
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold text-card-foreground">{value}</p>
    </div>
  );
}

function Info({
  label,
  value,
  trailing,
}: {
  label: string;
  value: string;
  trailing?: ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="font-medium text-card-foreground">{value}</p>
        {trailing}
      </div>
    </div>
  );
}
