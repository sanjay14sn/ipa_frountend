"use client";

import AdminCertificateRequestsTable from "@/app/admin/certificate-requests/components/AdminCertificateRequestsTable";
import AdminStreamCertificatesTable from "@/app/admin/certificate-requests/components/AdminStreamCertificatesTable";

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
      <div className="mt-6">
        <AdminStreamCertificatesTable scopedFranchiseId={franchiseId} />
      </div>
    </div>
  );
}
