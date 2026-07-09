"use client";

import { useState } from "react";
import RequestedIdTable from "@/app/admin/students/_components/ids/RequestedIdTable";

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
      <RequestedIdTable
        refreshTrigger={refreshTrigger}
        scopedFranchiseId={franchiseId}
        onIssueSuccess={triggerRefresh}
      />
    </div>
  );
}
