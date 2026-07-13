"use client";

import { SummaryStatCard, SummaryStatGrid } from "@/components/shared";
import { useAdminStudentsByFranchise } from "@/hooks/api/student.hooks";

interface FranchiseStudentsSummaryProps {
  franchiseId: string;
}

function useStudentCount(
  franchiseId: string,
  status?: string,
  idStatus?: string,
) {
  const query = useAdminStudentsByFranchise(franchiseId || null, {
    page: 1,
    limit: 1,
    status,
    idStatus,
  });
  return query.data?.meta?.total ?? 0;
}

export function FranchiseStudentsSummary({
  franchiseId,
}: FranchiseStudentsSummaryProps) {
  const total = useStudentCount(franchiseId);
  const active = useStudentCount(franchiseId, "active");
  const inactive = useStudentCount(franchiseId, "inactive");
  const idRequested = useStudentCount(franchiseId, undefined, "Requested");

  return (
    <SummaryStatGrid>
      <SummaryStatCard
        label="Total students"
        value={total}
        description="All students in this franchise"
      />
      <SummaryStatCard
        label="Active"
        value={active}
        description="Currently enrolled"
      />
      <SummaryStatCard
        label="Inactive"
        value={inactive}
        description="Not currently enrolled"
      />
      <SummaryStatCard
        label="ID requested"
        value={idRequested}
        description="Pending ID card issuance"
      />
    </SummaryStatGrid>
  );
}
