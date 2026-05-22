"use client";

import { useMemo, useState } from "react";
import { Eye, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, StatusBadge, type StatusTone } from "@/components/shared";
import type { DataTableColumn, DataTableFilter } from "@/components/shared";
import { toast } from "sonner";
import {
  useAdminStudentLifecycle,
  useExtendStudentLifecycle,
  useReactivateStudentLifecycle,
  useRunStudentLifecycleInvalidation,
} from "@/hooks/api/student.hooks";
import type { StudentLifecycleRow, StudentLifecycleStatus } from "@/services/student.service";
import { StudentLifecycleActions } from "./student-lifecycle-actions";
import { StudentLifecycleDetailsDialog } from "@/components/students/student-lifecycle-details-dialog";
import { formatEntityCodeForDisplay } from "@/lib/format-entity-code";

const LIFECYCLE_TABLE_COL_GROUP_WIDTHS: string[] = [
  "8.5rem",
  "30%",
  "9rem",
  "5.5rem",
  "4.5rem",
  "5.5rem",
  "6.5rem",
  "15.5rem",
];

const statusLabels: Record<StudentLifecycleStatus, string> = {
  ACTIVE: "Active",
  AT_RISK: "At risk",
  EXTENDED: "Extended",
  INVALIDATED: "Invalidated",
  REACTIVATED: "Reactivated",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function getLifecycleTone(status: StudentLifecycleStatus): StatusTone {
  switch (status) {
    case "INVALIDATED":
      return "destructive";
    case "AT_RISK":
      return "warning";
    case "EXTENDED":
    case "REACTIVATED":
      return "info";
    case "ACTIVE":
    default:
      return "success";
  }
}

function statusBadge(row: StudentLifecycleRow) {
  const status = row.lifecycleStatus;
  return (
    <StatusBadge
      tone={getLifecycleTone(status)}
      label={statusLabels[status] ?? status}
    />
  );
}

function getCertificateTone(normalized: string): StatusTone {
  switch (normalized) {
    case "PENDING":
      return "neutral";
    case "ISSUED":
      return "success";
    case "REJECTED":
      return "destructive";
    default:
      return "neutral";
  }
}

function certificateBadge(status: string) {
  const normalized = status.toUpperCase();
  return (
    <StatusBadge tone={getCertificateTone(normalized)} label={normalized} />
  );
}

export function StudentLifecycleSection() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailsRow, setDetailsRow] = useState<StudentLifecycleRow | null>(null);
  const limit = 10;
  const params = useMemo(
    () => ({
      page: currentPage,
      limit,
      search: searchTerm || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      sortBy: "id",
      sortOrder: "DESC" as const,
    }),
    [currentPage, searchTerm, statusFilter],
  );

  const lifecycleQuery = useAdminStudentLifecycle(params);
  const runInvalidation = useRunStudentLifecycleInvalidation();
  const extendMutation = useExtendStudentLifecycle();
  const reactivateMutation = useReactivateStudentLifecycle();

  const rows = lifecycleQuery.data?.data ?? [];
  const total = lifecycleQuery.data?.meta.total ?? 0;
  const totalPages = lifecycleQuery.data?.meta.totalPages ?? 1;
  const loading = lifecycleQuery.isLoading && !lifecycleQuery.data;
  const busy = runInvalidation.isPending || extendMutation.isPending || reactivateMutation.isPending;

  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      defaultValue: "all",
      options: [
        { value: "all", label: "All managed" },
        { value: "AT_RISK", label: "At risk" },
        { value: "INVALIDATED", label: "Invalidated" },
        { value: "EXTENDED", label: "Extended" },
        { value: "REACTIVATED", label: "Reactivated" },
      ],
    },
  ];

  const columns: DataTableColumn<StudentLifecycleRow>[] = [
    {
      key: "student",
      header: "Student",
      className: "min-w-0 overflow-hidden px-2",
    },
    {
      key: "rollNo",
      header: "Roll No",
      className: "min-w-0 px-2",
      render: (row) => {
        const roll = row.rollNo || "N/A";
        const display =
          roll !== "N/A" ? formatEntityCodeForDisplay(roll) : "N/A";
        return (
          <span
            className="block truncate font-mono text-xs leading-normal tracking-tight text-card-foreground"
            title={roll !== "N/A" ? roll : undefined}
          >
            {display}
          </span>
        );
      },
    },
    {
      key: "franchise",
      header: "Franchise",
      className: "min-w-0 px-2",
      render: (row) => {
        const label = row.franchiseName || row.franchiseId || "N/A";
        const franchiseLabel =
          typeof label === "string" && label !== "N/A"
            ? formatEntityCodeForDisplay(label)
            : label;
        return (
          <span className="block truncate text-sm text-card-foreground" title={String(label)}>
            {franchiseLabel}
          </span>
        );
      },
    },
    {
      key: "level",
      header: "Level",
      className: "w-[5.5rem] min-w-[5.5rem] px-1.5 text-center",
      render: (row) => (
        <Badge
          variant="outline"
          className="max-w-full truncate border px-1.5 text-[11px]"
        >
          {row.levelName || row.levelCode || `Level ${row.levelId}`}
        </Badge>
      ),
    },
    {
      key: "certificate",
      header: "Cert.",
      className: "w-[4.5rem] min-w-[4.5rem] px-1 text-center",
      render: (row) => certificateBadge(row.certificateStatus),
    },
    {
      key: "deadline",
      header: "Deadline",
      className: "w-[5.5rem] min-w-[5.5rem] px-1 text-center text-xs text-card-foreground",
      render: (row) => formatDate(row.lifecycleDeadline),
    },
    {
      key: "status",
      header: "Lifecycle",
      className: "w-[6.5rem] min-w-[6.5rem] px-1 text-center",
      render: statusBadge,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[15.5rem] min-w-[15.5rem] max-w-[15.5rem] px-1 text-right",
      render: (row) => (
        <div className="flex flex-nowrap items-center justify-end gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 whitespace-nowrap px-2 text-xs"
            onClick={() => setDetailsRow(row)}
            title="Lifecycle details"
          >
            <Eye className="mr-1 h-3.5 w-3.5 shrink-0" />
            Details
          </Button>
          <StudentLifecycleActions
            student={row}
            busy={busy}
            onExtend={async (studentId, extendedUntil) => {
              try {
                await extendMutation.mutateAsync({ studentId, extendedUntil });
                toast.success("The new lifecycle deadline was saved.");
                void lifecycleQuery.refetch();
              } catch {
                toast.error("Could not extend this student.");
              }
            }}
            onReactivate={async (studentId, extendedUntil) => {
              try {
                await reactivateMutation.mutateAsync({ studentId, extendedUntil });
                toast.success("The student is active with a new deadline.");
                void lifecycleQuery.refetch();
              } catch {
                toast.error("Could not reactivate this student.");
              }
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={rows}
        loading={loading}
        columns={columns}
        tableClassName="table-fixed"
        columnGroupWidths={LIFECYCLE_TABLE_COL_GROUP_WIDTHS}
        getRowId={(row) => String(row.studentId)}
        renderMainCell={(row) => (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-medium text-card-foreground">
              {row.name || "N/A"}
            </span>
            <span className="text-xs text-muted-foreground">
              Joined {formatDate(row.dateOfJoining)} · {row.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        )}
        searchPlaceholder="Search by student name, roll number, or email..."
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        filters={filters}
        onFilterChange={(key, value) => {
          if (key === "status" && typeof value === "string") {
            setStatusFilter(value);
            setCurrentPage(1);
          }
        }}
        toolbarActions={
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              try {
                const result = await runInvalidation.mutateAsync();
                toast.success(`${result.invalidatedCount} student${result.invalidatedCount === 1 ? "" : "s"} invalidated.`);
                void lifecycleQuery.refetch();
              } catch {
                toast.error("Could not run lifecycle invalidation.");
              }
            }}
            disabled={busy}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Run invalidation now
          </Button>
        }
        pagination={{ total, totalPages }}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        itemsPerPage={limit}
        emptyMessage="No at-risk or lifecycle-managed students found"
        resultsText={(_, t) => `${t} lifecycle-managed student${t !== 1 ? "s" : ""}`}
      />

      <StudentLifecycleDetailsDialog
        open={detailsRow != null}
        onOpenChange={(open) => {
          if (!open) setDetailsRow(null);
        }}
        row={detailsRow}
      />
    </>
  );
}
