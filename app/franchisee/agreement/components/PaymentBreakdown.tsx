import { Layers, Wallet } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GST_RATE_LABEL, getFranchiseFeePayable } from "@/lib/gst";
import type {
  ReceivableCompactSummary,
  ReceivableFranchiseeSummary,
  ReceivableInstallmentSummary,
} from "@/services/agreement.service";

interface PaymentBreakdownProps {
  paymentDetails: any;
  /**
   * When the receivable plan is active (installment agreements), this drives
   * the "Pay now" headline so the franchisee sees the down payment they owe
   * today — not the full franchise fee. Falls back to the full fee + GST
   * when no plan / no initial payable.
   */
  installmentSummary?:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null;
  /**
   * Hide the per-level recurring fees table (Term fees / CI share / Franchise
   * share / Royalty). The agreement modal's Overview tab uses this to skip
   * the breakdown — the same data lives in the dedicated Schedule B tab
   * (IPA share = royalty there), so showing it twice is redundant. Defaults
   * to false so the franchisee onboarding page keeps the table.
   */
  hideRecurringFeesTable?: boolean;
}

const DEFAULT_L1_MONTHS = 4;
const DEFAULT_L2_MONTHS = 3;

function getProgramFromPayroll(payroll: any) {
  return payroll?.program ?? null;
}

/** Level 1 and first Level 2+ row durations from program streams. */
function getRoyaltyDurationsMonths(program: any): { l1: number; l2: number } {
  const streams = program?.streams;
  if (!Array.isArray(streams) || streams.length === 0) {
    return { l1: DEFAULT_L1_MONTHS, l2: DEFAULT_L2_MONTHS };
  }
  const sortedStreams = [...streams].sort(
    (a, b) => (a.id ?? 0) - (b.id ?? 0),
  );
  let l1: number | null = null;
  let l2: number | null = null;
  for (const s of sortedStreams) {
    const levels = [...(s.levels || [])].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
    );
    if (l1 == null) {
      const row = levels.find((lv) => lv.displayOrder === 1);
      if (row != null && row.durationInMonths != null) {
        l1 = Number(row.durationInMonths);
      }
    }
    if (l2 == null) {
      const row =
        levels.find((lv) => lv.displayOrder === 2) ??
        levels.find((lv) => (lv.displayOrder ?? 0) > 1);
      if (row != null && row.durationInMonths != null) {
        l2 = Number(row.durationInMonths);
      }
    }
    if (l1 != null && l2 != null) break;
  }
  return {
    l1: l1 ?? DEFAULT_L1_MONTHS,
    l2: l2 ?? DEFAULT_L2_MONTHS,
  };
}

function monthsLabel(n: number) {
  return `${n} ${n === 1 ? "month" : "months"}`;
}

