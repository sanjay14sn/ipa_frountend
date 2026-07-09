"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Award, CalendarClock, CreditCard, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, StatusBadge, type StatusTone } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableSortOption,
} from "@/components/shared";
import { StudentData, StudentIdStatus } from "@/services/student.service";
import StudentCertificatesModal from "./StudentCertificatesModal";
import StudentDetails from "./StudentDetails";
import { StudentLifecycleDetailsDialog } from "@/components/students/student-lifecycle-details-dialog";
import { getStudentLevelName } from "./student-helpers";
import { useFranchiseeStudentLifecycle, useAdminStudentLifecycleById } from "@/hooks/api/student.hooks";
import { formatEntityCodeForDisplay } from "@/lib/format-entity-code";

/**
 * Widths for `table-fixed` + `<colgroup>`. Email must not use `auto` or it
 * swallows all leftover horizontal space and leaves a dead gap before Status/ID/Actions.
 */
const STUDENT_TABLE_COL_GROUP_WIDTHS: string[] = [
  "auto",
  "8rem",
  "6rem",
  "7rem",
  "8.5rem",
];

interface StudentsTableProps {
  students?: StudentData[];
  meta?: { total: number; totalPages: number };
  currentPage?: number;
  onPageChange?: (page: number) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  statusFilter?: string;
  levelId?: number;
  idStatus?: string;
  sortBy?: string;
  sortOrder?: string;
  isLoading?: boolean;
  onFilterChange?: (key: string, value: string) => void;
  onSortChange?: (sortBy: string, sortOrder: "ASC" | "DESC") => void;
  onStudentUpdate?: (updatedStudent: StudentData) => void;
  onStudentDelete?: (studentId: string) => void;
  onStudentEdit?: (student: StudentData) => void;
  onRequestIds?: () => void;
  toolbarActions?: ReactNode;
  mode?: "franchise" | "admin";
}

