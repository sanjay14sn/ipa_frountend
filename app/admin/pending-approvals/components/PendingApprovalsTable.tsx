"use client";

import { useState, useEffect, Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Edit } from "lucide-react";
import { AdminTable } from "@/components/shared";
import type {
  AdminTableColumn,
  AdminTableFilter,
  AdminTableSortOption,
  AdminTableMultiSelectFilter,
} from "@/components/shared/AdminTable";
import {
  FranchiseData,
  getPaginatedFranchises,
} from "@/services/franchisee.service";
import { FranchiseType } from "@/services/franchise.enums";
import { getAllPrograms, Program } from "@/services/program.service";
import PendingFranchiseDetails from "./PendingFranchiseDetails";

interface PendingApprovalsTableProps {
  onApprove?: (application: FranchiseData) => void;
  onReject?: (application: FranchiseData) => void;
  refreshTrigger?: number;
}

export default function PendingApprovalsTable({
  onApprove,
  onReject,
  refreshTrigger,
}: PendingApprovalsTableProps) {
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<FranchiseData[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [programs, setPrograms] = useState<Program[]>([]);

  // Filters & Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const itemsPerPage = 10;

  // Fetch programs on mount
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const programsData = await getAllPrograms();
        setPrograms(programsData);
      } catch (error) {
        console.error("Error fetching programs:", error);
      }
    };

    fetchPrograms();
  }, []);

  // Fetch data from backend with pagination and filters
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await getPaginatedFranchises("Pending", {
          page: currentPage,
          limit: itemsPerPage,
          search: searchTerm || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          type: typeFilter !== "all" ? typeFilter : undefined,
          program:
            selectedPrograms.length > 0
              ? selectedPrograms.join(",")
              : undefined,
          sortBy: sortBy || undefined,
          sortOrder: sortOrder || undefined,
        });

        setApplications(result.data);
        setTotalPages(result.meta.totalPages);
        setTotal(result.meta.total);
      } catch (error) {
        console.error("Error fetching applications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    currentPage,
    itemsPerPage,
    searchTerm,
    statusFilter,
    typeFilter,
    selectedPrograms,
    sortBy,
    sortOrder,
    refreshTrigger,
  ]);

  const toggleRow = (id: string) => {
    if (id.includes("-")) {
      const newExpandedChildren = new Set(expandedChildren);
      if (newExpandedChildren.has(id)) {
        newExpandedChildren.delete(id);
      } else {
        newExpandedChildren.add(id);
      }
      setExpandedChildren(newExpandedChildren);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
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

  // Table configuration
  const columns: AdminTableColumn<FranchiseData>[] = [
    {
      key: "application",
      header: "Application",
      className: "w-[300px]",
    },
    {
      key: "type",
      header: "Type",
      className: "text-center",
      render: (application) => application.type,
    },
    {
      key: "programs",
      header: "Programs",
      className: "text-center",
      render: (application) =>
        application.franchisePrograms
          ?.map((fp) => fp.program.name)
          .join(", ") || "N/A",
    },
    {
      key: "applicationDate",
      header: "Application Date",
      className: "text-center",
      render: (application) =>
        new Date(application.createdAt).toLocaleDateString(),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (application) => (
        <Badge className={`${getStatusColor(application.status)} border`}>
          {application.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (application) => (
        <div className="flex items-center justify-center gap-1">
          {application.status === "Pending" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onApprove?.(application)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReject?.(application)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm">
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const filters: AdminTableFilter[] = [
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
    {
      key: "type",
      label: "Type",
      options: [
        { value: "all", label: "All Types" },
        ...Object.values(FranchiseType).map((type) => ({
          value: type,
          label: type,
        })),
      ],
      defaultValue: "all",
    },
  ];

  const multiSelectFilters: AdminTableMultiSelectFilter[] = [
    {
      key: "programs",
      label: "Programs",
      placeholder: "All Programs",
      options: programs.map((p) => ({ value: p.name, label: p.name })),
    },
  ];

  const sortOptions: AdminTableSortOption[] = [
    { value: "name", label: "Name" },
    { value: "createdAt", label: "Date" },
  ];

  return (
    <AdminTable
      data={applications}
      loading={loading}
      columns={columns}
      getRowId={(application) => application.id.toString()}
      renderMainCell={(application) => (
        <div className="flex flex-col">
          <div className="font-medium text-gray-900">{application.name}</div>
          <div className="text-sm text-gray-500">
            {application.franchisee?.name || "Not specified"} •{" "}
            {application.franchisee?.city || "Not specified"}
          </div>
          <div className="text-xs text-blue-600 font-medium">
            ID: {application.id}
          </div>
        </div>
      )}
      renderExpandedContent={(application) => (
        <PendingFranchiseDetails
          application={application}
          expandedRows={expandedChildren}
          onToggleRow={toggleRow}
        />
      )}
      searchPlaceholder="Search applications, franchisees, or cities..."
      onSearchChange={setSearchTerm}
      filters={filters}
      multiSelectFilters={multiSelectFilters}
      onFilterChange={(key, value) => {
        if (key === "status") setStatusFilter(value as string);
        else if (key === "type") setTypeFilter(value as string);
        else if (key === "programs") setSelectedPrograms(value as string[]);
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
      emptyMessage="No applications found matching your criteria"
      resultsText={(count, total) => {
        const filtered =
          searchTerm || typeFilter !== "all" || selectedPrograms.length > 0
            ? " (filtered)"
            : "";
        return `Showing ${count} of ${total} applications${filtered}`;
      }}
    />
  );
}
