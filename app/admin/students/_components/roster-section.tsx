"use client";

import { useState } from "react";
import { Award, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  StatusBadge,
  TableMainCell,
  TablePageShell,
  type DataTableColumn,
  type DataTableFilter,
} from "@/components/shared";
import StudentCertificatesModal from "@/components/students/StudentCertificatesModal";
import { useAdminStudentsRoster } from "@/hooks/api/student.hooks";
import { useFranchiseOptions } from "@/hooks/api/franchisee.hooks";
import { useAllLevels } from "@/hooks/api/level.hooks";
import { useListParams } from "@/hooks/use-list-params";
import { formatDate } from "@/lib/date-utils";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  exportStudentsAdminCsv,
  type StudentData,
} from "@/services/student.service";

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
 * student across franchises. Search + all filters are server-side
 * (unscoped GET /admin/student); list state lives in the URL under the
 * `roster.` prefix so it coexists with ?tab= and other tabs' params.
 */
export function RosterSection() {
  const [certStudent, setCertStudent] = useState<StudentData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const listParams = useListParams({
    filterDefaults: {
      status: "all",
      franchise: "all",
      level: "all",
      idStatus: "all",
    },
    prefix: "roster",
  });
  const search = listParams.search;
  const statusFilter = listParams.filters.status;
  const franchiseFilter = listParams.filters.franchise;
  const levelFilter = listParams.filters.level;
  const idStatusFilter = listParams.filters.idStatus;

  const franchiseOptionsQuery = useFranchiseOptions();
  const levelsQuery = useAllLevels();

  // Shared by the list query and the CSV export (which ignores page/limit).
  const activeFilters = {
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    franchiseId: franchiseFilter === "all" ? undefined : franchiseFilter,
    levelId: levelFilter === "all" ? undefined : Number(levelFilter),
    idStatus: idStatusFilter === "all" ? undefined : idStatusFilter,
  };
  const isFiltered =
    Boolean(search) ||
    statusFilter !== "all" ||
    franchiseFilter !== "all" ||
    levelFilter !== "all" ||
    idStatusFilter !== "all";

  const rosterQuery = useAdminStudentsRoster({
    page: listParams.page,
    limit: ITEMS_PER_PAGE,
    ...activeFilters,
  });

  const students = rosterQuery.data?.data ?? [];
  const meta = rosterQuery.data?.meta;

  // Same filters/search as the table, no page/limit — the backend returns
  // every matching row, not just the visible page.
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await exportStudentsAdminCsv(activeFilters);
    } catch (error) {
      toast.error(getUserFriendlyMessage(error, "Failed to export CSV."));
    } finally {
      setIsExporting(false);
    }
  };

  // defaultValue is the live URL-derived value (not a hardcoded "all"):
  // DataTable seeds its internal filter state once from defaultValue, so a
  // URL-restored filter must arrive with the right value or the dropdown
  // label goes stale.
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
    {
      key: "franchise",
      label: "Franchise",
      options: [
        { value: "all", label: "All franchises" },
        ...(franchiseOptionsQuery.data ?? []),
      ],
      defaultValue: franchiseFilter,
    },
    {
      key: "level",
      label: "Level",
      options: [
        { value: "all", label: "All levels" },
        // Codes, not names: names repeat across programs/streams ("Level 1"
        // exists in each); the code is the unique, recognizable identifier.
        ...(levelsQuery.data ?? []).map((l) => ({
          value: String(l.id),
          label: l.code || l.name,
        })),
      ],
      defaultValue: levelFilter,
    },
    {
      key: "idStatus",
      label: "ID Status",
      options: [
        { value: "all", label: "All ID statuses" },
        { value: "Not Issued", label: "Not Issued" },
        { value: "Requested", label: "Requested" },
        { value: "Issued", label: "Issued" },
      ],
      defaultValue: idStatusFilter,
    },
  ];

  const columns: DataTableColumn<StudentData>[] = [
    { key: "student", header: "Student" },
    {
      key: "franchise",
      header: "Franchise",
      render: (s) =>
        s.franchiseName ? (
          <span className="block truncate text-sm" title={s.franchiseName}>
            {s.franchiseName}
          </span>
        ) : s.franchiseCode ? (
          <span className="font-mono text-xs">{s.franchiseCode}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
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
    {
      key: "actions",
      header: "Actions",
      render: (s) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 p-0"
          type="button"
          onClick={() => setCertStudent(s)}
          title="View certificates"
          aria-label="View certificates"
        >
          <Award className="h-3.5 w-3.5 text-emerald-600" />
        </Button>
      ),
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
          const next = Array.isArray(value) ? (value[0] ?? "all") : value;
          if (key === "status") listParams.setFilter("status", next || "all");
          else if (key === "franchise")
            listParams.setFilter("franchise", next || "all");
          else if (key === "level") listParams.setFilter("level", next || "all");
          else if (key === "idStatus")
            listParams.setFilter("idStatus", next || "all");
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
          `Showing ${count} of ${total} student${total !== 1 ? "s" : ""}${
            isFiltered ? " (filtered)" : ""
          }`
        }
      />

      {certStudent != null && (
        <StudentCertificatesModal
          open={certStudent != null}
          onOpenChange={(open) => {
            if (!open) setCertStudent(null);
          }}
          studentId={certStudent.id}
          studentName={certStudent.name}
          mode="admin"
        />
      )}
    </TablePageShell>
  );
}
