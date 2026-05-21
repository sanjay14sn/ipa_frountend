"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { format, parseISO } from "date-fns";
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

function money(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return format(parseISO(value), "PP");
  } catch {
    return String(value);
  }
}

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

export function isFullInstallmentSummary(
  summary:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null
    | undefined,
): summary is ReceivableInstallmentSummary {
  return Boolean(summary && "items" in summary && Array.isArray(summary.items));
}

export function ReceivableStatusBadge({
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

  const paid = isFullInstallmentSummary(summary)
    ? summary.totals.paidAmount
    : summary.paidAmount;
  const outstanding = isFullInstallmentSummary(summary)
    ? summary.totals.outstandingAmount
    : summary.outstandingAmount;
  const nextDueAt = isFullInstallmentSummary(summary)
    ? summary.nextDueItem?.dueAt
    : summary.nextDueAt;

  return (
    <span className="text-sm text-muted-foreground">
      Paid {money(paid)}{" · "}Outstanding {money(outstanding)}
      {nextDueAt ? ` · Next ${fmtDate(nextDueAt)}` : ""}
    </span>
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

  const paid = isFullInstallmentSummary(summary)
    ? summary.totals.paidAmount
    : summary.paidAmount;
  const outstanding = isFullInstallmentSummary(summary)
    ? summary.totals.outstandingAmount
    : summary.outstandingAmount;
  const total = isFullInstallmentSummary(summary)
    ? summary.totals.principal || summary.principal
    : paid + outstanding;
  const nextDueAt = isFullInstallmentSummary(summary)
    ? summary.nextDueItem?.dueAt
    : summary.nextDueAt;
  const progressValue =
    total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 0;

  return (
    <div className="flex min-w-[220px] flex-col gap-1.5">
      <div className="relative">
        <Progress value={progressValue} className="h-3 bg-[#dceee6]" />
      </div>
      <span className="text-sm text-muted-foreground">
        Paid {money(paid)}{" · "}Outstanding {money(outstanding)}
        {nextDueAt ? ` · Next ${fmtDate(nextDueAt)}` : ""}
      </span>
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
  const showGstBadge = gstFranchiseFee === false;
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
        {items.map((item) => (
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
            <TableCell>{fmtDate(item.dueAt)}</TableCell>
            <TableCell>{fmtDate(item.paidAt)}</TableCell>
            <TableCell className="text-right font-medium">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span>{money(item.amount)}</span>
                {showGstBadge ? (
                  <Badge variant="outline" className="font-normal">
                    +{GST_RATE_LABEL} at payment
                  </Badge>
                ) : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function InstallmentSummaryCard({
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
  const showGstBadge = gstFranchiseFee === false;
  const gstNote = showGstBadge ? (
    <Badge variant="outline" className="font-normal">
      +{GST_RATE_LABEL}
    </Badge>
  ) : null;
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
            <div className="grid gap-3 md:grid-cols-3">
              <Fact icon={IndianRupee} label="Paid" value={money(summary.paidAmount)} />
              <Fact
                icon={IndianRupee}
                label="Outstanding"
                value={money(summary.outstandingAmount)}
              />
              <Fact
                icon={CalendarDays}
                label="Next due"
                value={
                  nextDueAt
                    ? `${money(nextDueAmount)} on ${fmtDate(nextDueAt)}`
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
                  label="Payment history"
                  value={
                    "paymentHistoryCount" in summary
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
        <div className="grid gap-3 md:grid-cols-4">
          <Fact
            icon={IndianRupee}
            label="Franchise fee"
            value={money(summary.principal)}
          />
          <Fact
            icon={IndianRupee}
            label="Paid"
            value={money(summary.totals.paidAmount)}
          />
          <Fact
            icon={IndianRupee}
            label="Outstanding"
            value={money(summary.totals.outstandingAmount)}
          />
          <Fact
            icon={CalendarDays}
            label="Next due"
            value={
              summary.nextDueItem
                ? `${money(summary.nextDueItem.amount)} on ${fmtDate(summary.nextDueItem.dueAt)}`
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
                summary.downPayment ? money(summary.downPayment.amount) : "Not set"
              }
              trailing={summary.downPayment ? gstNote : null}
            />
            <Info label="Monthly installments" value={String(summary.totals.installmentCount)} />
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
