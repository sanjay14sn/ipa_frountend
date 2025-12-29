"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Mail, Phone, Award, AlertTriangle } from "lucide-react";
import { AdminTable } from "@/components/shared";
import type {
  AdminTableColumn,
  AdminTableFilter,
  AdminTableSortOption,
} from "@/components/shared/AdminTable";
import {
  StudentData,
  StudentLevel,
  StudentIdStatus,
} from "@/services/student.service";
import StudentDetails from "./StudentDetails";
import StudentCertificatesModal from "../../certificate-requests/components/StudentCertificatesModal";
import { getStudentLevelName, getStudentLevelForFilter } from "../utils/student-helpers";

interface StudentsTableProps {
  students?: StudentData[];
  onStudentUpdate?: (updatedStudent: StudentData) => void;
  onStudentDelete?: (studentId: string) => void;
  onStudentEdit?: (student: StudentData) => void;
  onRequestIds?: () => void;
}

export default function StudentsTable({
  students,
  onStudentUpdate,
  onStudentDelete,
  onStudentEdit,
  onRequestIds,
}: StudentsTableProps) {
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [streamFilter, setStreamFilter] = useState<string>("all");
  const [idStatusFilter, setIdStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "dateJoined" | "level">(
    "dateJoined"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null
  );
  const [isCertificatesModalOpen, setIsCertificatesModalOpen] = useState(false);
  const itemsPerPage = 10;

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!students) {
      return [];
    }

    let filtered = students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.fatherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.motherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.mail.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && student.isActive) ||
        (statusFilter === "inactive" && !student.isActive);

      const matchesLevel =
        levelFilter === "all" || getStudentLevelForFilter(student) === levelFilter;
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

    // Sort the filtered data
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "dateJoined":
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "level":
          comparison = a.level.localeCompare(b.level);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
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

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const toggleRow = (id: string) => {
    if (id.includes("-")) {
      const newExpandedChildren = new Set(expandedChildren);
      if (newExpandedChildren.has(id)) {
        newExpandedChildren.delete(id);
      } else {
        newExpandedChildren.add(id);
      }
      setExpandedChildren(newExpandedChildren);
    }
  };

  const getLevelColor = (level: string) => {
    if (!level) return "bg-gray-100 text-gray-800 border-gray-200";
    if (level.startsWith("EL"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    if (level.startsWith("RL"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    if (level.startsWith("GML"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-primary/10 text-primary border-primary/20"
      : "bg-gray-50 text-gray-600 border-gray-200";
  };

  const getIdStatusColor = (_idStatus: StudentIdStatus) => {
    return "bg-primary/10 text-primary border-primary/20";
  };

  // Helper function to calculate age
  const calculateAge = (dateOfBirth: Date): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const hasOnlyWeekLeft = (deactivateDate?: Date | string): boolean => {
    if (!deactivateDate) return false;

    try {
      const today = new Date();
      const deactivate = new Date(deactivateDate);

      if (isNaN(deactivate.getTime())) return false;

      today.setHours(0, 0, 0, 0);
      deactivate.setHours(0, 0, 0, 0);

      const diffTime = deactivate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays >= 0 && diffDays <= 7;
    } catch (error) {
      return false;
    }
  };

  // Get unique values for filters
  const uniqueLevels = [
    ...new Set(students?.map((student) => getStudentLevelName(student)).filter(Boolean)),
  ];
  const uniqueStreams = [
    ...new Set(students?.map((student) => student.stream).filter(Boolean)),
  ];

  // Table configuration
  const columns: AdminTableColumn<StudentData>[] = [
    {
      key: "student",
      header: "Student",
      className: "w-[300px]",
    },
    {
      key: "levelStandard",
      header: "Level & Standard",
      className: "text-center",
      render: (student) => (
        <div className="space-y-1">
          <Badge className={`${getLevelColor(getStudentLevelName(student))} border`}>
            {getStudentLevelName(student)}
          </Badge>
          <div className="text-sm text-gray-600">{student.standard}</div>
        </div>
      ),
    },
    {
      key: "parents",
      header: "Parents",
      className: "text-center",
      render: (student) => (
        <div className="text-sm space-y-1">
          <div>
            <strong>F:</strong> {student.fatherName}
          </div>
          <div>
            <strong>M:</strong> {student.motherName}
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      className: "text-center",
      render: (student) => (
        <div className="text-sm space-y-1">
          <div className="flex items-center justify-center">
            <Mail className="w-3 h-3 mr-1" />
            <span className="truncate max-w-[120px]">{student.mail}</span>
          </div>
          <div className="flex items-center justify-center">
            <Phone className="w-3 h-3 mr-1" />
            {student.fatherContactNo}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (student) => (
        <Badge className={`${getStatusColor(student.isActive)} border`}>
          {student.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "idStatus",
      header: "ID Status",
      className: "text-center",
      render: (student) => (
        <Badge className={`${getIdStatusColor(student.idIssued)} border`}>
          {student.idIssued}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (student) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedStudentId(student.id);
              setIsCertificatesModalOpen(true);
            }}
            title="View Certificates"
          >
            <Award className="w-4 h-4 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStudentEdit?.(student)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStudentDelete?.(student.id.toString())}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const filters: AdminTableFilter[] = [
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
        ...uniqueLevels.map((level) => ({ value: level, label: level })),
      ],
      defaultValue: "all",
    },
    {
      key: "stream",
      label: "Stream",
      options: [
        { value: "all", label: "All Streams" },
        ...uniqueStreams.map((stream) => ({ value: stream, label: stream })),
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

  const sortOptions: AdminTableSortOption[] = [
    { value: "dateJoined", label: "Date Joined" },
    { value: "name", label: "Name" },
    { value: "level", label: "Level" },
  ];

  return (
    <>
      <AdminTable
        data={paginatedData}
        loading={false}
        columns={columns}
        getRowId={(student) => student.id.toString()}
        renderMainCell={(student) => (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <div className="font-medium text-gray-900">{student.name}</div>
              {hasOnlyWeekLeft(student.deactivateDate) && (
                <Badge
                  variant="destructive"
                  className="flex items-center gap-1 text-xs"
                  title="Student has only a week left before deactivation"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>1 Week Left</span>
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {student.rollNo} • Age {calculateAge(student.dateOfBirth)} •{" "}
              {student.sex}
            </div>
            <div className="text-xs text-primary font-medium">
              {student.standard} • {student.stream}
            </div>
          </div>
        )}
        renderExpandedContent={(student) => (
          <StudentDetails
            student={student}
            lastRow={false}
            expandedRows={expandedChildren}
            onToggleRow={toggleRow}
            onStudentUpdate={onStudentUpdate}
          />
        )}
        searchPlaceholder="Search students, roll numbers, or parent names..."
        onSearchChange={setSearchTerm}
        filters={filters}
        onFilterChange={(key, value) => {
          if (key === "status") setStatusFilter(value as string);
          else if (key === "level") setLevelFilter(value as string);
          else if (key === "stream") setStreamFilter(value as string);
          else if (key === "idStatus") setIdStatusFilter(value as string);
        }}
        sortOptions={sortOptions}
        defaultSortBy="dateJoined"
        defaultSortOrder="DESC"
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy as "name" | "dateJoined" | "level");
          setSortOrder(newSortOrder.toLowerCase() as "asc" | "desc");
        }}
        pagination={{ total: filteredData.length, totalPages }}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        emptyMessage="No students found matching your criteria"
        resultsText={(count, total) => `Showing ${count} of ${total} students`}
      />

      {selectedStudentId && (
        <StudentCertificatesModal
          open={isCertificatesModalOpen}
          onOpenChange={setIsCertificatesModalOpen}
          studentId={selectedStudentId}
          studentName={students?.find((s) => s.id === selectedStudentId)?.name}
        />
      )}
    </>
  );
}
