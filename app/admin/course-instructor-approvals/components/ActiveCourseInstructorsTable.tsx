"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableSortOption,
} from "@/components/shared";
import {
  AdminCourseInstructorData,
  getPaginatedCourseInstructors,
} from "@/services/course-instructor.service";
import CourseInstructorDetails from "./CourseInstructorDetails";
import { BarChart2, FileText } from "lucide-react";
import { AdminCIAgreementDialog } from "@/components/agreements/AdminCIAgreementDialog";
import { AdminTrainingProgressModal } from "@/components/shared/AdminTrainingProgressModal";

export default function ActiveCourseInstructorsTable() {
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set());
  const [agreementInstructor, setAgreementInstructor] = useState<{
    id: number;
    name?: string;
    programId?: number;
  } | null>(null);
  const [progressModal, setProgressModal] = useState<{ id: number; name: string; programId: number } | null>(null);
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
      // "valid" = derived operational filter (latest CI agreement is Valid).
      "valid",
      { page: currentPage, limit, searchTerm, sortBy, sortOrder },
    ],
    queryFn: () =>
      getPaginatedCourseInstructors("valid", {
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
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedChildren(next);
  };

  const columns: DataTableColumn<AdminCourseInstructorData>[] = [
    {
      key: "instructor",
      header: "Instructor",
    },
    {
      key: "city",
      header: "City",
      render: (instructor) => instructor.city || "—",
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (instructor) => (
        <StatusBadge label={instructor.operationalStatus ?? "valid"} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[100px]",
      render: (instructor) => (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="View training progress"
            aria-label="View training progress"
            onClick={() =>
              setProgressModal({
                id: instructor.id,
                name: instructor.name,
                programId: instructor.programId,
              })
            }
          >
            <BarChart2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="View CI agreement"
            aria-label="View CI agreement"
            onClick={() =>
              setAgreementInstructor({
                id: instructor.id,
                name: instructor.name,
                programId: instructor.programId,
              })
            }
          >
            <FileText className="h-4 w-4" />
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
    <>
      <DataTable
        data={instructors}
        loading={isLoading}
        columns={columns}
        getRowId={(instructor) => instructor.id.toString()}
        renderMainCell={(instructor) => (
          <span className="font-medium text-card-foreground">
            {instructor.name}
            {instructor.instructorId ? (
              <span className="ml-2 text-xs text-muted-foreground">
                · {instructor.instructorId}
              </span>
            ) : null}
          </span>
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
        emptyMessage="No active instructors found matching your criteria"
        resultsText={(count, pageTotal) =>
          `Showing ${count} of ${pageTotal} active instructors`
        }
      />

      <AdminCIAgreementDialog
        instructor={agreementInstructor}
        onClose={() => setAgreementInstructor(null)}
      />

      {progressModal && (
        <AdminTrainingProgressModal
          isOpen={true}
          onClose={() => setProgressModal(null)}
          instructorId={progressModal.id}
          instructorName={progressModal.name}
          programId={progressModal.programId}
        />
      )}
    </>
  );
}
