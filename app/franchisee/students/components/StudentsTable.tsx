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
import {
  getStudentLevelForFilter,
  getStudentLevelName,
} from "../utils/student-helpers";

interface StudentsTableProps {
  students?: StudentData[];
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

function lower(value: unknown): string {
  return String(value ?? "").toLowerCase();
}

export default function StudentsTable({
  students = [],
  onStudentDelete,
  onStudentEdit,
  onRequestIds,
  toolbarActions,
}: StudentsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [streamFilter, setStreamFilter] = useState<string>("all");
  const [idStatusFilter, setIdStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "dateJoined" | "level">(
    "dateJoined",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const [isCertificatesModalOpen, setIsCertificatesModalOpen] = useState(false);
  const itemsPerPage = 10;

  const uniqueLevels = useMemo(
    () =>
      Array.from(
        new Set(students.map((student) => getStudentLevelName(student)).filter(Boolean)),
      ),
    [students],
  );

  const uniqueStreams = useMemo(
    () =>
      Array.from(
        new Set(students.map((student) => student.stream).filter(Boolean)),
      ),
    [students],
  );

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const rows = students.filter((student) => {
      const matchesSearch =
        !term ||
        [
          student.name,
          student.rollNo,
          student.mail,
          student.fatherName,
          student.motherName,
          student.fatherContactNo,
          student.motherContactNo,
          student.standard,
          student.stream,
          getStudentLevelName(student),
        ].some((value) => lower(value).includes(term));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && student.isActive) ||
        (statusFilter === "inactive" && !student.isActive);
      const matchesLevel =
        levelFilter === "all" ||
        getStudentLevelForFilter(student) === levelFilter;
      const matchesStream =
        streamFilter === "all" || student.stream === streamFilter;
      const matchesIdStatus =
        idStatusFilter === "all" || student.idIssued === idStatusFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesLevel &&
        matchesStream &&
        matchesIdStatus
      );
    });

    return [...rows].sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "level") {
        comparison = getStudentLevelName(a).localeCompare(getStudentLevelName(b));
      } else {
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [
    students,
    searchTerm,
    statusFilter,
    levelFilter,
    streamFilter,
    idStatusFilter,
    sortBy,
    sortOrder,
  ]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 0;

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

  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Status" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
      defaultValue: "all",
    },
    {
      key: "level",
      label: "Level",
      options: [
        { value: "all", label: "All Levels" },
        ...uniqueLevels.map((level) => ({ value: String(level), label: String(level) })),
      ],
      defaultValue: "all",
    },
    {
      key: "stream",
      label: "Stream",
      options: [
        { value: "all", label: "All Streams" },
        ...uniqueStreams.map((stream) => ({
          value: String(stream),
          label: String(stream),
        })),
      ],
      defaultValue: "all",
    },
    {
      key: "idStatus",
      label: "ID Status",
      options: [
        { value: "all", label: "All ID Status" },
        { value: StudentIdStatus.NOT_ISSUED, label: "Not Issued" },
        { value: StudentIdStatus.REQUESTED, label: "Requested" },
        { value: StudentIdStatus.ISSUED, label: "Issued" },
      ],
      defaultValue: "all",
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { value: "dateJoined", label: "Date Joined" },
    { value: "name", label: "Name" },
    { value: "level", label: "Level" },
  ];

  return (
    <>
      <DataTable
        data={paginatedData}
        loading={false}
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
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        filters={filters}
        onFilterChange={(key, value) => {
          if (key === "status") setStatusFilter(value as string);
          else if (key === "level") setLevelFilter(value as string);
          else if (key === "stream") setStreamFilter(value as string);
          else if (key === "idStatus") setIdStatusFilter(value as string);
          setCurrentPage(1);
        }}
        sortOptions={sortOptions}
        defaultSortBy="dateJoined"
        defaultSortOrder="DESC"
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy as "name" | "dateJoined" | "level");
          setSortOrder(newSortOrder.toLowerCase() as "asc" | "desc");
          setCurrentPage(1);
        }}
        pagination={{ total: filteredData.length, totalPages }}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
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
