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

  // Table configuration
  const columns: AdminTableColumn<AdminCourseInstructorData>[] = [
    {
      key: "instructor",
      header: "Instructor",
      className: "w-[300px]",
    },
    {
      key: "franchise",
      header: "Franchise",
      className: "text-center",
      render: (instructor) => instructor.franchiseName || "N/A",
    },
    {
      key: "instructorId",
      header: "Instructor ID",
      className: "text-center",
      render: (instructor) => (
        <span className="text-sm text-gray-600">{instructor.instructorId}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
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
          <div className="text-sm text-gray-500">{instructor.mail}</div>
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
