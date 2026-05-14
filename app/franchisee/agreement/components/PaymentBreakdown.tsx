import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PaymentBreakdownProps {
  paymentDetails: any;
}

const DEFAULT_L1_MONTHS = 4;
const DEFAULT_L2_MONTHS = 3;

function getProgramFromPayroll(payroll: any) {
  return payroll?.franchiseProgram?.program ?? payroll?.program ?? null;
}

/** Level 1 and first Level 2+ row durations from program streams (matches invoice: royalty × duration per level). */
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

/** Term fees (monthly fee), CI share, franchise share & royalty × level duration — comparison table. */
function LevelRecurringFeesBreakdown({ payroll }: { payroll: any }) {
  const termFees = Number(payroll?.monthlyFee ?? 0);
  const ci = Number(payroll?.ciShare ?? 0);
  const franchise = Number(payroll?.franchiseShare ?? 0);
  const royalty = Number(payroll?.royalty ?? 0);

  const program = getProgramFromPayroll(payroll);
  const { l1, l2 } = getRoyaltyDurationsMonths(program);

  const rows: { label: string; amount: number }[] = [
    { label: "Term fees", amount: termFees },
    { label: "CI share", amount: ci },
    { label: "Franchise share", amount: franchise },
    { label: "Royalty", amount: royalty },
  ];

  return (
    <div className="col-span-2 space-y-2 rounded-xl border border-border bg-accent/30 p-3 text-sm">
      <p className="font-medium text-card-foreground">Per-level recurring fees</p>
      <p className="text-xs text-muted-foreground">
        Term fees (monthly fee), CI share, franchise share and royalty use the monthly rate × the
        months shown in each column (total for that level period).
      </p>
      <p className="text-xs text-muted-foreground">
        Level 2 onwards: same per-month amounts for each Level 2+ enrollment over that level&apos;s
        duration.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border bg-card/70">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40%] text-card-foreground">Fee</TableHead>
              <TableHead className="text-right text-card-foreground">Level 1</TableHead>
              <TableHead className="text-right text-card-foreground">
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
            {rows.map((r) => (
              <TableRow key={r.label}>
                <TableCell className="text-muted-foreground">{r.label}</TableCell>
                <TableCell className="text-right font-semibold text-card-foreground">
                  ₹{fmtMoney(r.amount * l1)}
                </TableCell>
                <TableCell className="text-right font-semibold text-card-foreground">
                  ₹{fmtMoney(r.amount * l2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function PaymentBreakdown({
  paymentDetails,
}: PaymentBreakdownProps) {
  if (!paymentDetails) return null;

  const fmt = (n: number | string | undefined | null) =>
    typeof n === "number"
      ? n.toLocaleString()
      : Number(n || 0).toLocaleString();

  // Check if paymentDetails is an array (per-program) or single object (legacy)
  const isPerProgram = Array.isArray(paymentDetails);

  // For summary, only sum the currency values, not percentages
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
          totalAmount: (acc.totalAmount || 0) + (p.totalAmount || 0),
        }),
        {
          franchiseFee: 0,
          monthlyFee: 0,
          kitCost: 0,
          materialCost: 0,
          installment: 0,
          totalAmount: 0,
        },
      )
    : paymentDetails;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-3 border-b border-border pb-2 text-base font-medium text-card-foreground">
        Payment Breakdown
      </h3>

      {/* Per-Program Breakdown */}
      {isPerProgram && paymentDetails.length > 0 ? (
        <div className="mb-4 space-y-3">
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            {paymentDetails.length > 1
              ? "Program-wise Breakdown:"
              : "Program Breakdown:"}
          </p>
          {paymentDetails.map((program: any, idx: number) => (
            <div
              key={idx}
              className="rounded-xl border border-border bg-accent/30 p-3"
            >
              <h4 className="mb-3 text-sm font-medium text-card-foreground">
                {program.franchiseProgram?.program?.name ||
                  program.program?.name ||
                  `Program ${idx + 1}`}
              </h4>
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Franchise Fee:</span>
                  <span className="font-semibold text-card-foreground">
                    ₹{fmt(program.franchiseFee)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kit Cost:</span>
                  <span className="font-semibold text-card-foreground">
                    ₹{fmt(program.kitCost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Material Cost:</span>
                  <span className="font-semibold text-card-foreground">
                    ₹{fmt(program.materialCost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Installment:</span>
                  <span className="font-semibold text-card-foreground">
                    {typeof program.installment === "boolean"
                      ? program.installment
                        ? "Yes"
                        : "No"
                      : "\u20B9" + fmt(program.installment)}
                  </span>
                </div>
                <LevelRecurringFeesBreakdown payroll={program} />
              </div>
            </div>
          ))}
          {paymentDetails.length > 1 && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-sm font-medium text-card-foreground">
                Combined Summary:
              </p>
            </div>
          )}
        </div>
      ) : !isPerProgram && paymentDetails ? (
        /* Legacy single object breakdown */
        <div className="mb-4 space-y-3">
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Program Breakdown:
          </p>
          <div className="rounded-xl border border-border bg-accent/30 p-3">
            <h4 className="mb-3 text-sm font-medium text-card-foreground">
              {paymentDetails.franchiseProgram?.program?.name ||
                paymentDetails.program?.name ||
                "Program"}
            </h4>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Franchise Fee:</span>
                <span className="font-semibold text-card-foreground">
                  ₹{fmt(paymentDetails.franchiseFee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kit Cost:</span>
                <span className="font-semibold text-card-foreground">
                  ₹{fmt(paymentDetails.kitCost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Material Cost:</span>
                <span className="font-semibold text-card-foreground">
                  ₹{fmt(paymentDetails.materialCost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Installment:</span>
                <span className="font-semibold text-card-foreground">
                  {typeof paymentDetails.installment === "boolean"
                    ? paymentDetails.installment
                      ? "Yes"
                      : "No"
                    : "\u20B9" + fmt(paymentDetails.installment)}
                </span>
              </div>
              <LevelRecurringFeesBreakdown payroll={paymentDetails} />
            </div>
          </div>
        </div>
      ) : null}

      {/* Total Franchise Fee to Pay */}
      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-accent/30 p-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-card-foreground">
          Total Franchise Fee (Payable Now):
        </span>
        <span className="text-xl font-semibold text-primary">
          ₹{fmt(summary.franchiseFee)}
        </span>
      </div>
    </div>
  );
}
