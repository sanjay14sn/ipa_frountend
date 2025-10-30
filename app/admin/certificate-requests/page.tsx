"use client";

import { useAdminCertificateRequests } from "@/hooks/use-students";
import AdminCertificateRequestsTable from "./components/AdminCertificateRequestsTable";

export default function AdminCertificateRequestsPage() {
  const { certificateRequestsByFranchise, isLoading, revalidate } =
    useAdminCertificateRequests();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Certificate Requests Management
          </h1>
          <p className="text-muted-foreground">
            Review and manage student certificate requests
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">
          Loading certificate requests...
        </div>
      ) : (
        <AdminCertificateRequestsTable
          certificateRequestsByFranchise={certificateRequestsByFranchise}
          onRefresh={revalidate}
        />
      )}
    </div>
  );
}
