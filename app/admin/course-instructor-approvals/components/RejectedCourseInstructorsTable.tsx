"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { AdminTable } from "@/components/shared";
import type {
  AdminTableColumn,
  AdminTableSortOption,
} from "@/components/shared/AdminTable";
import {
  AdminCourseInstructorData,
  getPaginatedCourseInstructors,
  getInstructorTrainingLevelCount,
} from "@/services/course-instructor.service";
import CourseInstructorDetails from "./CourseInstructorDetails";

interface RejectedCourseInstructorsTableProps {
  refreshTrigger: number;
}

export default function RejectedCourseInstructorsTable({
  refreshTrigger,
}: RejectedCourseInstructorsTableProps) {
  const [instructors, setInstructors] = useState<AdminCourseInstructorData[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );

  // Pagination & Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const limit = 10;

  // Fetch data
  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        setLoading(true);
        const result = await getPaginatedCourseInstructors("Rejected", {
          page: currentPage,
          limit,
          search: searchTerm,
          sortBy,
          sortOrder,
        });
        setInstructors(result.data);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
      } catch (error) {
        console.error("Error fetching course instructors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInstructors();
  }, [currentPage, searchTerm, sortBy, sortOrder, refreshTrigger]);

  const toggleRow = (id: string) => {
    const newExpandedChildren = new Set(expandedChildren);
    if (newExpandedChildren.has(id)) {
      newExpandedChildren.delete(id);
    } else {
      newExpandedChildren.add(id);
    }
    setExpandedChildren(newExpandedChildren);
  };

  // Helper function to calculate age
  const calculateAge = (dateOfBirth: string | Date): number => {
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

  // Table configuration
  const columns: AdminTableColumn<AdminCourseInstructorData>[] = [
    {
      key: "instructor",
      header: "Instructor",
      className: "w-[300px]",
    },
    {
      key: "contact",
      header: "Contact",
      className: "w-[200px]",
      render: (instructor) => (
        <div className="flex flex-col text-sm">
          <span className="text-gray-900">{instructor.phone || "N/A"}</span>
          <span className="text-gray-500 text-xs">{instructor.mail || "N/A"}</span>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      className: "w-[150px]",
      render: (instructor) => (
        <div className="flex flex-col text-sm">
          <span className="text-gray-900">{instructor.city || "N/A"}</span>
          {instructor.address && (
            <span className="text-gray-500 text-xs truncate" title={instructor.address}>
              {instructor.address.length > 30 
                ? instructor.address.substring(0, 30) + "..." 
                : instructor.address}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "professional",
      header: "Professional",
      className: "w-[200px]",
      render: (instructor) => (
        <div className="flex flex-col text-sm">
          <span className="text-gray-900">{instructor.education || "N/A"}</span>
          <span className="text-gray-500 text-xs">{instructor.occupation || "N/A"}</span>
        </div>
      ),
    },
    {
      key: "personal",
      header: "Personal Info",
      className: "w-[150px]",
      render: (instructor) => (
        <div className="flex flex-col text-sm">
          <span className="text-gray-900">
            {instructor.dob 
              ? `${calculateAge(instructor.dob)} years` 
              : "N/A"}
          </span>
          <span className="text-gray-500 text-xs">
            {instructor.bloodGroup || "N/A"}
          </span>
        </div>
      ),
    },
    {
      key: "franchise",
      header: "Franchise",
      className: "text-center w-[150px]",
      render: (instructor) => (
        <span className="text-sm font-medium">{instructor.franchise?.name || "N/A"}</span>
      ),
    },
    {
      key: "instructorId",
      header: "Instructor ID",
      className: "text-center w-[120px]",
      render: (instructor) => (
        <span className="text-sm text-gray-600 font-mono">{instructor.instructorId}</span>
      ),
    },
    {
      key: "trainingLevels",
      header: "Training Levels",
      className: "w-[200px]",
      render: (instructor) => {
        const levelCount = getInstructorTrainingLevelCount(instructor);
        if (levelCount === 0) {
          return <span className="text-sm text-gray-400">No training levels</span>;
        }
        return (
          <span className="text-sm font-medium text-gray-700">
            {levelCount} level(s)
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      className: "text-center w-[100px]",
      render: (instructor) => (
        <Badge variant="destructive">{instructor.status}</Badge>
      ),
    },
  ];

  const sortOptions: AdminTableSortOption[] = [
    { value: "name", label: "Name" },
    { value: "createdAt", label: "Date" },
  ];

  return (
    <AdminTable
      data={instructors}
      loading={loading}
      columns={columns}
      getRowId={(instructor) => instructor.id.toString()}
      renderMainCell={(instructor) => (
        <div className="flex flex-col">
          <div className="font-medium text-gray-900">{instructor.name}</div>
          <div className="text-sm text-gray-500">
            ID: {instructor.instructorId} • {instructor.franchise?.name || "No Franchise"}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {instructor.education && `${instructor.education} • `}
            {instructor.city || "Location N/A"}
          </div>
        </div>
      )}
      renderExpandedContent={(instructor) => (
        <CourseInstructorDetails
          instructors={[instructor]}
          lastRow={false}
          expandedRows={new Set([instructor.id.toString()])}
          onToggleRow={toggleRow}
          onApprove={() => {}}
          onReject={() => {}}
          showActions={false}
        />
      )}
      searchPlaceholder="Search instructors, instructor IDs, or franchises..."
      onSearchChange={setSearchTerm}
      sortOptions={sortOptions}
      defaultSortBy="createdAt"
      defaultSortOrder="DESC"
      onSortChange={(newSortBy, newSortOrder) => {
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
      }}
      pagination={{ total, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={limit}
      emptyMessage="No rejected instructors found matching your criteria"
      resultsText={(count, total) =>
        `Showing ${count} of ${total} rejected instructors`
      }
    />
  );
}
