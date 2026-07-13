"use client";

import { useState } from "react";
import RequestReviewTable from "./request-review-table";

interface IdRequestsSectionProps {
  franchiseId?: string;
  /** Omit hub-style page title (e.g. franchise detail embed). */
  embed?: boolean;
}

export function IdRequestsSection({
  franchiseId,
  embed: _embed,
}: IdRequestsSectionProps = {}) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <RequestReviewTable
        kind="id"
        refreshTrigger={refreshTrigger}
        scopedFranchiseId={franchiseId}
        onActionSuccess={triggerRefresh}
      />
    </div>
  );
}
