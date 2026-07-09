"use client";

import FranchisePaymentsDetails from "@/components/payments/FranchisePaymentsDetails";
import { FranchisePaymentsSummary } from "./FranchisePaymentsSummary";

interface FranchisePaymentsTabProps {
  franchiseId: string;
  franchiseName: string;
}

export function FranchisePaymentsTab({
  franchiseId,
  franchiseName,
}: FranchisePaymentsTabProps) {
  return (
    <div className="space-y-4">
      <FranchisePaymentsSummary franchiseId={franchiseId} />
      <FranchisePaymentsDetails
        franchiseId={franchiseId}
        franchiseName={franchiseName}
      />
    </div>
  );
}
