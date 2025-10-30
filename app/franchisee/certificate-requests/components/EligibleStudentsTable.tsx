"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, BookOpen, Award } from "lucide-react";
import { AdminTable } from "@/components/shared";
import type {
  AdminTableColumn,
  AdminTableFilter,
  AdminTableSortOption,
} from "@/components/shared/AdminTable";
import { EligibleStudent } from "@/services/student.service";

interface EligibleStudentsTableProps {
  students?: EligibleStudent[];
  onRequestCertificate?: (student: EligibleStudent) => void;
}

export default function EligibleStudentsTable({
  students,
  onRequestCertificate,
}: EligibleStudentsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [streamFilter, setStreamFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "rollNo" | "level">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
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
        levelFilter === "all" || student.level === levelFilter;
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

  // Helper function to calculate age
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

  // Get unique values for filters
  const uniqueLevels = [
    ...new Set(students?.map((student) => student.level).filter(Boolean)),
  ];
  const uniqueStreams = [
    ...new Set(students?.map((student) => student.stream).filter(Boolean)),
  ];

  // Table configuration
  const columns: AdminTableColumn<EligibleStudent>[] = [
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
          <Badge className={`${getLevelColor(student.level)} border`}>
            {student.level}
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
  ];

  const sortOptions: AdminTableSortOption[] = [
    { value: "name", label: "Name" },
    { value: "rollNo", label: "Roll Number" },
    { value: "level", label: "Level" },
  ];

  return (
    <AdminTable
      data={paginatedData}
      loading={false}
      columns={columns}
      getRowId={(student) => student.id.toString()}
      renderMainCell={(student) => (
        <div className="flex flex-col">
          <div className="font-medium text-gray-900">{student.name}</div>
          <div className="text-sm text-gray-500">
            {student.rollNo} • Age {calculateAge(student.dateOfBirth)} •{" "}
            {student.sex}
          </div>
          <div className="text-xs text-primary font-medium">
            {student.standard} • {student.stream}
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
  );
}
