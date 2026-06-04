"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  type DataTableFilter,
  type DataTableSortOption,
} from "@/components/shared";
import { usePaginatedFranchisesAdmin } from "@/hooks/api/franchisee.hooks";
import { FranchiseHubTable } from "./FranchiseHubTable";

interface FranchiseTableProps {
  refreshTrigger?: number;
}

export default function FranchiseTable({
  refreshTrigger,
}: FranchiseTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const itemsPerPage = 10;

  const listParams = useMemo(
    () => ({
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,
    }),
    [
      currentPage,
      itemsPerPage,
      searchTerm,
      sortBy,
      sortOrder,
      statusFilter,
      typeFilter,
    ],
  );

  const {
    data: pageData,
    isLoading: loading,
    refetch: refetchRows,
  } = usePaginatedFranchisesAdmin(listParams);

  const totalPages = pageData?.meta.totalPages ?? 0;
  const total = pageData?.meta.total ?? 0;

  useEffect(() => {
    void refetchRows();
  }, [refreshTrigger, refetchRows]);

  const filters: DataTableFilter[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        // Operational states (Active/Suspended/Inactive) are no longer stored
        // statuses — they're derived from agreements. The franchises tab lists
        // approved franchises; their operational standing shows as the
        // valid-agreement count in the Status column.
        options: [
          { value: "all", label: "All statuses" },
          { value: "Approved", label: "Approved" },
        ],
        defaultValue: "all",
      },
      {
        key: "type",
        label: "Type",
        options: [
          { value: "all", label: "All types" },
          { value: "Area", label: "Area" },
          { value: "Master", label: "Master" },
          { value: "School", label: "School" },
          { value: "Regular", label: "Regular" },
        ],
        defaultValue: "all",
      },
    ],
    [],
  );

  const handleFilterChange = (key: string, value: string | string[]) => {
    const nextValue = Array.isArray(value) ? (value[0] ?? "all") : value;
    if (key === "status") setStatusFilter(nextValue || "all");
    if (key === "type") setTypeFilter(nextValue || "all");
    setCurrentPage(1);
  };

  const sortOptions: DataTableSortOption[] = [
    { value: "name", label: "Name" },
    { value: "createdAt", label: "Date" },
  ];

  return (
    <FranchiseHubTable
      variant="franchises"
      data={pageData?.data ?? []}
      loading={loading}
      pagination={{ total, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={itemsPerPage}
      searchPlaceholder="Search franchises by name, city, or state..."
      onSearchChange={(value) => {
        setSearchTerm(value);
        setCurrentPage(1);
      }}
      filters={filters}
      onFilterChange={handleFilterChange}
      sortOptions={sortOptions}
      defaultSortBy="createdAt"
      defaultSortOrder="DESC"
      onSortChange={(newSortBy, newSortOrder) => {
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
        setCurrentPage(1);
      }}
      emptyMessage="No franchises found matching your criteria"
      resultsText={(count, totalCount) => {
        const filtered =
          searchTerm || statusFilter !== "all" || typeFilter !== "all"
            ? " (filtered)"
            : "";
        return `Showing ${count} of ${totalCount} franchises${filtered}`;
      }}
    />
  );
}
