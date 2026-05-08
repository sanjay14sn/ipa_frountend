"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableSortOption,
} from "@/components/shared";
import { Check, X } from "lucide-react";
import {
  AdminCourseInstructorData,
  getPaginatedCourseInstructors,
} from "@/services/course-instructor.service";
import CourseInstructorDetails from "./CourseInstructorDetails";

interface PendingCourseInstructorsTableProps {
  onApprove: (instructor: AdminCourseInstructorData) => void;
  onReject: (instructor: AdminCourseInstructorData) => void;
}

export default function PendingCourseInstructorsTable({
  onApprove,
  onReject,
}: PendingCourseInstructorsTableProps) {
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
      "Pending",
      { page: currentPage, limit, searchTerm, sortBy, sortOrder },
    ],
    queryFn: () =>
      getPaginatedCourseInstructors("Pending", {
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
    {
      key: "instructor",
      header: "Instructor",
      className: "w-[360px]",
    },
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
      render: (instructor) => (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
          {instructor.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[96px] text-center",
      render: (instructor) => (
        <div className="flex w-full items-center justify-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onApprove(instructor)}
            title="Approve"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onReject(instructor)}
            title="Reject"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ),
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
          onApprove={onApprove}
          onReject={onReject}
          showActions
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
      emptyMessage="No course instructors found matching your criteria"
      resultsText={(count, pageTotal) =>
        `Showing ${count} of ${pageTotal} course instructors`
      }
    />
  );
}
