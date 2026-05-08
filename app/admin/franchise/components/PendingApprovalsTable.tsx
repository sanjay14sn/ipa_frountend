"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type DataTableFilter,
  type DataTableMultiSelectFilter,
  type DataTableSortOption,
} from "@/components/shared";
import { FranchiseType } from "@/services/franchise.enums";
import { usePaginatedFranchiseApplicationsAdmin } from "@/hooks/api/franchisee.hooks";
import { type FranchiseData } from "@/services/franchisee.service";
import { FranchiseHubTable } from "@/app/admin/franchises/components/FranchiseHubTable";

interface PendingApprovalsTableProps {
  onApprove?: (application: FranchiseData) => void;
  onReject?: (application: FranchiseData) => void;
  refreshTrigger?: number;
  disableApproveActions?: boolean;
}

export default function PendingApprovalsTable({
  onApprove,
  onReject,
  refreshTrigger,
  disableApproveActions,
}: PendingApprovalsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const itemsPerPage = 10;


  const listParams = useMemo(
    () => ({
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,

      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
    }),
    [
      currentPage,
      itemsPerPage,
      searchTerm,
      statusFilter,
      typeFilter,

      sortBy,
      sortOrder,
    ],
  );

  const {
    data: franchisePage,
    isLoading: loading,
    refetch: refetchApplications,
  } = usePaginatedFranchiseApplicationsAdmin(listParams);

  const totalPages = franchisePage?.meta.totalPages ?? 0;
  const total = franchisePage?.meta.total ?? 0;

  useEffect(() => {
    void refetchApplications();
  }, [refreshTrigger, refetchApplications]);

  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All statuses" },
        { value: "Pending", label: "Pending" },
        { value: "Rejected", label: "Rejected" },
      ],
      defaultValue: "all",
    },
    {
      key: "type",
      label: "Type",
      options: [
        { value: "all", label: "All types" },
        ...Object.values(FranchiseType).map((type) => ({
          value: type,
          label: type,
        })),
      ],
      defaultValue: "all",
    },
  ];

  const multiSelectFilters: DataTableMultiSelectFilter[] = [];

  const sortOptions: DataTableSortOption[] = [
    { value: "name", label: "Name" },
    { value: "createdAt", label: "Date" },
  ];

  return (
    <FranchiseHubTable
      variant="applications"
      data={franchisePage?.data ?? []}
      loading={loading}
      pagination={{ total, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={itemsPerPage}
      searchPlaceholder="Search applications, franchisees, or cities..."
      onSearchChange={(value) => {
        setSearchTerm(value);
        setCurrentPage(1);
      }}
      filters={filters}
      multiSelectFilters={multiSelectFilters}
      onFilterChange={(key, value) => {
        if (key === "status") setStatusFilter(value as string);
        if (key === "type") setTypeFilter(value as string);

        setCurrentPage(1);
      }}
      sortOptions={sortOptions}
      defaultSortBy="createdAt"
      defaultSortOrder="DESC"
      onSortChange={(newSortBy, newSortOrder) => {
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
        setCurrentPage(1);
      }}
      emptyMessage="No applications found matching your criteria"
      resultsText={(count, totalCount) => {
        const filtered =
          searchTerm || typeFilter !== "all" || statusFilter !== "all"
            ? " (filtered)"
            : "";
        return `Showing ${count} of ${totalCount} applications${filtered}`;
      }}
      onApprove={onApprove}
      onReject={onReject}
      disableApproveActions={disableApproveActions}
    />
  );
}

