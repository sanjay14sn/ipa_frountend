"use client";

import { useAdminCertificateRequests } from "@/hooks/api/student.hooks";
import AdminCertificateRequestsTable from "@/app/admin/certificate-requests/components/AdminCertificateRequestsTable";

interface CertificateRequestsSectionProps {
  franchiseId?: string;
  embed?: boolean;
}

export function CertificateRequestsSection({
  franchiseId,
  embed,
}: CertificateRequestsSectionProps = {}) {
  const { certificateRequestsByFranchise, isLoading, revalidate } =
    useAdminCertificateRequests();

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">
          Loading certificate requests...
        </div>
      ) : (
        <AdminCertificateRequestsTable
          certificateRequestsByFranchise={certificateRequestsByFranchise}
          onRefresh={revalidate}
          scopedFranchiseId={franchiseId}
        />
      )}
    </div>
  );
}
