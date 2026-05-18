"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Pending");
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
        const aVal = a.createdAt ?? "";
        const bVal = b.createdAt ?? "";
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

  const handleReject = async (request: ProgramRequestRow) => {
    if (!confirm(`Reject program request for "${request.program?.name}"?`))
      return;
    setRejectingId(request.id);
    try {
      await rejectProgramRequestAdmin(request.id, '');
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
          {r.status === "Pending" && (
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
        { value: "Pending", label: "Pending" },
        { value: "Approved", label: "Approved" },
        { value: "Rejected", label: "Rejected" },
      ],
      defaultValue: "Pending",
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { value: "createdAt", label: "Date" },
  ];

  return (
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
  );
}
