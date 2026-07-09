"use client";

import RequestReviewTable from "@/app/admin/students/_components/request-review-table";

interface CertificateRequestsSectionProps {
  franchiseId?: string;
  embed?: boolean;
}

export function CertificateRequestsSection({
  franchiseId,
  embed: _embed,
}: CertificateRequestsSectionProps = {}) {
  return (
    <div className="space-y-6">
      <RequestReviewTable kind="certificate" scopedFranchiseId={franchiseId} />
    </div>
  );
}
