"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle } from "lucide-react";
import { DataTable } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableSortOption,
} from "@/components/shared";
import type { ProgramRequestRow } from "@/services/franchise.service";
import {
  listProgramRequestsForAdmin,
  rejectProgramRequestAdmin,
} from "@/services/program-request.service";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import ProgramRequestDetails from "./ProgramRequestDetails";

interface ProgramRequestsTableProps {
  onApprove?: (request: ProgramRequestRow) => void;
  refreshTrigger?: number;
}

export default function ProgramRequestsTable({
  onApprove,
  refreshTrigger,
}: ProgramRequestsTableProps) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ProgramRequestRow[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    request: ProgramRequestRow | null;
    reason: string;
  }>({ open: false, request: null, reason: "" });

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Requested");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const itemsPerPage = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listProgramRequestsForAdmin({
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      // Map ProgramRequestItem -> ProgramRequestRow shape used by this table
      const rows: ProgramRequestRow[] = items.map((item) => ({
        id: item.id,
        franchiseId: item.franchiseId,
        programId: item.programId,
        status: item.status,
        program: item.program,
        franchise: item.franchise,
        franchisee: item.franchisee,
        requestedBy: String(item.franchiseeId),
        createdAt: item.requestedAt,
      }));
      // Client-side search filter
      const searched = searchTerm
        ? rows.filter((r) => {
            const q = searchTerm.toLowerCase();
            return (
              r.franchise?.name?.toLowerCase().includes(q) ||
              r.franchiseId?.toLowerCase().includes(q) ||
              r.program?.name?.toLowerCase().includes(q) ||
              r.franchisee?.name?.toLowerCase().includes(q) ||
              r.franchisee?.mail?.toLowerCase().includes(q)
            );
          })
        : rows;
      // Client-side sort
      const sorted = [...searched].sort((a, b) => {
        const aVal = String((a as unknown as Record<string, unknown>)[sortBy] ?? "");
        const bVal = String((b as unknown as Record<string, unknown>)[sortBy] ?? "");
        return sortOrder === "ASC"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
      // Client-side pagination
      const start = (currentPage - 1) * itemsPerPage;
      const page = sorted.slice(start, start + itemsPerPage);
      setRequests(page);
      setTotal(sorted.length);
      setTotalPages(Math.max(1, Math.ceil(sorted.length / itemsPerPage)));
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load program requests"));
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    itemsPerPage,
    searchTerm,
    statusFilter,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchData();
  }, [
    currentPage,
    itemsPerPage,
    searchTerm,
    statusFilter,
    sortBy,
    sortOrder,
    refreshTrigger,
    fetchData,
  ]);

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
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to reject"));
    } finally {
      setRejectingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
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
      render: (r) => r.program?.name ?? `#${r.programId}`,
    },
    {
      key: "requestDate",
      header: "Request Date",
      className: "text-center",
      render: (r) =>
        r.createdAt
          ? new Date(r.createdAt).toLocaleDateString()
          : "—",
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (r) => (
        <Badge className={`${getStatusColor(r.status)} border`}>
          {r.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
          {r.status === "Requested" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApprove(r)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReject(r)}
                disabled={rejectingId === r.id}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4" />
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
        { value: "Requested", label: "Requested" },
        { value: "TermsSet", label: "Terms Set" },
        { value: "PendingSignature", label: "Pending Signature" },
        { value: "Active", label: "Active" },
        { value: "Rejected", label: "Rejected" },
        { value: "Cancelled", label: "Cancelled" },
      ],
      defaultValue: "Requested",
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { value: "createdAt", label: "Date" },
  ];

  return (
    <>
    <DataTable
      data={requests}
      loading={loading}
      columns={columns}
      getRowId={(r) => r.id.toString()}
      renderMainCell={(r) => (
        <div className="flex flex-col">
          <div className="font-medium text-gray-900">
            {r.franchise?.name ?? r.franchiseId}
          </div>
          <div className="text-sm text-gray-500">
            {r.franchisee?.name || "Not specified"} •{" "}
            {r.franchisee?.mail || "—"}
          </div>
          <div className="text-xs text-blue-600 font-medium">
            ID: {r.id}
          </div>
        </div>
      )}
      renderExpandedContent={(r) => (
        <ProgramRequestDetails request={r} />
      )}
      searchPlaceholder="Search franchise, program, or franchisee..."
      onSearchChange={setSearchTerm}
      filters={filters}
      onFilterChange={(key, value) => {
        if (key === "status") setStatusFilter(value as string);
      }}
      sortOptions={sortOptions}
      defaultSortBy="createdAt"
      defaultSortOrder="DESC"
      onSortChange={(newSortBy, newSortOrder) => {
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
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

    <Dialog
      open={rejectDialog.open}
      onOpenChange={(open) => setRejectDialog((prev) => ({ ...prev, open }))}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Program Request</DialogTitle>
          <DialogDescription>
            Rejecting request for &ldquo;{rejectDialog.request?.program?.name}&rdquo;. Please provide a reason.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="reject-reason">Reason</Label>
          <Textarea
            id="reject-reason"
            placeholder="Enter rejection reason..."
            value={rejectDialog.reason}
            onChange={(e) =>
              setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))
            }
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setRejectDialog((prev) => ({ ...prev, open: false }))}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirmReject}
            disabled={!rejectDialog.reason.trim()}
          >
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
