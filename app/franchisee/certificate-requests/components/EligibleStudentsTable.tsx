"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, BookOpen, Award } from "lucide-react";
import { DataTable } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableSortOption,
} from "@/components/shared";
import { EligibleStudent } from "@/services/student.service";

interface EligibleStudentsTableProps {
  students?: EligibleStudent[];
  onRequestCertificate?: (student: EligibleStudent) => void;
  onBulkRequest?: (selectedStudents: EligibleStudent[]) => void;
  courseInstructors?: any[];
}

export default function EligibleStudentsTable({
  students,
  onRequestCertificate,
  onBulkRequest,
  courseInstructors = [],
}: EligibleStudentsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [streamFilter, setStreamFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "rollNo" | "level">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const itemsPerPage = 10;

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!students) {
      return [];
    }

    let filtered = students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.rollNo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && student.isActive) ||
        (statusFilter === "inactive" && !student.isActive);

      const matchesLevel =
        levelFilter === "all" || student.levelName === levelFilter;
      const matchesStream =
        streamFilter === "all" || student.stream === streamFilter;

      return matchesSearch && matchesStatus && matchesLevel && matchesStream;
    });

    // Sort the filtered data
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "rollNo":
          comparison = a.rollNo.localeCompare(b.rollNo);
          break;
        case "level":
          comparison = a.levelName.localeCompare(b.levelName);
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
    sortBy,
    sortOrder,
  ]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const getLevelColor = (level: string) => {
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

  const calculateAge = (dateOfBirth: string): number => {
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

  const uniqueLevels = [
    ...new Set(students?.map((student) => student.levelName).filter(Boolean)),
  ];
  const uniqueStreams = [
    ...new Set(students?.map((student) => student.stream).filter(Boolean)),
  ];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredData.map((s) => s.id));
      setSelectedStudents(allIds);
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleSelectStudent = (studentId: number, checked: boolean) => {
    const newSelected = new Set(selectedStudents);
    if (checked) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleBulkRequest = () => {
    const selected = filteredData.filter((s) => selectedStudents.has(s.id));
    if (selected.length === 0) {
      return;
    }
    onBulkRequest?.(selected);
  };

  const allSelected = filteredData.length > 0 && filteredData.every((s) => selectedStudents.has(s.id));
  const someSelected = filteredData.some((s) => selectedStudents.has(s.id));

  const columns: DataTableColumn<EligibleStudent>[] = [
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
          <Badge className={`${getLevelColor(student.levelName)} border`}>
            {student.levelName}
          </Badge>
          <div className="text-sm text-gray-600">{student.standard}</div>
        </div>
      ),
    },
    {
      key: "details",
      header: "Details",
      className: "text-center",
      render: (student) => (
        <div className="text-sm space-y-1">
          <div className="flex items-center justify-center">
            <Calendar className="w-3 h-3 mr-1" />
            <span>{new Date(student.dateOfBirth).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center justify-center">
            <BookOpen className="w-3 h-3 mr-1" />
            {student.stream}
          </div>
        </div>
      ),
    },
    {
      key: "eligibility",
      header: "Eligibility",
      className: "text-center",
      render: (student) => (
        <Badge
          className={
            student.eligibilityReason === "no_certificate"
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }
        >
          {student.eligibilityReason === "no_certificate"
            ? "First certificate"
            : "Duration exceeded"}
        </Badge>
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
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (student) => (
        <Button
          size="sm"
          onClick={() => onRequestCertificate?.(student)}
          className="bg-primary hover:bg-primary/90"
        >
          <Award className="w-4 h-4 mr-1" />
          Request Certificate
        </Button>
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
  ];

  const sortOptions: DataTableSortOption[] = [
    { value: "name", label: "Name" },
    { value: "rollNo", label: "Roll Number" },
    { value: "level", label: "Level" },
  ];

  return (
    <div className="space-y-4">
      {/* Select All and Bulk Actions */}
      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => handleSelectAll(checked === true)}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <label className="text-sm font-medium cursor-pointer" onClick={() => handleSelectAll(!allSelected)}>
              Select All ({filteredData.length})
            </label>
          </div>
          {selectedStudents.size > 0 && (
            <div className="text-sm text-gray-600">
              {selectedStudents.size} selected
            </div>
          )}
        </div>
        {selectedStudents.size > 0 && (
          <Button
            onClick={handleBulkRequest}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Award className="w-4 h-4 mr-2" />
            Bulk Request ({selectedStudents.size})
          </Button>
        )}
      </div>
      <DataTable
        data={paginatedData}
        loading={false}
        columns={columns}
        getRowId={(student) => student.id.toString()}
        renderMainCell={(student) => (
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedStudents.has(student.id)}
              onCheckedChange={(checked) =>
                handleSelectStudent(student.id, checked === true)
              }
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex flex-col flex-1">
              <div className="font-medium text-gray-900">{student.name}</div>
              <div className="text-sm text-gray-500">
                {student.rollNo} • Age {calculateAge(student.dateOfBirth)} •{" "}
                {student.sex}
              </div>
              <div className="text-xs text-primary font-medium">
                {student.standard} • {student.stream}
              </div>
            </div>
          </div>
        )}
      searchPlaceholder="Search eligible students by name or roll number..."
      onSearchChange={setSearchTerm}
      filters={filters}
      onFilterChange={(key, value) => {
        if (key === "status") setStatusFilter(value as string);
        else if (key === "level") setLevelFilter(value as string);
        else if (key === "stream") setStreamFilter(value as string);
      }}
      sortOptions={sortOptions}
      defaultSortBy="name"
      defaultSortOrder="ASC"
      onSortChange={(newSortBy, newSortOrder) => {
        setSortBy(newSortBy as "name" | "rollNo" | "level");
        setSortOrder(newSortOrder.toLowerCase() as "asc" | "desc");
      }}
      pagination={{ total: filteredData.length, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={itemsPerPage}
      emptyMessage="No eligible students found matching your criteria"
      resultsText={(count, total) =>
        `Showing ${count} of ${total} eligible students`
      }
      />
    </div>
  );
}
