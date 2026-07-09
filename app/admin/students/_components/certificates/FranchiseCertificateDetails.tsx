"use client";

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { DetailDialog } from "@/components/shared/dialog";
import { Check, X, FileText, ExternalLink } from "lucide-react";
import {
  DataTable,
  ExpandedDetailSection,
  ExpandedDetailSurface,
  StatusBadge,
  TableMainCell,
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
  useDispatchEligibleOrders,
} from "@/hooks/api/student.hooks";
import { useApproveAndDispatchEligibleCertificates } from "@/hooks/api/certificate-dispatch.hooks";
import { BulkDispatchFlowModal } from "@/components/shared/BulkDispatchFlowModal";

interface FranchiseCertificateDetailsProps {
  franchiseId: string;
  franchiseName: string;
}

export default function FranchiseCertificateDetails({
  franchiseId,
  franchiseName,
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
  const eligibleQuery = useDispatchEligibleOrders(franchiseId, dispatchOpen);
  const eligibleCountQuery = useApproveAndDispatchEligibleCertificates(
    { franchiseId, page: 1, limit: 1 },
    true,
  );
  const requests = detailsQuery.data?.data ?? [];

  const eligibleCertCount = (() => {
    const payload = eligibleCountQuery.data;
    if (!payload || typeof payload !== "object") return 0;
    const obj = payload as Record<string, unknown>;
    if (
      obj.meta &&
      typeof obj.meta === "object" &&
      typeof (obj.meta as Record<string, unknown>).total === "number"
    ) {
      return Number((obj.meta as Record<string, unknown>).total);
    }
    if (typeof obj.total === "number") return Number(obj.total);
    if (Array.isArray(obj.rows)) return obj.rows.length;
    if (Array.isArray(obj.data)) return obj.data.length;
    if (Array.isArray(payload)) return (payload as unknown[]).length;
    return 0;
  })();

  const totalRequests = detailsQuery.data?.meta.total ?? 0;
  const totalPages = detailsQuery.data?.meta.totalPages ?? 1;
  const loading = detailsQuery.isLoading && !detailsQuery.data;

  const certificatePreviewUrl = selectedCertificate
    ? getAdminCertificatePdfUrl(selectedCertificate.id)
    : "";

  // Approve is per-PROGRESSION: issues ALL of that progression's pending certs
  // at once. Reject is per-certificate.
  const handleApprove = async (progressionId: number) => {
    try {
      await approveCertificateRequestWithRevalidation(progressionId);
      toast.success("Certificate request approved successfully");
      void detailsQuery.refetch();
    } catch {
      toast.error("Failed to approve certificate request");
    }
  };

  const handleReject = async (certId: number) => {
    try {
      await rejectCertificateRequestWithRevalidation(certId);
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
      key: "student",
      header: "Student",
    },
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
      key: "certificate",
      header: "Certificate",
      render: (req) => req.templateName || "—",
    },
    {
      key: "instructor",
      header: "Instructor",
      render: (req) => req.instructorName || "—",
    },
    {
      key: "marks",
      header: "%",
      className: "text-center",
      render: (req) => {
        const denominator = req.totalMarks || req.levelTotalMarks || 0;
        return denominator > 0
          ? `${((req.marksObtained / denominator) * 100).toFixed(1)}%`
          : "—";
      },
    },
    {
      key: "dispatch",
      header: "Dispatch",
      className: "text-center",
      render: (req) =>
        req.dispatchStatus === "Dispatched" ? (
          <StatusBadge
            tone="success"
            label={`Dispatched${req.dispatchedAt ? ` ${formatDate(req.dispatchedAt)}` : ""}`}
          />
        ) : (
          <StatusBadge tone="neutral" label="Not dispatched" />
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
              variant="ghost"
              size="icon"
              onClick={() => handleApprove(req.progressionId)}
              className="h-8 w-8"
              title="Issue Certificate"
              aria-label="Issue Certificate"
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleReject(req.id)}
              className="h-8 w-8"
              title="Reject"
              aria-label="Reject"
            >
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ) : req.status === "Issued" ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedCertificate(req)}
            className="h-8 w-8"
            title="View Certificate"
            aria-label="View Certificate"
          >
            <FileText className="h-4 w-4 text-blue-600" />
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
      <DateInput
        value={dateFilter}
        onChange={(v) => {
          setDateFilter(v);
          setPage(1);
        }}
        className="h-9 w-[170px]"
      />
      <Button
        size="sm"
        variant="default"
        className="h-9 shrink-0"
        onClick={() => setDispatchOpen(true)}
        disabled={eligibleCertCount === 0}
        title="Approves any pending certificates in your selection and dispatches all selected"
      >
        Approve and Dispatch
      </Button>
    </div>
  );

  return (
    <>
      <ExpandedDetailSurface className="border-t border-border/60">
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
                <TableMainCell
                  title={req.studentName}
                  subtitle={req.studentRollNo}
                />
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

      <DetailDialog
        open={Boolean(selectedCertificate)}
        onOpenChange={(open) => {
          if (!open) setSelectedCertificate(null);
        }}
        size="2xl"
        headerIcon={FileText}
        title="View Certificate"
        description={
          selectedCertificate
            ? `${selectedCertificate.studentName} - ${selectedCertificate.studentLevel}${
                selectedCertificate.templateName
                  ? ` · ${selectedCertificate.templateName}`
                  : ""
              }`
            : "Certificate preview"
        }
        footer={{
          primary: {
            label: "Open in New Tab",
            onClick: () => window.open(certificatePreviewUrl, "_blank"),
            disabled: !certificatePreviewUrl,
          },
          secondary: {
            label: "Close",
            onClick: () => setSelectedCertificate(null),
          },
        }}
      >
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
      </DetailDialog>

      <BulkDispatchFlowModal
        open={dispatchOpen}
        onOpenChange={setDispatchOpen}
        franchiseId={franchiseId}
        eligibleOrders={eligibleQuery.data ?? []}
        isLoadingOrders={eligibleQuery.isLoading}
        onComplete={() => {
          void detailsQuery.refetch();
        }}
      />
    </>
  );
}
