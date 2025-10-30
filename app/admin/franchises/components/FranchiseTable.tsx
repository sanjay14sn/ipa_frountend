"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
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
import { FranchiseType, FranchiseStatus } from "@/services/franchise.enums";
import { getAllPrograms, Program } from "@/services/program.service";
import FranchiseDetails from "./FranchiseDetails";

interface FranchiseTableProps {
  onClientUpdate?: (updatedClient: FranchiseData) => void;
  refreshTrigger?: number;
}

export default function FranchiseTable({
  onClientUpdate,
  refreshTrigger,
}: FranchiseTableProps) {
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<FranchiseData[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [programs, setPrograms] = useState<Program[]>([]);

  // Filters & Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
        const result = await getPaginatedFranchises("all", {
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

        setClients(result.data);
        setTotalPages(result.meta.totalPages);
        setTotal(result.meta.total);
      } catch (error) {
        console.error("Error fetching franchises:", error);
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
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "inactive":
        return "bg-gray-100 text-gray-600 border-gray-200";
      case "suspended":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  // Table configuration
  const columns: AdminTableColumn<FranchiseData>[] = [
    {
      key: "franchise",
      header: "Franchise",
      className: "w-[300px]",
    },
    {
      key: "type",
      header: "Type",
      className: "text-center",
      render: (client) => client.type,
    },
    {
      key: "programs",
      header: "Programs",
      className: "text-center",
      render: (client) =>
        client.franchisePrograms?.map((fp) => fp.program.name).join(", ") ||
        "N/A",
    },
    {
      key: "createdDate",
      header: "Created Date",
      className: "text-center",
      render: (client) => new Date(client.createdAt).toLocaleDateString(),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (client) => (
        <Badge className={`${getStatusColor(client.status)} border`}>
          {client.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: () => (
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="sm">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Trash2 className="w-4 h-4" />
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
        { value: "all", label: "All" },
        { value: FranchiseStatus.ACTIVE, label: "Active" },
        { value: FranchiseStatus.INACTIVE, label: "Inactive" },
      ],
      defaultValue: "all",
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
      data={clients}
      loading={loading}
      columns={columns}
      getRowId={(client) => client.id.toString()}
      renderMainCell={(client) => (
        <div className="flex flex-col">
          <div className="font-medium text-gray-900">{client.name}</div>
          <div className="text-sm text-gray-500">
            {client.franchisee?.name || "Not specified"} •{" "}
            {client.franchisee?.city || "Not specified"}
          </div>
          <div className="text-xs text-green-600 font-medium">
            {client.franchisePayroll?.totalAmount
              ? `₹${(client.franchisePayroll.totalAmount / 1000).toFixed(
                  0
                )}K/mo`
              : "N/A"}
          </div>
        </div>
      )}
      renderExpandedContent={(client) => (
        <FranchiseDetails
          client={client}
          lastRow={false}
          expandedRows={expandedChildren}
          onToggleRow={toggleRow}
          onClientUpdate={onClientUpdate}
        />
      )}
      searchPlaceholder="Search franchises, franchisees, or cities..."
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
      emptyMessage="No franchises found matching your criteria"
      resultsText={(count, total) => {
        const filtered =
          searchTerm ||
          statusFilter !== "all" ||
          typeFilter !== "all" ||
          selectedPrograms.length > 0
            ? " (filtered)"
            : "";
        return `Showing ${count} of ${total} franchises${filtered}`;
      }}
    />
  );
}
