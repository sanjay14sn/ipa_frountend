"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  TableMainCell,
  type DataTableColumn,
  type DataTableFilter,
  type DataTableSortOption,
} from "@/components/shared";
import { useAdminCIListByStatus } from "@/hooks/api/course-instructor.hooks";
import { useFranchiseOptions } from "@/hooks/api/franchisee.hooks";
import { useListParams } from "@/hooks/use-list-params";
import { formatDate } from "@/lib/date-utils";
import type { AdminCourseInstructorData } from "@/services/course-instructor.service";
import CourseInstructorDetails from "./CourseInstructorDetails";

const ITEMS_PER_PAGE = 10;

interface PendingApplicationsTableProps {
  onApprove: (instructor: AdminCourseInstructorData) => void;
  onReject: (instructor: AdminCourseInstructorData) => void;
}

/**
 * Applications tab: a flat list of pending CI applications only (approved CIs
 * live in the Active CIs tab, rejected ones in the Rejected tab). Franchise
 * scoping is a toolbar filter rather than grouping; all filtering/sorting is
 * server-side. List state lives in the URL under the `apps.` prefix so it
 * coexists with ?tab= and the other tabs' lists.
 */
export default function PendingApplicationsTable({
  onApprove,
  onReject,
}: PendingApplicationsTableProps) {
  const listParams = useListParams({
    filterDefaults: { franchise: "all" },
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    prefix: "apps",
  });
  const sortBy = listParams.sortBy ?? "createdAt";
  const sortOrder: "ASC" | "DESC" =
    listParams.sortOrder === "asc" ? "ASC" : "DESC";
  const franchiseFilter = listParams.filters.franchise;

  const listQuery = useAdminCIListByStatus("Pending", {
    page: listParams.page,
    limit: ITEMS_PER_PAGE,
    search: listParams.search || undefined,
    franchiseId: franchiseFilter !== "all" ? franchiseFilter : undefined,
    sortBy,
    sortOrder,
  });
  const instructors = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;

  const franchiseOptions = useFranchiseOptions();
  const filters: DataTableFilter[] = useMemo(
    () => [
      {
        key: "franchise",
        label: "Franchise",
        options: [
          { value: "all", label: "All franchises" },
          ...(franchiseOptions.data ?? []),
        ],
        defaultValue: franchiseFilter,
      },
    ],
    [franchiseOptions.data, franchiseFilter],
  );

  const sortOptions: DataTableSortOption[] = [
    { value: "name", label: "Name" },
    { value: "createdAt", label: "Date" },
  ];

  const columns: DataTableColumn<AdminCourseInstructorData>[] = [
    {
      key: "instructor",
      header: "Instructor",
      className: "w-[260px]",
    },
    {
      key: "franchise",
      header: "Franchise",
      render: (ci) => ci.franchise?.name || "—",
    },
    {
      key: "city",
      header: "City",
      render: (ci) => ci.city || "—",
    },
    {
      key: "applied",
      header: "Applied",
      render: (ci) => (ci.createdAt ? formatDate(ci.createdAt) : "—"),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[96px] text-center",
      render: (ci) => (
        <div className="flex w-full items-center justify-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onApprove(ci)}
            title="Approve"
            aria-label="Approve"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onReject(ci)}
            title="Reject"
            aria-label="Reject"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={instructors}
      loading={listQuery.isLoading}
      columns={columns}
      getRowId={(ci) => ci.id.toString()}
      renderMainCell={(ci) => (
        <TableMainCell title={ci.name} subtitle={ci.instructorId} />
      )}
      renderExpandedContent={(ci) => (
        <CourseInstructorDetails
          instructors={[ci]}
          lastRow={false}
          expandedRows={new Set([ci.id.toString()])}
          onToggleRow={() => {}}
          onApprove={onApprove}
          onReject={onReject}
          showActions
        />
      )}
      initialSearchValue={listParams.search}
      searchPlaceholder="Search instructors or instructor IDs..."
      onSearchChange={listParams.setSearch}
      filters={filters}
      onFilterChange={(key, value) => {
        if (key === "franchise") {
          const next = Array.isArray(value) ? (value[0] ?? "all") : value;
          listParams.setFilter("franchise", next || "all");
        }
      }}
      sortOptions={sortOptions}
      defaultSortBy={sortBy}
      defaultSortOrder={sortOrder}
      onSortChange={(by, order) => {
        listParams.setSort(by, order === "ASC" ? "asc" : "desc");
      }}
      pagination={
        meta
          ? { total: meta.total, totalPages: meta.totalPages ?? 1 }
          : undefined
      }
      currentPage={listParams.page}
      onPageChange={listParams.setPage}
      itemsPerPage={ITEMS_PER_PAGE}
      error={listQuery.error}
      onRetry={() => void listQuery.refetch()}
      errorMessage="Couldn't load pending applications."
      emptyState={{
        title: "No pending applications",
        hint: "New instructor applications appear here for review.",
      }}
      resultsText={(count, total) =>
        `Showing ${count} of ${total} pending application${total !== 1 ? "s" : ""}`
      }
    />
  );
}
