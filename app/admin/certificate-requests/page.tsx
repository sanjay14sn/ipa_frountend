"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award } from "lucide-react";
import { useAdminCertificateRequests } from "@/hooks/use-students";
import AdminCertificateRequestsTable from "./components/AdminCertificateRequestsTable";

export default function AdminCertificateRequestsPage() {
  const { certificateRequestsByFranchise, isLoading, revalidate } =
    useAdminCertificateRequests();

  // Flatten data for counting
  const allRequests = Object.values(certificateRequestsByFranchise).flat();

  // Count requests by status
  const pendingCount = allRequests.filter(
    (req) => req.status === "Pending"
  ).length;
  const approvedCount = allRequests.filter(
    (req) => req.status === "Approved"
  ).length;
  const rejectedCount = allRequests.filter(
    (req) => req.status === "Rejected"
  ).length;

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

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Requests ({allRequests.length})
          </TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedCount})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading pending requests...
            </div>
          ) : (
            <AdminCertificateRequestsTable
              certificateRequestsByFranchise={Object.fromEntries(
                Object.entries(certificateRequestsByFranchise)
                  .map(([franchise, requests]) => [
                    franchise,
                    requests.filter((req) => req.status === "Pending"),
                  ])
                  .filter(([, requests]) => requests.length > 0)
              )}
              onRefresh={revalidate}
            />
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading approved requests...
            </div>
          ) : (
            <AdminCertificateRequestsTable
              certificateRequestsByFranchise={Object.fromEntries(
                Object.entries(certificateRequestsByFranchise)
                  .map(([franchise, requests]) => [
                    franchise,
                    requests.filter((req) => req.status === "Approved"),
                  ])
                  .filter(([, requests]) => requests.length > 0)
              )}
              onRefresh={revalidate}
            />
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading rejected requests...
            </div>
          ) : (
            <AdminCertificateRequestsTable
              certificateRequestsByFranchise={Object.fromEntries(
                Object.entries(certificateRequestsByFranchise)
                  .map(([franchise, requests]) => [
                    franchise,
                    requests.filter((req) => req.status === "Rejected"),
                  ])
                  .filter(([, requests]) => requests.length > 0)
              )}
              onRefresh={revalidate}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
