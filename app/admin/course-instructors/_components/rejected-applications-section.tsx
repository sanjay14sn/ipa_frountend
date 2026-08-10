"use client";

import { useMemo } from "react";
import {
  DataTable,
  TableMainCell,
  TablePageShell,
  TableSectionSurface,
  type DataTableColumn,
  type DataTableFilter,
  type DataTableSortOption,
} from "@/components/shared";
import { useAdminCIListByStatus } from "@/hooks/api/course-instructor.hooks";
import { useFranchiseOptions } from "@/hooks/api/franchisee.hooks";
import { useListParams } from "@/hooks/use-list-params";
import { formatDate } from "@/lib/date-utils";
import type { AdminCourseInstructorData } from "@/services/course-instructor.service";
import CourseInstructorDetails from "./approvals/CourseInstructorDetails";

const ITEMS_PER_PAGE = 10;

/**
 * Rejected tab: read-only history of rejected CI applications (rejection is
 * final — no un-reject route exists). Same toolbar contract as the other CI
 * tabs: search + franchise filter + sort, all server-side. List state lives
 * in the URL under the `rej.` prefix.
 */
export function RejectedApplicationsSection() {
  const listParams = useListParams({
    filterDefaults: { franchise: "all" },
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    prefix: "rej",
  });
  const sortBy = listParams.sortBy ?? "createdAt";
  const sortOrder: "ASC" | "DESC" =
    listParams.sortOrder === "asc" ? "ASC" : "DESC";
  const franchiseFilter = listParams.filters.franchise;

  const listQuery = useAdminCIListByStatus("Rejected", {
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
      // Rejection is the terminal write on these rows, so the row's last
      // update is when the rejection happened.
      key: "rejected",
      header: "Rejected",
      render: (ci) => (ci.updatedAt ? formatDate(ci.updatedAt) : "—"),
    },
  ];

  return (
    <TablePageShell embed>
      <TableSectionSurface>
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
              showActions={false}
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
          errorMessage="Couldn't load rejected applications."
          emptyState={{
            title: "No rejected applications",
            hint: "Applications rejected from the Applications tab appear here.",
          }}
          resultsText={(count, total) =>
            `Showing ${count} of ${total} rejected application${total !== 1 ? "s" : ""}`
          }
        />
      </TableSectionSurface>
    </TablePageShell>
  );
}
