"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Mail, Phone } from "lucide-react";
import { AdminTable } from "@/components/shared";
import type {
  AdminTableColumn,
  AdminTableFilter,
  AdminTableSortOption,
} from "@/components/shared/AdminTable";
import {
  CourseInstructorData,
  BloodGroup,
} from "@/services/course-instructor.service";
import CourseInstructorDetails from "./CourseInstructorDetails";

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
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "dateJoined" | "city">(
    "dateJoined"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!courseInstructors) {
      return [];
    }

    // Filter out course instructors with training status
    let filtered = courseInstructors.filter((courseInstructor) => {
      // Exclude course instructors with training status
      if (courseInstructor.status === "Training") {
        return false;
      }
      const matchesSearch =
        courseInstructor.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        courseInstructor.instructorId
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        courseInstructor.phone
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        courseInstructor.mail
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        courseInstructor.education
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && courseInstructor.status === "Active") ||
        (statusFilter === "inactive" && courseInstructor.status !== "Active");

      const matchesBloodGroup =
        bloodGroupFilter === "all" ||
        courseInstructor.bloodGroup === bloodGroupFilter;
      const matchesCity =
        cityFilter === "all" || courseInstructor.city === cityFilter;

      return matchesSearch && matchesStatus && matchesBloodGroup && matchesCity;
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
        case "city":
          comparison = a.city.localeCompare(b.city);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [
    courseInstructors,
    searchTerm,
    statusFilter,
    bloodGroupFilter,
    cityFilter,
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

  const getBloodGroupColor = (bloodGroup: BloodGroup) => {
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getStatusColor = (status: string) => {
    return status === "Active"
      ? "bg-primary/10 text-primary border-primary/20"
      : "bg-gray-50 text-gray-600 border-gray-200";
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

  // Get unique values for filters
  const uniqueBloodGroups = [
    ...new Set(courseInstructors?.map((ci) => ci.bloodGroup).filter(Boolean)),
  ];
  const uniqueCities = [
    ...new Set(courseInstructors?.map((ci) => ci.city).filter(Boolean)),
  ];

  // Table configuration
  const columns: AdminTableColumn<CourseInstructorData>[] = [
    {
      key: "courseInstructor",
      header: "Course Instructor",
      className: "w-[300px]",
    },
    {
      key: "personalInfo",
      header: "Personal Info",
      className: "text-center",
      render: (courseInstructor) => (
        <div className="space-y-1">
          <Badge
            className={`${getBloodGroupColor(
              courseInstructor.bloodGroup
            )} border`}
          >
            {courseInstructor.bloodGroup}
          </Badge>
          <div className="text-sm text-gray-600">{courseInstructor.city}</div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      className: "text-center",
      render: (courseInstructor) => (
        <div className="text-sm space-y-1">
          <div className="flex items-center justify-center">
            <Mail className="w-3 h-3 mr-1" />
            <span className="truncate max-w-[120px]">
              {courseInstructor.mail}
            </span>
          </div>
          <div className="flex items-center justify-center">
            <Phone className="w-3 h-3 mr-1" />
            {courseInstructor.phone}
          </div>
        </div>
      ),
    },
    {
      key: "educationWork",
      header: "Education & Work",
      className: "text-center",
      render: (courseInstructor) => (
        <div className="text-sm space-y-1">
          <div>
            <strong>Education:</strong> {courseInstructor.education}
          </div>
          <div>
            <strong>Occupation:</strong> {courseInstructor.occupation}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (courseInstructor) => (
        <Badge className={`${getStatusColor(courseInstructor.status)} border`}>
          {courseInstructor.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (courseInstructor) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCourseInstructorEdit?.(courseInstructor)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onCourseInstructorDelete?.(courseInstructor.id.toString())
            }
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
      key: "bloodGroup",
      label: "Blood Group",
      options: [
        { value: "all", label: "All Blood Groups" },
        ...uniqueBloodGroups.map((bloodGroup) => ({
          value: bloodGroup,
          label: bloodGroup,
        })),
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

  const sortOptions: AdminTableSortOption[] = [
    { value: "dateJoined", label: "Date Joined" },
    { value: "name", label: "Name" },
    { value: "city", label: "City" },
  ];

  return (
    <AdminTable
      data={paginatedData}
      loading={false}
      columns={columns}
      getRowId={(courseInstructor) => courseInstructor.id.toString()}
      renderMainCell={(courseInstructor) => (
        <div className="flex flex-col">
          <div className="font-medium text-gray-900">
            {courseInstructor.name}
          </div>
          <div className="text-sm text-gray-500">
            {courseInstructor.instructorId} • Age{" "}
            {calculateAge(courseInstructor.dob)} • {courseInstructor.bloodGroup}
          </div>
          <div className="text-xs text-primary font-medium">
            {courseInstructor.city} • {courseInstructor.education}
          </div>
        </div>
      )}
      renderExpandedContent={(courseInstructor) => (
        <CourseInstructorDetails
          courseInstructor={courseInstructor}
          lastRow={false}
          expandedRows={expandedChildren}
          onToggleRow={toggleRow}
          onCourseInstructorUpdate={onCourseInstructorUpdate}
        />
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
  );
}
