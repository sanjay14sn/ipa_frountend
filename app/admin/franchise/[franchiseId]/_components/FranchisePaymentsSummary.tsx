"use client";

import { SummaryStatCard, SummaryStatGrid } from "@/components/shared";
import {
  useAdminFranchisePaymentSummaries,
  useAdminFranchisePayments,
} from "@/hooks/api/payment.hooks";
import { formatRupees } from "@/lib/currency-utils";

interface FranchisePaymentsSummaryProps {
  franchiseId: string;
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
  const completedAmount =
    summary?.totalAmount != null
      ? formatRupees(summary.totalAmount)
      : "—";
  const completed = summary?.totalCompleted ?? 0;
  const pending = summary?.totalPending ?? 0;

  return (
    <SummaryStatGrid>
      <SummaryStatCard
        label="Total payments"
        value={total}
        description="All payments for this franchise"
      />
      <SummaryStatCard
        label="Completed amount"
        value={completedAmount}
        description="Total collected"
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
  );
}
