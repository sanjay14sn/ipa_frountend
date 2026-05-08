"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, BarChart2 } from "lucide-react";
import { DataTable } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableSortOption,
} from "@/components/shared";
import {
  CourseInstructorData,
  getCITrainingProgress,
} from "@/services/course-instructor.service";
import CourseInstructorDetails from "./CourseInstructorDetails";
import { TrainingProgressModal } from "./TrainingProgressModal";

function CILevelBadge({ instructorId }: { instructorId: number }) {
  const { data: progress } = useQuery({
    queryKey: ["ci-training-progress", instructorId],
    queryFn: () => getCITrainingProgress(instructorId),
    staleTime: 5 * 60 * 1000,
  });

  const highestCompleted = progress?.trainings
    ?.filter((t) => t.isCompleted)
    .sort((a, b) => (b.displayOrder ?? 0) - (a.displayOrder ?? 0))[0];

  if (!highestCompleted) return null;

  return (
    <Badge variant="default" className="mt-1 text-xs">
      {highestCompleted.trainingLevelName}
    </Badge>
  );
}

interface CourseInstructorsTableProps {
  courseInstructors?: CourseInstructorData[];
  onCourseInstructorUpdate?: (
    updatedCourseInstructor: CourseInstructorData
  ) => void;
  onCourseInstructorDelete?: (courseInstructorId: string) => void;
  onCourseInstructorEdit?: (courseInstructor: CourseInstructorData) => void;
}

export default function CourseInstructorsTable({
  courseInstructors,
  onCourseInstructorUpdate,
  onCourseInstructorDelete,
  onCourseInstructorEdit,
}: CourseInstructorsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "dateJoined" | "city">(
    "dateJoined"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [progressModal, setProgressModal] = useState<{ id: number; name: string } | null>(null);
  const itemsPerPage = 10;

  const filteredData = useMemo(() => {
    if (!courseInstructors) return [];

    let filtered = courseInstructors.filter((ci) => {
      const matchesSearch =
        ci.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ci.instructorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ci.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ci.mail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ci.education.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && ci.status === "Active") ||
        (statusFilter === "training" && ci.status === "Training") ||
        (statusFilter === "inactive" &&
          ci.status !== "Active" &&
          ci.status !== "Training");

      const matchesBloodGroup =
        bloodGroupFilter === "all" || ci.bloodGroup === bloodGroupFilter;
      const matchesCity = cityFilter === "all" || ci.city === cityFilter;

      return matchesSearch && matchesStatus && matchesBloodGroup && matchesCity;
    });

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
        case "city":
          comparison = a.city.localeCompare(b.city);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [courseInstructors, searchTerm, statusFilter, bloodGroupFilter, cityFilter, sortBy, sortOrder]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const getStatusColor = (status: string) => {
    if (status === "Active") return "bg-primary/10 text-primary border-primary/20";
    if (status === "Training") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-muted text-muted-foreground border-border";
  };

  const uniqueBloodGroups = [
    ...new Set(courseInstructors?.map((ci) => ci.bloodGroup).filter(Boolean)),
  ];
  const uniqueCities = [
    ...new Set(courseInstructors?.map((ci) => ci.city).filter(Boolean)),
  ];

  const columns: DataTableColumn<CourseInstructorData>[] = [
    {
      key: "contact",
      header: "Contact",
      className: "w-[170px]",
      render: (ci) => (
        <span className="text-sm text-card-foreground">{ci.phone || "N/A"}</span>
      ),
    },
    {
      key: "location",
      header: "Location",
      className: "w-[170px]",
      render: (ci) => (
        <span className="text-sm text-card-foreground">{ci.city || "N/A"}</span>
      ),
    },
    {
      key: "professional",
      header: "Professional",
      className: "w-[220px]",
      render: (ci) => (
        <span className="text-sm text-card-foreground">
          {[ci.education, ci.occupation].filter(Boolean).join(" · ") || "N/A"}
        </span>
      ),
    },
    {
      key: "eligibility",
      header: "Eligibility",
      className: "w-[180px]",
      render: (ci) => <CILevelBadge instructorId={ci.id} />,
    },
    {
      key: "status",
      header: "Status",
      className: "w-[120px]",
      render: (ci) => (
        <Badge className={`${getStatusColor(ci.status)} border`}>
          {ci.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[140px]",
      render: (ci) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="View training progress"
            onClick={() => setProgressModal({ id: ci.id, name: ci.name })}
          >
            <BarChart2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCourseInstructorEdit?.(ci)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCourseInstructorDelete?.(ci.id.toString())}
          >
            <Trash2 className="w-4 h-4" />
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
        { value: "training", label: "Training" },
        { value: "inactive", label: "Inactive" },
      ],
      defaultValue: "all",
    },
    {
      key: "bloodGroup",
      label: "Blood Group",
      options: [
        { value: "all", label: "All Blood Groups" },
        ...uniqueBloodGroups.map((bg) => ({ value: bg, label: bg })),
      ],
      defaultValue: "all",
    },
    {
      key: "city",
      label: "City",
      options: [
        { value: "all", label: "All Cities" },
        ...uniqueCities.map((city) => ({ value: city, label: city })),
      ],
      defaultValue: "all",
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { value: "dateJoined", label: "Date Joined" },
    { value: "name", label: "Name" },
    { value: "city", label: "City" },
  ];

  return (
    <>
    <DataTable
      data={paginatedData}
      loading={false}
      columns={columns}
      getRowId={(ci) => ci.id.toString()}
      renderMainCell={(ci) => (
        <div className="flex flex-col">
          <div className="font-medium text-card-foreground">{ci.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {[ci.education, ci.city].filter(Boolean).join(" · ") || "N/A"}
          </div>
        </div>
      )}
      renderExpandedContent={(ci) => (
        <CourseInstructorDetails courseInstructor={ci} />
      )}
      searchPlaceholder="Search course instructors, instructor IDs, or contact info..."
      onSearchChange={setSearchTerm}
      filters={filters}
      onFilterChange={(key, value) => {
        if (key === "status") setStatusFilter(value as string);
        else if (key === "bloodGroup") setBloodGroupFilter(value as string);
        else if (key === "city") setCityFilter(value as string);
      }}
      sortOptions={sortOptions}
      defaultSortBy="dateJoined"
      defaultSortOrder="DESC"
      onSortChange={(newSortBy, newSortOrder) => {
        setSortBy(newSortBy as "name" | "dateJoined" | "city");
        setSortOrder(newSortOrder.toLowerCase() as "asc" | "desc");
      }}
      pagination={{ total: filteredData.length, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={itemsPerPage}
      emptyMessage="No course instructors found matching your criteria"
      resultsText={(count, total) =>
        `Showing ${count} of ${total} course instructors`
      }
    />

    {progressModal && (
      <TrainingProgressModal
        isOpen={true}
        onClose={() => setProgressModal(null)}
        instructorId={progressModal.id}
        instructorName={progressModal.name}
      />
    )}
    </>
  );
}