function fmtMoney(x: number) {
  return x.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function FeeCell({
  label,
  value,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm font-semibold tabular-nums text-card-foreground">
        {value}
      </div>
    </div>
  );
}

/**
 * Renders a fee headline that respects the agreement's GST flag — payable
 * as the primary number, with a small "₹net + 18% GST ₹gst" sub-line when
 * the fee is GST-exclusive. Used in the program summary so Material Cost
 * and Franchise Fee both surface their GST treatment at a glance.
 */
function renderGstAwareFeeValue({
  principal,
  inclusive,
  fmt,
}: {
  principal: number;
  inclusive: boolean;
  fmt: (n: number | string | undefined | null) => string;
}): React.ReactNode {
  if (principal <= 0) return `₹${fmt(0)}`;
  if (inclusive) return `₹${fmt(principal)}`;
  const gst = Math.round(principal * 0.18 * 100) / 100;
  const payable = Math.round((principal + gst) * 100) / 100;
  return (
    <span className="block">
      <span className="block">₹{fmt(payable)}</span>
      <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
        ₹{fmt(principal)} + 18% GST ₹{fmt(gst)}
      </span>
    </span>
  );
}

/** Term fees × level duration table — flat, no card wrapper. */
function LevelRecurringFeesBreakdown({ payroll }: { payroll: any }) {
  const termFees = Number(payroll?.monthlyFee ?? 0);
  const ci = Number(payroll?.ciShare ?? 0);
  const franchise = Number(payroll?.franchiseShare ?? 0);
  const royalty = Number(payroll?.royalty ?? 0);
  // Only royalty carries a GST flag on the agreement; the other recurring
  // fees don't get a 1.18 surcharge in the pricing model (see
  // order-pricing.service: only royalty / materialCost are multiplied).
  const royaltyGstExclusive = payroll?.gstRoyalty === false;

  const program = getProgramFromPayroll(payroll);
  const { l1, l2 } = getRoyaltyDurationsMonths(program);

  const rows: { label: string; amount: number; hasGst?: boolean }[] = [
    { label: "Term fees", amount: termFees },
    { label: "CI share", amount: ci },
    { label: "Franchise share", amount: franchise },
    { label: "Royalty", amount: royalty, hasGst: royaltyGstExclusive },
  ];

  const round2 = (n: number) => Math.round(n * 100) / 100;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Per-level recurring fees
      </p>
      <p className="text-xs text-muted-foreground">
        Term fees (monthly fee), CI share, franchise share and royalty use the
        monthly rate × the months shown in each column. Level 2 onwards: same
        per-month amounts for each Level 2+ enrollment.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40%] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Fee
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Level 1
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Level 2 onwards
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-muted-foreground">Duration</TableCell>
              <TableCell className="text-right font-medium text-card-foreground">
                {monthsLabel(l1)}
              </TableCell>
              <TableCell className="text-right font-medium text-card-foreground align-top">
                <span className="block">{monthsLabel(l2)}</span>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  (per level)
                </span>
              </TableCell>
            </TableRow>
            {rows.map((r) => {
              const l1Net = r.amount * l1;
              const l2Net = r.amount * l2;
              const l1Gst = r.hasGst ? round2(l1Net * 0.18) : 0;
              const l2Gst = r.hasGst ? round2(l2Net * 0.18) : 0;
              const l1Payable = round2(l1Net + l1Gst);
              const l2Payable = round2(l2Net + l2Gst);
              return (
                <TableRow key={r.label}>
                  <TableCell className="text-muted-foreground align-top">
                    {r.label}
                  </TableCell>
                  <TableCell className="text-right align-top tabular-nums">
                    <span className="block font-semibold text-card-foreground">
                      ₹{fmtMoney(r.hasGst ? l1Payable : l1Net)}
                    </span>
                    {r.hasGst ? (
                      <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                        ₹{fmtMoney(l1Net)} + 18% GST ₹{fmtMoney(l1Gst)}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right align-top tabular-nums">
                    <span className="block font-semibold text-card-foreground">
                      ₹{fmtMoney(r.hasGst ? l2Payable : l2Net)}
                    </span>
                    {r.hasGst ? (
                      <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                        ₹{fmtMoney(l2Net)} + 18% GST ₹{fmtMoney(l2Gst)}
                      </span>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** A single program's fee section. Used inline within the main card. */
function ProgramSection({
  program,
  fmt,
  isLast,
  hideRecurringFeesTable = false,
}: {
  program: any;
  fmt: (n: number | string | undefined | null) => string;
  isLast: boolean;
  hideRecurringFeesTable?: boolean;
}) {
  return (
    <div className={cn("p-4", !isLast && "border-b border-border")}>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-card-foreground">
        <Layers className="h-4 w-4 text-muted-foreground" />
        {program.program?.name || "Program"}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <FeeCell
          label="Franchise Fee"
          value={renderGstAwareFeeValue({
            principal: Number(program.franchiseFee ?? 0),
            inclusive: program.gstFranchiseFee !== false,
            fmt,
          })}
        />
        {/* Kit cost is GST-exempt per business rule; render principal as-is. */}
        <FeeCell label="Kit Cost" value={`₹${fmt(program.kitCost)}`} />
        <FeeCell
          label="Material Cost"
          value={renderGstAwareFeeValue({
            principal: Number(program.materialCost ?? 0),
            inclusive: program.gstMaterialCost !== false,
            fmt,
          })}
        />
        <FeeCell
          label="Installment"
          value={
            typeof program.installment === "boolean"
              ? program.installment
                ? "Yes"
                : "No"
              : `₹${fmt(program.installment)}`
          }
        />
      </div>
      {hideRecurringFeesTable ? null : (
        <div className="mt-4 border-t border-border pt-4">
          <LevelRecurringFeesBreakdown payroll={program} />
        </div>
      )}
    </div>
  );
}

export default function PaymentBreakdown({
  paymentDetails,
  installmentSummary,
  hideRecurringFeesTable = false,
}: PaymentBreakdownProps) {
  if (!paymentDetails) return null;

  const fmt = (n: number | string | undefined | null) =>
    typeof n === "number"
      ? n.toLocaleString()
      : Number(n || 0).toLocaleString();

  const isPerProgram = Array.isArray(paymentDetails);

  const installmentAmount = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

  const summary = isPerProgram
    ? paymentDetails.reduce(
        (acc: any, p: any) => ({
          franchiseFee: (acc.franchiseFee || 0) + (p.franchiseFee || 0),
          monthlyFee: (acc.monthlyFee || 0) + (p.monthlyFee || 0),
          kitCost: (acc.kitCost || 0) + (p.kitCost || 0),
          materialCost: (acc.materialCost || 0) + (p.materialCost || 0),
          installment:
            (acc.installment || 0) + installmentAmount(p.installment),
          gstFranchiseFee:
            acc.gstFranchiseFee === undefined
              ? p.gstFranchiseFee ?? null
              : acc.gstFranchiseFee === (p.gstFranchiseFee ?? null)
                ? acc.gstFranchiseFee
                : null,
        }),
        {
          franchiseFee: 0,
          monthlyFee: 0,
          kitCost: 0,
          materialCost: 0,
          installment: 0,
          gstFranchiseFee: undefined,
        },
      )
    : paymentDetails;

  const feePayable = getFranchiseFeePayable(
    summary.franchiseFee,
    summary.gstFranchiseFee,
  );

  // Installment-aware "pay now"
  const isFullSummary =
    installmentSummary != null && "items" in (installmentSummary as object);
  const hasPlan =
    installmentSummary != null &&
    (!("hasPlan" in installmentSummary) || installmentSummary.hasPlan);
  const initialPayableItem = isFullSummary
    ? (installmentSummary as ReceivableInstallmentSummary).initialPayableItem
    : null;
  const planPrincipal = isFullSummary
    ? (installmentSummary as ReceivableInstallmentSummary).principal
    : null;
  const planPayableTotal = isFullSummary
    ? (installmentSummary as ReceivableInstallmentSummary).totals.payableAmount
    : null;
  const installmentCount = isFullSummary
    ? (installmentSummary as ReceivableInstallmentSummary).totals
        .installmentCount
    : null;
  const showInitialPayable =
    hasPlan && initialPayableItem != null && initialPayableItem.paidAt == null;
  const initialPayableAmount = showInitialPayable
    ? (initialPayableItem!.payableAmount ?? initialPayableItem!.amount)
    : null;
  const initialPayablePrincipal = showInitialPayable
    ? (initialPayableItem!.principalAmount ?? initialPayableItem!.amount)
    : null;
  const initialPayableGst = showInitialPayable
    ? (initialPayableItem!.gstAmount ?? 0)
    : 0;
  const initialPayableIsInclusive = showInitialPayable
    ? (initialPayableItem!.isGstInclusive ?? true)
    : true;

  const programs: any[] = isPerProgram
    ? paymentDetails
    : paymentDetails
      ? [paymentDetails]
      : [];

  const restEmiCount = showInitialPayable
    ? Math.max(
        0,
        (installmentCount ?? 0) -
          (initialPayableItem!.kind === "installment" ? 1 : 0),
      )
    : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="border-b border-border bg-accent/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-base font-medium text-card-foreground">
            <Wallet className="h-4 w-4" />
            Payment Breakdown
          </div>
          {programs.length > 1 ? (
            <span className="text-xs text-muted-foreground">
              {programs.length} programs
            </span>
          ) : null}
        </div>
      </div>

      {/* Program sections — flat, dividers only */}
      {programs.map((program, idx) => (
        <ProgramSection
          key={idx}
          program={program}
          fmt={fmt}
          isLast={idx === programs.length - 1}
          hideRecurringFeesTable={hideRecurringFeesTable}
        />
      ))}

      {/* Pay now — inline footer strip, no nested card */}
      {showInitialPayable ? (
        <div className="border-t border-border bg-primary/5 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
                Pay now
              </p>
              <p className="mt-0.5 text-sm font-medium text-card-foreground">
                {initialPayableItem!.label}
                {!initialPayableIsInclusive && initialPayableGst > 0 ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (₹{fmt(initialPayablePrincipal)} + {GST_RATE_LABEL} ₹
                    {fmt(initialPayableGst)})
                  </span>
                ) : null}
              </p>
              {planPrincipal != null && initialPayablePrincipal != null ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Balance ₹
                  {fmt(
                    (planPayableTotal ?? planPrincipal) -
                      (initialPayableAmount ?? 0),
                  )}{" "}
                  spread across {restEmiCount} monthly installment
                  {restEmiCount === 1 ? "" : "s"}.
                </p>
              ) : null}
            </div>
            <span className="text-2xl font-semibold tabular-nums text-primary">
              ₹{fmt(initialPayableAmount)}
            </span>
          </div>
        </div>
      ) : null}

      {/* Total franchise fee — bottom summary strip */}
      <div className="border-t border-border bg-muted/30 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-card-foreground">
            {showInitialPayable ? "Total franchise fee" : "Franchise Fee"}
            {feePayable.inclusive ? (
              <Badge variant="secondary" className="font-normal">
                GST inclusive
              </Badge>
            ) : (
              <Badge variant="outline" className="font-normal">
                +{GST_RATE_LABEL}
              </Badge>
            )}
          </span>
          <span
            className={cn(
              "tabular-nums",
              showInitialPayable
                ? "text-lg font-semibold text-card-foreground"
                : "text-xl font-semibold text-primary",
            )}
          >
            ₹{fmt(feePayable.base)}
          </span>
        </div>
        {!feePayable.inclusive && feePayable.base > 0 ? (
          <div className="mt-2 flex flex-col gap-1 border-t border-border/60 pt-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              +{GST_RATE_LABEL} (₹{fmt(feePayable.gst)})
            </span>
            <span className="font-semibold tabular-nums text-card-foreground">
              {showInitialPayable ? "Total payable" : "Payable now"}: ₹
              {fmt(feePayable.payable)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
