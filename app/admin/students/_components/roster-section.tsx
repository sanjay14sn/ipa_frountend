"use client";

import {
  DataTable,
  StatusBadge,
  TableMainCell,
  TablePageShell,
  type DataTableColumn,
  type DataTableFilter,
} from "@/components/shared";
import { useAdminStudentsRoster } from "@/hooks/api/student.hooks";
import { useListParams } from "@/hooks/use-list-params";
import { formatDate } from "@/lib/date-utils";
import type { StudentData } from "@/services/student.service";

const ITEMS_PER_PAGE = 10;

function levelLabel(student: StudentData): string {
  const level = student.level;
  if (level && typeof level === "object") {
    const l = level as { code?: string; name?: string };
    return l.code ?? l.name ?? "";
  }
  return String(level ?? "");
}

/**
 * ADM-12: network-wide student roster — the first browsable list of every
 * student across franchises. Search + status filter are server-side
 * (unscoped GET /admin/student); list state lives in the URL under the
 * `roster.` prefix so it coexists with ?tab= and other tabs' params.
 */
export function RosterSection() {
  const listParams = useListParams({
    filterDefaults: { status: "all" },
    prefix: "roster",
  });
  const search = listParams.search;
  const statusFilter = listParams.filters.status;

  const rosterQuery = useAdminStudentsRoster({
    page: listParams.page,
    limit: ITEMS_PER_PAGE,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const students = rosterQuery.data?.data ?? [];
  const meta = rosterQuery.data?.meta;

  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All statuses" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "completed", label: "Completed" },
      ],
      defaultValue: statusFilter,
    },
  ];

  const columns: DataTableColumn<StudentData>[] = [
    { key: "student", header: "Student" },
    {
      key: "franchise",
      header: "Franchise",
      render: (s) =>
        s.franchiseCode ? (
          <span className="font-mono text-xs">{s.franchiseCode}</span>
        ) : (
          <span className="font-mono text-xs text-muted-foreground">
            {s.franchiseId.slice(0, 12)}…
          </span>
        ),
    },
    {
      key: "level",
      header: "Level",
      render: (s) => levelLabel(s) || "—",
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <StatusBadge label={s.status} />,
    },
    {
      key: "joined",
      header: "Joined",
      render: (s) => (s.dateOfJoining ? formatDate(s.dateOfJoining) : "—"),
    },
  ];

  return (
    <TablePageShell embed>
      <DataTable<StudentData>
        data={students}
        loading={rosterQuery.isLoading}
        columns={columns}
        getRowId={(s) => String(s.id)}
        renderMainCell={(s) => (
          <TableMainCell title={s.name} subtitle={s.rollNo} />
        )}
        initialSearchValue={search}
        searchPlaceholder="Search by name, roll no, or email..."
        onSearchChange={(value) => listParams.setSearch(value)}
        filters={filters}
        onFilterChange={(key, value) => {
          if (key === "status") listParams.setFilter("status", value as string);
        }}
        pagination={
          meta ? { total: meta.total, totalPages: meta.totalPages } : undefined
        }
        currentPage={listParams.page}
        onPageChange={listParams.setPage}
        itemsPerPage={ITEMS_PER_PAGE}
        error={rosterQuery.error}
        onRetry={() => void rosterQuery.refetch()}
        errorMessage="Couldn't load students."
        emptyState={{
          title: "No students found",
          hint: "Students appear here as franchises enroll them.",
        }}
        resultsText={(count, total) =>
          `Showing ${count} of ${total} student${total !== 1 ? "s" : ""}`
        }
      />
    </TablePageShell>
  );
}
