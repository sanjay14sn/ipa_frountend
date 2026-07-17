"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type DataTableFilter,
  type DataTableSortOption,
} from "@/components/shared";
import { ConfirmDialog } from "@/components/shared/dialog";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  resendFranchiseeCredentials,
  type FranchiseData,
} from "@/services/franchisee.service";
import { usePaginatedFranchisesAdmin } from "@/hooks/api/franchisee.hooks";
import { FranchiseHubTable } from "./FranchiseHubTable";
import { EditFranchiseDialog } from "./edit-franchise-dialog";
import { EditFranchiseeDialog } from "./edit-franchisee-dialog";
import { useListParams } from "@/hooks/use-list-params";

interface FranchiseTableProps {
  refreshTrigger?: number;
}

export default function FranchiseTable({
  refreshTrigger,
}: FranchiseTableProps) {
  // List state lives in the URL (SW-P10); "fr" prefix keeps the keys clear
  // of the applications tab's list on the same hub URL.
  const urlParams = useListParams({
    filterDefaults: { status: "all", type: "all" },
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    prefix: "fr",
  });
  const currentPage = urlParams.page;
  const searchTerm = urlParams.search;
  const sortBy = urlParams.sortBy ?? "createdAt";
  const sortOrder = (urlParams.sortOrder === "asc" ? "ASC" : "DESC") as
    | "ASC"
    | "DESC";
  const statusFilter = urlParams.filters.status;
  const typeFilter = urlParams.filters.type;
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

  const [resendTarget, setResendTarget] = useState<FranchiseData | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [editFranchiseTarget, setEditFranchiseTarget] =
    useState<FranchiseData | null>(null);
  const [editFranchiseeTarget, setEditFranchiseeTarget] =
    useState<FranchiseData | null>(null);

  const handleConfirmResend = async () => {
    if (!resendTarget) return;
    setIsResending(true);
    try {
      await resendFranchiseeCredentials(String(resendTarget.id));
      toast.success("Credentials regenerated and emailed to the franchisee.");
      setResendTarget(null);
    } catch (error) {
      toast.error(
        getUserFriendlyMessage(error, "Failed to resend credentials."),
      );
    } finally {
      setIsResending(false);
    }
  };

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
    if (key === "status") urlParams.setFilter("status", nextValue || "all");
    if (key === "type") urlParams.setFilter("type", nextValue || "all");
  };

  const sortOptions: DataTableSortOption[] = [
    { value: "name", label: "Name" },
    { value: "createdAt", label: "Date" },
  ];

  return (
    <>
      <ConfirmDialog
        open={resendTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isResending) setResendTarget(null);
        }}
        title="Resend franchisee credentials?"
        description={`This generates a new temporary password for ${
          resendTarget?.name ?? "this franchise"
        }'s owner and emails it to them. Their current password stops working.`}
        confirmLabel="Resend credentials"
        onConfirm={handleConfirmResend}
        isConfirming={isResending}
      />
      <FranchiseHubTable
        variant="franchises"
        data={pageData?.data ?? []}
        loading={loading}
        pagination={{ total, totalPages }}
        currentPage={currentPage}
        onPageChange={urlParams.setPage}
        itemsPerPage={itemsPerPage}
        searchPlaceholder="Search franchises by name, city, or state..."
        onSearchChange={urlParams.setSearch}
        filters={filters}
        onFilterChange={handleFilterChange}
        sortOptions={sortOptions}
        defaultSortBy="createdAt"
        defaultSortOrder="DESC"
        onSortChange={(newSortBy, newSortOrder) => {
          urlParams.setSort(newSortBy, newSortOrder === "ASC" ? "asc" : "desc");
        }}
        emptyMessage="No franchises found matching your criteria"
        resultsText={(count, totalCount) => {
          const filtered =
            searchTerm || statusFilter !== "all" || typeFilter !== "all"
              ? " (filtered)"
              : "";
          return `Showing ${count} of ${totalCount} franchises${filtered}`;
        }}
        onResendCredentials={setResendTarget}
        onEditFranchise={setEditFranchiseTarget}
        onEditFranchisee={setEditFranchiseeTarget}
      />
      <EditFranchiseDialog
        franchise={editFranchiseTarget}
        open={editFranchiseTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditFranchiseTarget(null);
        }}
      />
      <EditFranchiseeDialog
        franchisee={editFranchiseeTarget?.franchisee ?? null}
        open={editFranchiseeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditFranchiseeTarget(null);
        }}
      />
    </>
  );
}
