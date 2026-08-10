"use client";

import React, { useMemo, useState } from "react";
import { StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { DataTable, TableMainCell } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableSortOption,
} from "@/components/shared";
import { AdminCourseInstructorData } from "@/services/course-instructor.service";
import { useAdminCIListByStatus } from "@/hooks/api/course-instructor.hooks";
import { useFranchiseOptions } from "@/hooks/api/franchisee.hooks";
import { useListParams } from "@/hooks/use-list-params";
import CourseInstructorDetails from "./CourseInstructorDetails";
import { BarChart2, FileText } from "lucide-react";
import { AdminCIAgreementSheet } from "@/components/agreements/AdminCIAgreementSheet";
import { TrainingProgressModal } from "@/components/ci-training/TrainingProgressModal";

const ITEMS_PER_PAGE = 10;

export default function ActiveCourseInstructorsTable() {
  const [agreementInstructor, setAgreementInstructor] = useState<{
    id: number;
    name?: string;
    programId?: number;
  } | null>(null);
  const [progressModal, setProgressModal] = useState<{ id: number; name: string; programId: number } | null>(null);

  // List state lives in the URL; "active" prefix keeps the keys clear of the
  // other tabs' lists on the same hub URL.
  const listParams = useListParams({
    filterDefaults: { franchise: "all" },
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    prefix: "active",
  });
  const sortBy = listParams.sortBy ?? "createdAt";
  const sortOrder: "ASC" | "DESC" =
    listParams.sortOrder === "asc" ? "ASC" : "DESC";
  const franchiseFilter = listParams.filters.franchise;

  // "valid" = derived operational filter (latest CI agreement is Valid).
  const listQuery = useAdminCIListByStatus("valid", {
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

  const columns: DataTableColumn<AdminCourseInstructorData>[] = [
    {
      key: "instructor",
      header: "Instructor",
    },
    {
      key: "franchise",
      header: "Franchise",
      render: (instructor) => instructor.franchise?.name || "—",
    },
    {
      key: "contact",
      header: "Contact",
      render: (instructor) => (
        <div className="flex flex-col text-xs">
          <span>{instructor.phone || "—"}</span>
          <span className="text-muted-foreground">{instructor.mail || "—"}</span>
        </div>
      ),
    },
    {
      key: "city",
      header: "City",
      render: (instructor) => instructor.city || "—",
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (instructor) => (
        <StatusBadge label={instructor.operationalStatus ?? "valid"} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[100px]",
      render: (instructor) => (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="View training progress"
            aria-label="View training progress"
            onClick={() =>
              setProgressModal({
                id: instructor.id,
                name: instructor.name,
                programId: instructor.programId,
              })
            }
          >
            <BarChart2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="View CI agreement"
            aria-label="View CI agreement"
            onClick={() =>
              setAgreementInstructor({
                id: instructor.id,
                name: instructor.name,
                programId: instructor.programId,
              })
            }
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { value: "name", label: "Name" },
    { value: "createdAt", label: "Date" },
  ];

  return (
    <>
      <DataTable
        data={instructors}
        loading={listQuery.isLoading}
        columns={columns}
        getRowId={(instructor) => instructor.id.toString()}
        renderMainCell={(instructor) => (
          <TableMainCell title={instructor.name} subtitle={instructor.instructorId} />
        )}
        renderExpandedContent={(instructor) => (
          <CourseInstructorDetails
            instructors={[instructor]}
            lastRow={false}
            expandedRows={new Set([instructor.id.toString()])}
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
        errorMessage="Couldn't load active instructors."
        emptyState={{
          title: "No active instructors",
          hint: "Instructors appear here once their CI agreement is in force.",
        }}
        resultsText={(count, pageTotal) =>
          `Showing ${count} of ${pageTotal} active instructor${pageTotal !== 1 ? "s" : ""}`
        }
      />

      <AdminCIAgreementSheet
        instructor={agreementInstructor}
        onClose={() => setAgreementInstructor(null)}
      />

      {progressModal && (
        <TrainingProgressModal
          audience="admin"
          isOpen={true}
          onClose={() => setProgressModal(null)}
          instructorId={progressModal.id}
          instructorName={progressModal.name}
        />
      )}
    </>
  );
}