function hasOnlyWeekLeft(deactivateDate?: Date | string): boolean {
  if (!deactivateDate) return false;
  const today = new Date();
  const deactivate = new Date(deactivateDate);
  if (Number.isNaN(deactivate.getTime())) return false;

  today.setHours(0, 0, 0, 0);
  deactivate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(
    (deactivate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diffDays >= 0 && diffDays <= 7;
}

export default function StudentsTable({
  students = [],
  meta,
  currentPage,
  onPageChange,
  searchValue,
  onSearchChange,
  statusFilter,
  levelId,
  idStatus,
  sortBy,
  sortOrder,
  isLoading,
  onFilterChange,
  onSortChange,
  onStudentDelete,
  onStudentEdit,
  onRequestIds,
  toolbarActions,
  mode = "franchise",
}: StudentsTableProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const [isCertificatesModalOpen, setIsCertificatesModalOpen] = useState(false);
  const [lifecycleStudentId, setLifecycleStudentId] = useState<number | null>(null);

  const franchiseLifecycleQuery = useFranchiseeStudentLifecycle(mode === "franchise" ? lifecycleStudentId : null);
  const adminLifecycleQuery = useAdminStudentLifecycleById(mode === "admin" ? lifecycleStudentId : null);
  const lifecycleQuery = mode === "admin" ? adminLifecycleQuery : franchiseLifecycleQuery;

  const uniqueLevelOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const s of students ?? []) {
      const id = s.levelId;
      const name = getStudentLevelName(s);
      if (id && name && !seen.has(id)) {
        seen.set(id, name);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [students]);

  const columns: DataTableColumn<StudentData>[] = [
    {
      key: "student",
      header: "Student",
    },
    {
      key: "level",
      header: "Level",
      className: "text-center",
      render: (student) => (
        <Badge variant="outline" className="px-1.5 text-[11px]">
          {getStudentLevelName(student)}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (student) => (
        <StatusBadge
          label={student.status.charAt(0).toUpperCase() + student.status.slice(1)}
          tone={student.status === "active" ? "success" : student.status === "completed" ? "info" : "neutral"}
          className="px-1.5 text-[11px]"
        />
      ),
    },
    {
      key: "idStatus",
      header: "ID",
      className: "text-center",
      render: (student) => (
        <StatusBadge label={student.idIssued} className="px-1.5 text-[11px]" />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (student) => (
        <div className="flex items-center justify-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 p-0"
            type="button"
            onClick={() => setLifecycleStudentId(student.id)}
            title="Lifecycle details"
            aria-label="Lifecycle details"
          >
            <CalendarClock className="h-3.5 w-3.5 text-sky-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 p-0"
            onClick={() => {
              setSelectedStudentId(student.id);
              setIsCertificatesModalOpen(true);
            }}
            title="View certificates"
            aria-label="View certificates"
          >
            <Award className="h-3.5 w-3.5 text-emerald-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 p-0"
            onClick={() => onStudentEdit?.(student)}
            title="Edit student"
            aria-label="Edit student"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 p-0"
            onClick={() => onStudentDelete?.(student.id.toString())}
            title="Delete student"
            aria-label="Delete student"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const filters: DataTableFilter[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        options: [
          { value: "all", label: "All statuses" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
          { value: "completed", label: "Completed" },
        ],
        defaultValue: statusFilter ?? "all",
      },
      {
        key: "level",
        label: "Level",
        options: [
          { value: "all", label: "All levels" },
          ...uniqueLevelOptions.map(({ id, name }) => ({ value: String(id), label: name })),
        ],
        defaultValue: levelId ? String(levelId) : "all",
      },
      {
        key: "idStatus",
        label: "ID Status",
        options: [
          { value: "all", label: "All statuses" },
          { value: "Not Issued", label: "Not Issued" },
          { value: "Requested", label: "Requested" },
          { value: "Issued", label: "Issued" },
        ],
        defaultValue: idStatus ?? "all",
      },
    ],
    [statusFilter, uniqueLevelOptions, levelId, idStatus],
  );

  const sortOptions: DataTableSortOption[] = [
    { value: "createdAt", label: "Date Joined" },
    { value: "name", label: "Name" },
    { value: "level", label: "Level" },
  ];

  const handleFilterChange = (key: string, value: string | string[]) => {
    const val = Array.isArray(value) ? (value[0] ?? "all") : value;
    onFilterChange?.(key, val);
  };

  return (
    <>
      <DataTable
        data={students ?? []}
        initialSearchValue={searchValue}
        loading={isLoading ?? false}
        columns={columns}
        tableClassName="table-fixed"
        columnGroupWidths={STUDENT_TABLE_COL_GROUP_WIDTHS}
        getRowId={(student) => student.id.toString()}
        renderMainCell={(student) => {
          const roll = student.rollNo
            ? formatEntityCodeForDisplay(student.rollNo)
            : null;
          return (
            <span className="inline-flex items-center gap-2 font-medium text-card-foreground">
              {student.name || "N/A"}
              {roll ? (
                <span className="font-mono text-xs text-muted-foreground">
                  · {roll}
                </span>
              ) : null}
              {hasOnlyWeekLeft(student.deactivateDate) && (
                <Badge
                  variant="destructive"
                  className="shrink-0 text-xs"
                  title="Student has only a week left before deactivation"
                >
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  1 Week Left
                </Badge>
              )}
            </span>
          );
        }}
        renderExpandedContent={(student) => <StudentDetails student={student} />}
        searchPlaceholder="Search students, roll numbers, email, or parent names..."
        onSearchChange={(v) => onSearchChange?.(v)}
        filters={filters}
        onFilterChange={handleFilterChange}
        sortOptions={sortOptions}
        defaultSortBy={sortBy ?? "createdAt"}
        defaultSortOrder={(sortOrder as "ASC" | "DESC") ?? "DESC"}
        onSortChange={(s, o) => onSortChange?.(s, o)}
        pagination={meta ? { total: meta.total, totalPages: meta.totalPages } : undefined}
        currentPage={currentPage ?? 1}
        onPageChange={(p) => onPageChange?.(p)}
        itemsPerPage={10}
        emptyMessage="No students found matching your criteria"
        resultsText={(count, total) => `Showing ${count} of ${total} students`}
        toolbarActions={
          toolbarActions ??
          (onRequestIds ? (
            <Button type="button" variant="outline" onClick={onRequestIds}>
              <CreditCard className="mr-2 h-4 w-4" />
              Request IDs
            </Button>
          ) : undefined)
        }
      />

      {selectedStudentId != null && (
        <StudentCertificatesModal
          open={isCertificatesModalOpen}
          onOpenChange={(open) => {
            setIsCertificatesModalOpen(open);
            if (!open) setSelectedStudentId(null);
          }}
          studentId={selectedStudentId}
          studentName={students.find((s) => s.id === selectedStudentId)?.name}
          mode={mode}
        />
      )}

      <StudentLifecycleDetailsDialog
        open={lifecycleStudentId != null}
        onOpenChange={(open) => {
          if (!open) setLifecycleStudentId(null);
        }}
        row={lifecycleQuery.data ?? null}
        isLoading={Boolean(lifecycleStudentId != null && lifecycleQuery.isLoading)}
        loadError={lifecycleQuery.isError}
      />
    </>
  );
}
