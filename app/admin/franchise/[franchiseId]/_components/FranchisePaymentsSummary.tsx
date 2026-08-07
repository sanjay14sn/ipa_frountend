"use client";

import { SummaryStatCard, SummaryStatGrid } from "@/components/shared";
import {
  useAdminFranchisePaymentSummaries,
  useAdminFranchisePayments,
} from "@/hooks/api/payment.hooks";
import { formatRupees } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";

interface FranchisePaymentsSummaryProps {
  franchiseId: string;
}

interface CollectedSplit {
  label: string;
  amount: number;
  /** Monochrome ramp so the bar reads as one series, not four categories. */
  barClass: string;
}

/**
 * Headline collected amount with the split that makes it up. Buckets are
 * disjoint on the backend, so "Other" (anything outside franchise fee / CI
 * training / orders) is the remainder and only shows when it is non-zero —
 * the parts always add up to the headline.
 */
function CollectedSplitCard({
  total,
  splits,
}: {
  total: number | null;
  splits: CollectedSplit[];
}) {
  const share = (amount: number) =>
    total && total > 0 ? Math.round((amount / total) * 100) : 0;

  return (
    <div
      className="rounded-xl border bg-card"
      data-testid="collected-amount-split"
    >
      <div className="space-y-2 px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">Total collected</div>
          <span className="h-2 w-2 rounded-full bg-primary" />
        </div>
        <div className="text-3xl font-normal leading-none text-card-foreground">
          {total != null ? formatRupees(total) : "—"}
        </div>
        {total != null && total > 0 ? (
          <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
            {splits
              .filter((split) => split.amount > 0)
              .map((split) => (
                <div
                  key={split.label}
                  className={split.barClass}
                  style={{ width: `${(split.amount / total) * 100}%` }}
                />
              ))}
          </div>
        ) : null}
      </div>
      <div
        className={cn(
          "grid divide-y border-t sm:divide-x sm:divide-y-0",
          // Literal class names only — a computed `sm:grid-cols-${n}` is
          // purged out of the production build.
          splits.length > 3 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3",
        )}
      >
        {splits.map((split) => (
          <div key={split.label} className="space-y-1 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <span
                className={cn("h-2 w-2 shrink-0 rounded-full", split.barClass)}
              />
              <span className="text-xs text-muted-foreground">
                {split.label}
              </span>
            </div>
            <div className="text-xl font-normal leading-none text-card-foreground">
              {total != null ? formatRupees(split.amount) : "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {total != null && total > 0
                ? `${share(split.amount)}% of collected`
                : "No collections yet"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FranchisePaymentsSummary({
  franchiseId,
}: FranchisePaymentsSummaryProps) {
  const totalQuery = useAdminFranchisePayments(franchiseId || null, {
    page: 1,
    limit: 1,
  });
  const summaryQuery = useAdminFranchisePaymentSummaries({
    page: 1,
    limit: 1,
    franchiseId: franchiseId.trim(),
  });

  const total = totalQuery.data?.meta?.total ?? 0;
  const summary = summaryQuery.data?.data?.[0];
  const collected = summary?.totalAmount ?? null;
  const completed = summary?.totalCompleted ?? 0;
  const pending = summary?.totalPending ?? 0;

  const franchiseFee = summary?.franchiseFeeAmount ?? 0;
  const ciTraining = summary?.ciTrainingAmount ?? 0;
  const orders = summary?.orderAmount ?? 0;
  const other = Math.max(
    0,
    (collected ?? 0) - franchiseFee - ciTraining - orders,
  );

  const splits: CollectedSplit[] = [
    { label: "Franchise fee", amount: franchiseFee, barClass: "bg-primary" },
    { label: "CI training", amount: ciTraining, barClass: "bg-primary/60" },
    { label: "Orders", amount: orders, barClass: "bg-primary/30" },
    ...(other > 0
      ? [{ label: "Other", amount: other, barClass: "bg-muted-foreground/40" }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <CollectedSplitCard total={collected} splits={splits} />
      <SummaryStatGrid className="lg:grid-cols-3">
        <SummaryStatCard
          label="Total payments"
          value={total}
          description="All payments for this franchise"
        />
        <SummaryStatCard
          label="Completed"
          value={completed}
          description="Successfully captured"
        />
        <SummaryStatCard
          label="Pending"
          value={pending}
          description="Awaiting capture"
        />
      </SummaryStatGrid>
    </div>
  );
}
