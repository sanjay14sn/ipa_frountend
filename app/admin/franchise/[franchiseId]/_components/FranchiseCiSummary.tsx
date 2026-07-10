"use client";

import { SummaryStatCard, SummaryStatGrid } from "@/components/shared";
import { useQuery } from "@tanstack/react-query";
import { getPaginatedAdminCourseInstructors } from "@/services/course-instructor.service";

interface FranchiseCiSummaryProps {
  franchiseId: string;
}

function useCiCount(franchiseId: string, status?: string) {
  const query = useQuery({
    queryKey: ["admin-ci-count", franchiseId, status ?? "all"],
    queryFn: () =>
      getPaginatedAdminCourseInstructors({
        page: 1,
        limit: 1,
        franchiseId: franchiseId.trim() || undefined,
        status,
      }),
    enabled: franchiseId.trim().length > 0,
  });
  return query.data?.meta.total ?? 0;
}

export function FranchiseCiSummary({ franchiseId }: FranchiseCiSummaryProps) {
  const total = useCiCount(franchiseId);
  // "valid" = derived operational filter (latest CI agreement is Valid); the
  // old "Active" review status no longer exists.
  const active = useCiCount(franchiseId, "valid");
  const training = useCiCount(franchiseId, "Training");
  const pending = useCiCount(franchiseId, "Pending");

  return (
    <SummaryStatGrid>
      <SummaryStatCard
        label="Total CIs"
        value={total}
        description="All course instructors"
      />
      <SummaryStatCard
        label="Active"
        value={active}
        description="Currently active"
      />
      <SummaryStatCard
        label="Training"
        value={training}
        description="In training"
      />
      <SummaryStatCard
        label="Pending"
        value={pending}
        description="Awaiting approval"
      />
    </SummaryStatGrid>
  );
}
