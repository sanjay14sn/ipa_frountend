"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import {
  type DataTableFilter,
  type DataTableSortOption,
} from "@/components/shared";
import { SetPasswordDialog } from "@/components/shared/set-password-dialog";
import { Button } from "@/components/ui/button";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  exportFranchisesCsv,
  resendFranchiseeCredentials,
  type FranchiseData,
} from "@/services/franchisee.service";
import { usePaginatedFranchisesAdmin } from "@/hooks/api/franchisee.hooks";
import { usePrograms } from "@/hooks/api/program.hooks";
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
    filterDefaults: { status: "all", type: "all", program: "all", active: "all" },
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
  const programFilter = urlParams.filters.program;
  const activeFilter = urlParams.filters.active;
  const itemsPerPage = 10;

  const { programs } = usePrograms();

  const listParams = useMemo(
    () => ({
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,
      programId: programFilter !== "all" ? Number(programFilter) : undefined,
      hasActiveAgreement:
        activeFilter !== "all" ? (activeFilter as "yes" | "no") : undefined,
    }),
    [
      currentPage,
      itemsPerPage,
      searchTerm,
      sortBy,
      sortOrder,
      statusFilter,
      typeFilter,
      programFilter,
      activeFilter,
    ],
  );

  const {
    data: pageData,
    isLoading: loading,
    refetch: refetchRows,
  } = usePaginatedFranchisesAdmin(listParams);

  const [resendTarget, setResendTarget] = useState<FranchiseData | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editFranchiseTarget, setEditFranchiseTarget] =
    useState<FranchiseData | null>(null);
  const [editFranchiseeTarget, setEditFranchiseeTarget] =
    useState<FranchiseData | null>(null);

  // Same filters/search/sort as the table, no page/limit — the backend
  // returns every matching row, not just the visible page.
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await exportFranchisesCsv({
        search: searchTerm || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        programId: programFilter !== "all" ? Number(programFilter) : undefined,
        hasActiveAgreement:
          activeFilter !== "all" ? (activeFilter as "yes" | "no") : undefined,
      });
    } catch (error) {
      toast.error(getUserFriendlyMessage(error, "Failed to export CSV."));
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmResend = async (password: string) => {
    if (!resendTarget) return;
    setIsResending(true);
    try {
      await resendFranchiseeCredentials(String(resendTarget.id), password);
      toast.success("New password set and emailed to the franchisee.");
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

  // defaultValue is the live URL-derived value (not a hardcoded "all"):
  // DataTable seeds its internal filter state once from defaultValue, so a
  // URL-restored filter must arrive with the right value or the dropdown
  // label goes stale.
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
        defaultValue: statusFilter,
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
        defaultValue: typeFilter,
      },
      {
        key: "program",
        label: "Program",
        options: [
          { value: "all", label: "All programs" },
          ...programs.map((p) => ({ value: String(p.id), label: p.name })),
        ],
        defaultValue: programFilter,
      },
      {
        key: "active",
        label: "Agreements",
        options: [
          { value: "all", label: "All agreements" },
          { value: "yes", label: "Has active agreement" },
          { value: "no", label: "No active agreement" },
        ],
        defaultValue: activeFilter,
      },
    ],
    [statusFilter, typeFilter, programFilter, activeFilter, programs],
  );

  const handleFilterChange = (key: string, value: string | string[]) => {
    const nextValue = Array.isArray(value) ? (value[0] ?? "all") : value;
    if (key === "status") urlParams.setFilter("status", nextValue || "all");
    if (key === "type") urlParams.setFilter("type", nextValue || "all");
    if (key === "program") urlParams.setFilter("program", nextValue || "all");
    if (key === "active") urlParams.setFilter("active", nextValue || "all");
  };

  const sortOptions: DataTableSortOption[] = [
    { value: "name", label: "Name" },
    { value: "createdAt", label: "Date" },
  ];

  return (
    <>
      <SetPasswordDialog
        open={resendTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isResending) setResendTarget(null);
        }}
        title="Resend franchisee credentials"
        description={`Set a new portal password for ${
          resendTarget?.name ?? "this franchise"
        }'s owner and email it to them. Their current password stops working.`}
        submitLabel="Set password and email"
        onSubmit={handleConfirmResend}
        isSubmitting={isResending}
        formId="franchisee-resend-credentials"
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
        toolbarActions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleExportCsv()}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export CSV
          </Button>
        }
        emptyMessage="No franchises found matching your criteria"
        resultsText={(count, totalCount) => {
          const filtered =
            searchTerm ||
            statusFilter !== "all" ||
            typeFilter !== "all" ||
            programFilter !== "all" ||
            activeFilter !== "all"
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
        agreements={editFranchiseTarget?.agreements ?? null}
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
