"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/shared/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";
import { DataTable, StatusBadge, formatStatusLabel, TableMainCell } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableSortOption,
} from "@/components/shared";
import type { ProgramRequestRow } from "@/services/franchise.service";
import type { ProgramRequestItem } from "@/services/program-request.service";
import { rejectProgramRequestAdmin } from "@/services/program-request.service";
import { usePaginatedProgramRequestsAdmin } from "@/hooks/api/program-request.hooks";
import { queryKeys } from "@/hooks/api/query-keys";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import ProgramRequestDetails from "./ProgramRequestDetails";

interface ProgramRequestsTableProps {
  onApprove?: (request: ProgramRequestRow) => void;
  refreshTrigger?: number;
}

function toRow(item: ProgramRequestItem): ProgramRequestRow {
  return {
    id: item.id,
    franchiseId: item.franchiseId,
    programId: item.programId,
    status: item.status,
    program: item.program,
    franchise: item.franchise,
    franchisee: item.franchisee,
    requestedBy: String(item.franchiseeId),
    createdAt: item.requestedAt,
  };
}

export default function ProgramRequestsTable({
  onApprove,
  refreshTrigger,
}: ProgramRequestsTableProps) {
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  // Post-refactor program-request lifecycle is Pending → Approved | Rejected.
  // Default the filter to Pending so the admin sees actionable rows first.
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [sortBy, setSortBy] = useState("requestedAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const itemsPerPage = 10;

  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    request: ProgramRequestRow | null;
    reason: string;
  }>({ open: false, request: null, reason: "" });

  const listParams = useMemo(
    () => ({
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      sortBy,
      sortOrder,
    }),
    [currentPage, itemsPerPage, searchTerm, statusFilter, sortBy, sortOrder],
  );

  const {
    data: pageData,
    isLoading: loading,
    refetch,
  } = usePaginatedProgramRequestsAdmin(listParams);

  useEffect(() => {
    void refetch();
  }, [refreshTrigger, refetch]);

  const rows: ProgramRequestRow[] = useMemo(
    () => (pageData?.data ?? []).map(toRow),
    [pageData],
  );
  const total = pageData?.meta.total ?? 0;
  const totalPages = pageData?.meta.totalPages ?? 0;

  const handleApprove = (request: ProgramRequestRow) => {
    onApprove?.(request);
  };

  const handleReject = (request: ProgramRequestRow) => {
    setRejectDialog({ open: true, request, reason: "" });
  };

  const confirmReject = async () => {
    const { request, reason } = rejectDialog;
    if (!request) return;
    if (!reason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    setRejectDialog((prev) => ({ ...prev, open: false }));
    setRejectingId(request.id);
    try {
      await rejectProgramRequestAdmin(request.id, reason.trim());
      toast.success("Program request rejected");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.programRequests.admin(),
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to reject"));
    } finally {
      setRejectingId(null);
    }
  };

  const columns: DataTableColumn<ProgramRequestRow>[] = [
    {
      key: "request",
      header: "Request",
      className: "w-[300px]",
    },
    {
      key: "program",
      header: "Program",
      className: "text-center",
      render: (r) => r.program?.name ?? "—",
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (r) => (
        <StatusBadge label={formatStatusLabel(r.status)} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
          {r.status === "Pending" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleApprove(r)}
                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleReject(r)}
                disabled={rejectingId === r.id}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All statuses" },
        { value: "Pending", label: "Pending" },
        { value: "Approved", label: "Approved" },
        { value: "Rejected", label: "Rejected" },
      ],
      defaultValue: "Pending",
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { value: "requestedAt", label: "Date" },
  ];

  return (
    <>
      <DataTable
        data={rows}
        loading={loading}
        columns={columns}
        getRowId={(r) => r.id.toString()}
        renderMainCell={(r) => (
          <TableMainCell title={r.franchise?.name ?? r.franchise?.code ?? "—"} />
        )}
        renderExpandedContent={(r) => <ProgramRequestDetails request={r} />}
        searchPlaceholder="Search franchise, program, or franchisee..."
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        filters={filters}
        onFilterChange={(key, value) => {
          if (key === "status") setStatusFilter(value as string);
          setCurrentPage(1);
        }}
        sortOptions={sortOptions}
        defaultSortBy="requestedAt"
        defaultSortOrder="DESC"
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy);
          setSortOrder(newSortOrder);
          setCurrentPage(1);
        }}
        pagination={{ total, totalPages }}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        emptyMessage="No program requests found matching your criteria"
        resultsText={(count, tot) =>
          `Showing ${count} of ${tot} program requests`
        }
      />

      <FormDialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog((prev) => ({ ...prev, open }))}
        size="md"
        title="Reject Program Request"
        description={
          <>
            Rejecting request for &ldquo;
            {rejectDialog.request?.program?.name}&rdquo;. Please provide a
            reason.
          </>
        }
        formId="program-reject-form"
        onSubmit={(e) => {
          e.preventDefault();
          confirmReject();
        }}
        submitLabel="Reject"
        cancelLabel="Cancel"
        canSubmit={Boolean(rejectDialog.reason.trim())}
      >
        <div className="space-y-2 py-2">
          <Label htmlFor="reject-reason">Reason</Label>
          <Textarea
            id="reject-reason"
            placeholder="Enter rejection reason..."
            value={rejectDialog.reason}
            onChange={(e) =>
              setRejectDialog((prev) => ({
                ...prev,
                reason: e.target.value,
              }))
            }
            rows={3}
          />
        </div>
      </FormDialog>
    </>
  );
}
