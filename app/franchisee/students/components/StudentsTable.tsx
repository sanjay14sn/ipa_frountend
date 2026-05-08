"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Award, CreditCard, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableSortOption,
} from "@/components/shared";
import { StudentData, StudentIdStatus } from "@/services/student.service";
import StudentCertificatesModal from "../../certificate-requests/components/StudentCertificatesModal";
import StudentDetails from "./StudentDetails";
import { getStudentLevelName } from "../utils/student-helpers";

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
}

function getLevelColor(_level: string) {
  return "bg-gray-100 text-gray-800 border-gray-200";
}

function getStatusColor(isActive: boolean) {
  return isActive
    ? "bg-primary/10 text-primary border-primary/20"
    : "bg-gray-50 text-gray-600 border-gray-200";
}

function getIdStatusColor(idStatus: StudentIdStatus) {
  switch (idStatus) {
    case StudentIdStatus.ISSUED:
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case StudentIdStatus.REQUESTED:
      return "bg-amber-50 text-amber-700 border-amber-200";
    case StudentIdStatus.NOT_ISSUED:
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
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
}: StudentsTableProps) {
  const [streamFilter, setStreamFilter] = useState<string>("all");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const [isCertificatesModalOpen, setIsCertificatesModalOpen] = useState(false);

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

  const uniqueStreams = useMemo(
    () =>
      Array.from(
        new Set((students ?? []).map((s) => s.stream).filter(Boolean)),
      ),
    [students],
  );

  const streamFilteredStudents = useMemo(() => {
    if (streamFilter === "all") return students ?? [];
    return (students ?? []).filter((s) => s.stream === streamFilter);
  }, [students, streamFilter]);

  const columns: DataTableColumn<StudentData>[] = [
    {
      key: "student",
      header: "Student",
      className: "min-w-[220px]",
    },
    {
      key: "rollNo",
      header: "Roll No",
      className: "w-[140px]",
      render: (student) => (
        <span className="text-sm text-card-foreground">
          {student.rollNo || "N/A"}
        </span>
      ),
    },
    {
      key: "level",
      header: "Level",
      className: "w-[120px] text-center",
      render: (student) => (
        <Badge className={`${getLevelColor(getStudentLevelName(student))} border`}>
          {getStudentLevelName(student)}
        </Badge>
      ),
    },
    {
      key: "standard",
      header: "Standard",
      className: "w-[110px] text-center",
      render: (student) => (
        <span className="text-sm text-card-foreground">
          {student.standard || "N/A"}
        </span>
      ),
    },
    {
      key: "stream",
      header: "Stream",
      className: "w-[140px] text-center",
      render: (student) => (
        <span className="text-sm text-card-foreground">
          {student.stream || "N/A"}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      className: "w-[140px]",
      render: (student) => (
        <span className="text-sm text-card-foreground">
          {student.fatherContactNo || student.motherContactNo || "N/A"}
        </span>
      ),
    },
    {
      key: "mail",
      header: "Email",
      className: "min-w-[220px]",
      render: (student) => (
        <span className="block max-w-[260px] truncate text-sm text-card-foreground">
          {student.mail || "N/A"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-[110px] text-center",
      render: (student) => (
        <Badge className={`${getStatusColor(student.isActive)} border`}>
          {student.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "idStatus",
      header: "ID Status",
      className: "w-[130px] text-center",
      render: (student) => (
        <Badge className={`${getIdStatusColor(student.idIssued)} border`}>
          {student.idIssued}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[120px] text-center",
      render: (student) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedStudentId(student.id);
              setIsCertificatesModalOpen(true);
            }}
            title="View certificates"
            aria-label="View certificates"
          >
            <Award className="h-4 w-4 text-emerald-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onStudentEdit?.(student)}
            title="Edit student"
            aria-label="Edit student"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onStudentDelete?.(student.id.toString())}
            title="Delete student"
            aria-label="Delete student"
          >
            <Trash2 className="h-4 w-4" />
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
        key: "stream",
        label: "Stream",
        options: [
          { value: "all", label: "All streams" },
          ...uniqueStreams.map((s) => ({ value: s ?? "", label: s ?? "" })).filter((o) => o.value),
        ],
        defaultValue: streamFilter,
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
    [statusFilter, uniqueLevelOptions, uniqueStreams, streamFilter, levelId, idStatus],
  );

  const sortOptions: DataTableSortOption[] = [
    { value: "createdAt", label: "Date Joined" },
    { value: "name", label: "Name" },
    { value: "level", label: "Level" },
  ];

  const handleFilterChange = (key: string, value: string | string[]) => {
    const val = Array.isArray(value) ? (value[0] ?? "all") : value;
    if (key === "stream") {
      setStreamFilter(val);
    } else {
      onFilterChange?.(key, val);
    }
  };

  return (
    <>
      <DataTable
        data={streamFilteredStudents}
        loading={isLoading ?? false}
        columns={columns}
        getRowId={(student) => student.id.toString()}
        renderMainCell={(student) => (
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium text-card-foreground">
              {student.name || "N/A"}
            </span>
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
          </div>
        )}
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
        />
      )}
    </>
  );
}
