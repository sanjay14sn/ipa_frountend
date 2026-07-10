"use client";

import { SummaryStatCard, SummaryStatGrid } from "@/components/shared";
import { useAdminOrderRows } from "@/hooks/api/order.hooks";

interface FranchiseOrdersSummaryProps {
  franchiseId: string;
}

function useOrderCount(franchiseId: string, status?: string) {
  const query = useAdminOrderRows({
    page: 1,
    limit: 1,
    phase: "orders",
    franchiseId,
    status,
  });
  return query.data?.total ?? 0;
}

export function FranchiseOrdersSummary({
  franchiseId,
}: FranchiseOrdersSummaryProps) {
  const total = useOrderCount(franchiseId);
  const pendingPayment = useOrderCount(franchiseId, "Pending payment");
  const delivered = useOrderCount(franchiseId, "Delivered");
  const cancelled = useOrderCount(franchiseId, "Cancelled");

  return (
    <SummaryStatGrid>
      <SummaryStatCard
        label="Total orders"
        value={total}
        description="All orders for this franchise"
      />
      <SummaryStatCard
        label="Pending payment"
        value={pendingPayment}
        description="Awaiting capture"
      />
      <SummaryStatCard
        label="Delivered"
        value={delivered}
        description="Successfully fulfilled"
      />
      <SummaryStatCard
        label="Cancelled"
        value={cancelled}
        description="Cancelled orders"
      />
    </SummaryStatGrid>
  );
}
