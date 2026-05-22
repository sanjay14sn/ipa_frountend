"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, X, FileText, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  DataTable,
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
  StatusBadge,
  type DataTableColumn,
  type DataTableFilter,
} from "@/components/shared";
import {
  AdminCertificateRequest,
  getAdminCertificatePdfUrl,
} from "@/services/student.service";
import { toast } from "sonner";
import {
  approveCertificateRequestWithRevalidation,
  rejectCertificateRequestWithRevalidation,
  useAdminCertificateDetails,
  useBulkDispatchCertificates,
  useDispatchEligibleOrders,
} from "@/hooks/api/student.hooks";
import {
  BulkDispatchPickerModal,
  type DispatchPickerItem,
} from "@/components/shared/BulkDispatchPickerModal";

interface FranchiseCertificateDetailsProps {
  franchiseId: string;
  franchiseName: string;
  totalPending: number;
  totalIssued: number;
  totalRejected: number;
}

export default function FranchiseCertificateDetails({
  franchiseId,
  franchiseName,
  totalPending,
  totalIssued,
  totalRejected,
}: FranchiseCertificateDetailsProps) {
  const [page, setPage] = useState(1);
  const limit = 10;
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCertificate, setSelectedCertificate] =
    useState<AdminCertificateRequest | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [dispatchOpen, setDispatchOpen] = useState(false);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      search: searchTerm || undefined,
      status: statusFilter,
      sortBy: "id",
      sortOrder: "DESC" as const,
    }),
    [page, searchTerm, statusFilter],
  );

  const detailsQuery = useAdminCertificateDetails(franchiseId, queryParams);
  const bulkDispatch = useBulkDispatchCertificates();
  const eligibleQuery = useDispatchEligibleOrders(franchiseId, dispatchOpen);
  const requests = detailsQuery.data?.data ?? [];

  const pendingDispatchItems: DispatchPickerItem[] = useMemo(() => {
    return requests
      .filter((r) => {
        if (r.status !== "Pending") return false;
        if (!dateFilter) return true;
        return (r.requestDate ?? "").slice(0, 10) === dateFilter;
      })
      .map((r) => {
        const denominator = r.totalMarks || r.levelTotalMarks || 1;
        return {
          id: r.id,
          label: r.studentName,
          sublabel: r.studentRollNo,
          requestDate: (r.requestDate ?? "").slice(0, 10),
          levelMarks: `${r.marksObtained}/${denominator}`,
          ciName: r.instructorName,
          levelCode: r.studentLevelCode?.trim() || r.studentLevel || undefined,
        };
      });
  }, [requests, dateFilter]);

  const totalRequests = detailsQuery.data?.meta.total ?? 0;
  const totalPages = detailsQuery.data?.meta.totalPages ?? 1;
  const loading = detailsQuery.isLoading && !detailsQuery.data;

  const certificatePreviewUrl = selectedCertificate
    ? getAdminCertificatePdfUrl(selectedCertificate.id)
    : "";

  const handleApprove = async (requestId: number) => {
    try {
      await approveCertificateRequestWithRevalidation(requestId);
      toast.success("Certificate request approved successfully");
      void detailsQuery.refetch();
    } catch {
      toast.error("Failed to approve certificate request");
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await rejectCertificateRequestWithRevalidation(requestId);
      toast.success("Certificate request rejected successfully");
      void detailsQuery.refetch();
    } catch {
      toast.error("Failed to reject certificate request");
    }
  };

  const sectionTitle =
    statusFilter === "Pending"
      ? "Awaiting approval"
      : statusFilter === "Issued"
        ? "Issued certificates"
        : statusFilter === "Rejected"
          ? "Rejected requests"
          : "Certificate requests";

  const columns: DataTableColumn<AdminCertificateRequest>[] = [
    {
      key: "level",
      header: "Level",
      className: "text-center",
      render: (req) => (
        <Badge variant="outline" className="text-xs">
          {req.studentLevel}
        </Badge>
      ),
    },
    {
      key: "instructor",
      header: "Instructor",
      className: "text-center",
      render: (req) => (
        <span className="text-sm text-gray-600">{req.instructorName}</span>
      ),
    },
    {
      key: "marks",
      header: "Marks",
      className: "text-center",
      render: (req) => {
        const denominator = req.totalMarks || req.levelTotalMarks || 1;
        const percentage =
          denominator > 0
            ? ((req.marksObtained / denominator) * 100).toFixed(1)
            : "N/A";
        return (
          <div className="text-sm">
            <div className="font-medium">
              {req.marksObtained}/{denominator}
            </div>
            <div className="text-xs text-gray-500">{percentage}%</div>
          </div>
        );
      },
    },
    {
      key: "requestDate",
      header: "Request Date",
      className: "text-center",
      render: (req) => (
        <span className="text-sm text-gray-600">
          {new Date(req.requestDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (req) =>
        req.status === "Pending" ? (
          <div className="flex items-center justify-center gap-1">
            <Button
              size="sm"
              onClick={() => handleApprove(req.id)}
              className="h-8 w-8 bg-green-600 p-0 hover:bg-green-700"
              title="Issue Certificate"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleReject(req.id)}
              className="h-8 w-8 p-0"
              title="Reject"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : req.status === "Issued" ? (
          <Button
            size="sm"
            onClick={() => setSelectedCertificate(req)}
            className="h-8 w-8 bg-blue-600 p-0 hover:bg-blue-700"
            title="View Certificate"
            aria-label="View Certificate"
          >
            <FileText className="h-4 w-4" />
          </Button>
        ) : (
          <StatusBadge label={req.status} />
        ),
    },
  ];

  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All" },
        { value: "Pending", label: "Pending" },
        { value: "Issued", label: "Issued" },
        { value: "Rejected", label: "Rejected" },
      ],
      defaultValue: "all",
    },
  ];

  const toolbarActions = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Request date:</span>
      <input
        type="date"
        value={dateFilter}
        onChange={(e) => {
          setDateFilter(e.target.value);
          setPage(1);
        }}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
      />
      <Button
        size="sm"
        variant="default"
        className="h-9 shrink-0"
        onClick={() => setDispatchOpen(true)}
        disabled={pendingDispatchItems.length === 0}
      >
        Dispatch Certificates
      </Button>
    </div>
  );

  return (
    <>
      <ExpandedDetailSurface className="border-t border-border/60">
        <ExpandedDetailSection title="Certificate request summary">
          <DetailFieldsGrid columns={4}>
            <DetailField label="Franchise" value={franchiseName} />
            <DetailField label="Pending" value={totalPending} />
            <DetailField label="Issued" value={totalIssued} />
            <DetailField label="Rejected" value={totalRejected} />
          </DetailFieldsGrid>
        </ExpandedDetailSection>

        <Separator />

        <ExpandedDetailSection title={sectionTitle}>
          {!franchiseId?.trim() ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No franchise selected.
            </p>
          ) : (
            <DataTable
              data={requests}
              loading={loading}
              columns={columns}
              getRowId={(req) => String(req.id)}
              renderMainCell={(req) => (
                <div>
                  <div className="font-medium text-gray-900">
                    {req.studentName}
                  </div>
                  <div className="text-xs text-gray-500">{req.studentRollNo}</div>
                </div>
              )}
              searchPlaceholder="Search by student, roll number, or instructor..."
              onSearchChange={(value) => {
                setSearchTerm(value);
                setPage(1);
              }}
              filters={filters}
              onFilterChange={(key, value) => {
                if (key === "status") setStatusFilter(value as string);
                setPage(1);
              }}
              toolbarActions={toolbarActions}
              pagination={{ total: totalRequests, totalPages }}
              currentPage={page}
              onPageChange={setPage}
              itemsPerPage={limit}
              emptyMessage="No requests found for this filter"
              resultsText={(count, total) =>
                `Showing ${count} of ${total} requests`
              }
            />
          )}
        </ExpandedDetailSection>
      </ExpandedDetailSurface>

      <Dialog
        open={Boolean(selectedCertificate)}
        onOpenChange={(open) => {
          if (!open) setSelectedCertificate(null);
        }}
      >
        <DialogContent className="mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0 border-b border-gray-200 pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <FileText className="h-5 w-5 text-primary" />
              View Certificate
            </DialogTitle>
            <DialogDescription>
              {selectedCertificate
                ? `${selectedCertificate.studentName} - ${selectedCertificate.studentLevel}`
                : "Certificate preview"}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-[65vh] flex-1 overflow-hidden rounded-lg border bg-muted">
            {certificatePreviewUrl ? (
              <iframe
                src={certificatePreviewUrl}
                title={
                  selectedCertificate
                    ? `${selectedCertificate.studentName} certificate`
                    : "Certificate preview"
                }
                className="h-full min-h-[65vh] w-full bg-white"
              />
            ) : (
              <div className="flex h-full min-h-[65vh] items-center justify-center p-6 text-sm text-muted-foreground">
                Certificate PDF is not available.
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t border-gray-200 pt-4">
            <Button
              variant="outline"
              onClick={() => setSelectedCertificate(null)}
            >
              Close
            </Button>
            <Button
              onClick={() => window.open(certificatePreviewUrl, "_blank")}
              disabled={!certificatePreviewUrl}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkDispatchPickerModal
        open={dispatchOpen}
        onOpenChange={setDispatchOpen}
        title="Certificates"
        items={pendingDispatchItems}
        eligibleOrders={eligibleQuery.data ?? []}
        isLoadingOrders={eligibleQuery.isLoading}
        onConfirm={async (selectedIds, orderId) => {
          await bulkDispatch.mutateAsync({
            ids: selectedIds,
            orderId: orderId ?? undefined,
          });
          await detailsQuery.refetch();
        }}
      />
    </>
  );
}
