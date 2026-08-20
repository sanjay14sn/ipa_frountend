"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type DataTableFilter,
  type DataTableMultiSelectFilter,
  type DataTableSortOption,
} from "@/components/shared";
import { ConfirmDialog } from "@/components/shared/dialog";
import { useUser } from "@/context/user-context";
import { FranchiseType } from "@/services/franchise.enums";
import {
  useDeleteFranchiseAdmin,
  usePaginatedFranchiseApplicationsAdmin,
} from "@/hooks/api/franchisee.hooks";
import { type FranchiseData } from "@/services/franchisee.service";
import { FranchiseHubTable } from "./FranchiseHubTable";
import { useListParams } from "@/hooks/use-list-params";

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
  // List state lives in the URL (SW-P10); "apps" prefix keeps the keys clear
  // of the franchises tab's list on the same hub URL.
  const urlParams = useListParams({
    filterDefaults: { status: "all", type: "all" },
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    prefix: "apps",
  });
  const currentPage = urlParams.page;
  const searchTerm = urlParams.search;
  const statusFilter = urlParams.filters.status;
  const typeFilter = urlParams.filters.type;
  const sortBy = urlParams.sortBy ?? "createdAt";
  const sortOrder = (urlParams.sortOrder === "asc" ? "ASC" : "DESC") as
    | "ASC"
    | "DESC";
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

  const { user } = useUser();
  const isSuperAdmin = user?.role === "admin" && user.adminRole === "super";
  const [deleteTarget, setDeleteTarget] = useState<FranchiseData | null>(null);
  const deleteMutation = useDeleteFranchiseAdmin();

  const handleDeleteApplication = async () => {
    if (!deleteTarget) return;
    try {
      const result = await deleteMutation.mutateAsync(String(deleteTarget.id));
      toast.success(
        result.franchiseeRemoved
          ? `Application "${deleteTarget.name}" deleted along with the applicant's portal login.`
          : `Application "${deleteTarget.name}" deleted.`,
      );
    } catch {
      /* the global mutation error toast reports the reason */
    } finally {
      setDeleteTarget(null);
    }
  };

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
    <>
    <FranchiseHubTable
      variant="applications"
      data={franchisePage?.data ?? []}
      loading={loading}
      pagination={{ total, totalPages }}
      currentPage={currentPage}
      onPageChange={urlParams.setPage}
      itemsPerPage={itemsPerPage}
      searchPlaceholder="Search applications, franchisees, or cities..."
      onSearchChange={urlParams.setSearch}
      filters={filters}
      multiSelectFilters={multiSelectFilters}
      onFilterChange={(key, value) => {
        if (key === "status" || key === "type") {
          urlParams.setFilter(key, value as string);
        }
      }}
      sortOptions={sortOptions}
      defaultSortBy="createdAt"
      defaultSortOrder="DESC"
      onSortChange={(newSortBy, newSortOrder) => {
        urlParams.setSort(newSortBy, newSortOrder === "ASC" ? "asc" : "desc");
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
      onDeleteFranchise={isSuperAdmin ? setDeleteTarget : undefined}
      disableApproveActions={disableApproveActions}
    />
    <ConfirmDialog
      open={deleteTarget != null}
      onOpenChange={(open) => {
        if (!open) setDeleteTarget(null);
      }}
      variant="destructive"
      title="Delete franchise application?"
      description={
        deleteTarget
          ? `This will permanently delete the application "${deleteTarget.name}", its draft agreement terms — and the applicant's portal login if they hold no other franchise. This action is not recoverable.`
          : ""
      }
      confirmLabel="Delete application"
      isConfirming={deleteMutation.isPending}
      onConfirm={handleDeleteApplication}
    />
    </>
  );
}

