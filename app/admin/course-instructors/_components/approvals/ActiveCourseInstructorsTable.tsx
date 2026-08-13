"use client";

import React, { useMemo, useState } from "react";
import { StatusBadge } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, TableMainCell } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableSortOption,
} from "@/components/shared";
import {
  AdminCourseInstructorData,
  exportCourseInstructorsCsv,
} from "@/services/course-instructor.service";
import { useAdminCIListByStatus } from "@/hooks/api/course-instructor.hooks";
import { useFranchiseOptions } from "@/hooks/api/franchisee.hooks";
import { usePrograms } from "@/hooks/api/program.hooks";
import { useListParams } from "@/hooks/use-list-params";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import CourseInstructorDetails from "./CourseInstructorDetails";
import { BarChart2, Download, FileText, Loader2 } from "lucide-react";
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
    filterDefaults: { franchise: "all", program: "all" },
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    prefix: "active",
  });
  const sortBy = listParams.sortBy ?? "createdAt";
  const sortOrder: "ASC" | "DESC" =
    listParams.sortOrder === "asc" ? "ASC" : "DESC";
  const franchiseFilter = listParams.filters.franchise;
  const programFilter = listParams.filters.program;

  // Shared by the list query and the CSV export (which ignores page/limit).
  // "valid" = derived operational filter (latest CI agreement is Valid);
  // franchiseId matches attached-or-handler (multi-franchise CIs).
  const activeFilters = {
    search: listParams.search || undefined,
    franchiseId: franchiseFilter !== "all" ? franchiseFilter : undefined,
    programId: programFilter !== "all" ? Number(programFilter) : undefined,
    sortBy,
    sortOrder,
  };
  const listQuery = useAdminCIListByStatus("valid", {
    page: listParams.page,
    limit: ITEMS_PER_PAGE,
    ...activeFilters,
  });

  const instructors = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;

  const [isExporting, setIsExporting] = useState(false);
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await exportCourseInstructorsCsv({ ...activeFilters, status: "valid" });
    } catch (error) {
      toast.error(getUserFriendlyMessage(error, "Failed to export CSV."));
    } finally {
      setIsExporting(false);
    }
  };

  const franchiseOptions = useFranchiseOptions();
  const { programs } = usePrograms();
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
      {
        key: "program",
        label: "Program",
        options: [
          { value: "all", label: "All programs" },
          ...(programs ?? []).map((p) => ({
            value: String(p.id),
            label: p.name,
          })),
        ],
        defaultValue: programFilter,
      },
    ],
    [franchiseOptions.data, franchiseFilter, programs, programFilter],
  );

  const columns: DataTableColumn<AdminCourseInstructorData>[] = [
    {
      key: "instructor",
      header: "Instructor",
    },
    {
      key: "franchise",
      header: "Franchise",
      // Handler franchise; a muted +N marks additional attached franchises
      // (renders nothing until the backend sends `franchises`).
      render: (instructor) => (
        <span>
          {instructor.franchise?.name || "—"}
          {(instructor.franchises?.length ?? 0) > 1 ? (
            <span className="ml-1 text-xs text-muted-foreground">
              +{(instructor.franchises?.length ?? 1) - 1}
            </span>
          ) : null}
        </span>
      ),
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
      key: "eligibility",
      header: "Eligibility",
      className: "text-center",
      // Highest completed training level (codes are the unique identifier);
      // a CI with no completed level yet is "New". Renders — until the
      // backend sends the field.
      render: (instructor) =>
        instructor.completedThroughLevel === undefined ? (
          "—"
        ) : instructor.completedThroughLevel === null ? (
          <Badge variant="outline">New</Badge>
        ) : (
          <span>
            {instructor.completedThroughLevel.code ||
              instructor.completedThroughLevel.name}
          </span>
        ),
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
          if (key === "franchise" || key === "program") {
            const next = Array.isArray(value) ? (value[0] ?? "all") : value;
            listParams.setFilter(key, next || "all");
          }
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
