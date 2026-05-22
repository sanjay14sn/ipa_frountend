"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, StatusBadge } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableSortOption,
} from "@/components/shared";
import {
  AdminCourseInstructorData,
  getPaginatedCourseInstructors,
} from "@/services/course-instructor.service";
import CourseInstructorDetails from "./CourseInstructorDetails";

interface RejectedCourseInstructorsTableProps {}

export default function RejectedCourseInstructorsTable({
}: RejectedCourseInstructorsTableProps) {
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: [
      "course-instructors",
      "admin",
      "status",
      "Rejected",
      { page: currentPage, limit, searchTerm, sortBy, sortOrder },
    ],
    queryFn: () =>
      getPaginatedCourseInstructors("Rejected", {
        page: currentPage,
        limit,
        search: searchTerm,
        sortBy,
        sortOrder,
      }),
    placeholderData: (prev) => prev,
  });
  const instructors = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;

  const toggleRow = (id: string) => {
    const next = new Set(expandedChildren);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedChildren(next);
  };

  const columns: DataTableColumn<AdminCourseInstructorData>[] = [
    { key: "instructor", header: "Instructor", className: "w-[360px]" },
    {
      key: "contact",
      header: "Contact",
      className: "w-[170px]",
      render: (instructor) => (
        <span className="text-sm text-card-foreground">{instructor.phone || "N/A"}</span>
      ),
    },
    {
      key: "location",
      header: "Location",
      className: "w-[170px]",
      render: (instructor) => (
        <span className="text-sm text-card-foreground">{instructor.city || "N/A"}</span>
      ),
    },
    {
      key: "professional",
      header: "Professional",
      className: "w-[220px]",
      render: (instructor) => (
        <span className="text-sm text-card-foreground">
          {[instructor.education, instructor.occupation].filter(Boolean).join(" · ") || "N/A"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-[120px]",
      render: (instructor) => <StatusBadge label={instructor.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[56px]",
      render: () => null,
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { value: "name", label: "Name" },
    { value: "createdAt", label: "Date" },
  ];

  return (
    <DataTable
      data={instructors}
      loading={isLoading}
      columns={columns}
      getRowId={(instructor) => instructor.id.toString()}
      renderMainCell={(instructor) => (
        <div className="flex flex-col">
          <div className="font-medium text-card-foreground">{instructor.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {[instructor.education, instructor.city].filter(Boolean).join(" · ") || "Location N/A"}
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
      resultsText={(count, pageTotal) =>
        `Showing ${count} of ${pageTotal} rejected instructors`
      }
    />
  );
}
