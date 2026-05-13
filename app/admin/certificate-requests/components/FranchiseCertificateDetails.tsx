"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, FileText, ExternalLink, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
  RawTableSurface,
} from "@/components/shared";
import {
  AdminCertificateRequest,
  getAdminCertificatePdfUrl,
} from "@/services/student.service";
import { useToast } from "@/hooks/use-toast";
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
  const [statusFilter, setStatusFilter] = useState<
    "all" | "Pending" | "Issued" | "Rejected"
  >("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCertificate, setSelectedCertificate] =
    useState<AdminCertificateRequest | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const apiStatus = useMemo(() => {
    if (statusFilter === "all") return "all";
    return statusFilter;
  }, [statusFilter]);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      search: searchTerm || undefined,
      status: apiStatus,
      sortBy: "id",
      sortOrder: "DESC" as const,
    }),
    [page, searchTerm, apiStatus],
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Issued":
        return "bg-green-100 text-green-800 border-green-200";
      case "Rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleApprove = async (requestId: number) => {
    try {
      await approveCertificateRequestWithRevalidation(requestId);
      toast({
        title: "Success",
        description: "Certificate request approved successfully",
      });
      void detailsQuery.refetch();
    } catch {
      toast({
        title: "Error",
        description: "Failed to approve certificate request",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await rejectCertificateRequestWithRevalidation(requestId);
      toast({
        title: "Success",
        description: "Certificate request rejected successfully",
      });
      void detailsQuery.refetch();
    } catch {
      toast({
        title: "Error",
        description: "Failed to reject certificate request",
        variant: "destructive",
      });
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
          <div className="mb-3 flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] max-w-xs flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by student, roll number, or instructor..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {(["all", "Pending", "Issued", "Rejected"] as const).map((s) => (
                  <Button
                    key={s}
                    variant={statusFilter === s ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setStatusFilter(s);
                      setPage(1);
                    }}
                  >
                    {s === "all" ? "All" : s}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 self-end sm:self-center">
              <span className="text-sm text-muted-foreground">Request date:</span>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setPage(1);
                }}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              />
              <Button
                size="sm"
                variant="default"
                className="h-8 shrink-0"
                onClick={() => setDispatchOpen(true)}
                disabled={pendingDispatchItems.length === 0}
              >
                Dispatch Certificates
              </Button>
            </div>
          </div>

          {!franchiseId?.trim() ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No franchise selected.
            </p>
          ) : loading ? (
            <Table>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : requests.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No requests found for this filter.
            </p>
          ) : (
            <RawTableSurface className="shadow-none">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary hover:bg-secondary">
                    <TableHead>Student</TableHead>
                    <TableHead className="text-center">Level</TableHead>
                    <TableHead className="text-center">Instructor</TableHead>
                    <TableHead className="text-center">Marks</TableHead>
                    <TableHead className="text-center">Request Date</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => {
                    const denominator =
                      req.totalMarks || req.levelTotalMarks || 1;
                    const percentage =
                      denominator > 0
                        ? ((req.marksObtained / denominator) * 100).toFixed(1)
                        : "N/A";

                    return (
                      <TableRow key={req.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="font-medium text-gray-900">
                            {req.studentName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {req.studentRollNo}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {req.studentLevel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm text-gray-600">
                          {req.instructorName}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          <div className="font-medium">
                            {req.marksObtained}/{denominator}
                          </div>
                          <div className="text-xs text-gray-500">
                            {percentage}%
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm text-gray-600">
                          {new Date(req.requestDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {req.status === "Pending" ? (
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
                            <Badge
                              className={`${getStatusColor(req.status)} border`}
                            >
                              {req.status}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </RawTableSurface>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-2 py-3">
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalRequests} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
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
