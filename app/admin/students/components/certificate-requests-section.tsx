"use client";

import AdminCertificateRequestsTable from "@/app/admin/students/_components/certificates/AdminCertificateRequestsTable";

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
      <AdminCertificateRequestsTable scopedFranchiseId={franchiseId} />
    </div>
  );
}
