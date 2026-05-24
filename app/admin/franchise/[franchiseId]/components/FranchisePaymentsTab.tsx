"use client";

import { useMemo } from "react";
import FranchisePaymentsDetails from "@/app/admin/payments/components/FranchisePaymentsDetails";
import { useAdminFranchisePaymentSummaries } from "@/hooks/api/payment.hooks";

interface FranchisePaymentsTabProps {
  franchiseId: string;
  franchiseName: string;
}

export function FranchisePaymentsTab({
  franchiseId,
  franchiseName,
}: FranchisePaymentsTabProps) {
  const summaryParams = useMemo(
    () => ({ page: 1, limit: 1, franchiseId: franchiseId.trim() }),
    [franchiseId],
  );

  const summariesQuery = useAdminFranchisePaymentSummaries(summaryParams);
  const summary = summariesQuery.data?.data?.[0];

  return (
    <FranchisePaymentsDetails
      franchiseId={franchiseId}
      franchiseName={summary?.franchiseName ?? franchiseName}
      totalCompleted={summary?.totalCompleted}
      totalPending={summary?.totalPending}
      totalAmount={summary?.totalAmount}
    />
  );
}
