"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableSortOption,
} from "@/components/shared";
import {
  AdminCourseInstructorData,
  getPaginatedCourseInstructors,
  resendCourseInstructorCredentialsEmail,
} from "@/services/course-instructor.service";
import CourseInstructorDetails from "./CourseInstructorDetails";
import { useToast } from "@/hooks/use-toast";
import { FileText, RefreshCw } from "lucide-react";
import { AdminCIAgreementDialog } from "@/components/agreements/AdminCIAgreementDialog";

interface ApprovedCourseInstructorsTableProps {}

export default function ApprovedCourseInstructorsTable({
}: ApprovedCourseInstructorsTableProps) {
  const { toast } = useToast();
  const isDevEnvironment = process.env.NODE_ENV !== "production";
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set());
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [agreementInstructor, setAgreementInstructor] = useState<{
    id: number;
    name?: string;
    programId?: number;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const limit = 10;

  const resendMutation = useMutation({
    mutationFn: async (courseInstructorId: number) => {
      setResendingId(courseInstructorId);
      await resendCourseInstructorCredentialsEmail(courseInstructorId);
    },
    onSuccess: () => {
      toast({
        title: "Credentials email resent",
        description: "A new CI login email has been sent.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to resend email",
        description:
          error?.response?.data?.message ??
          "Could not resend credentials email.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setResendingId(null);
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "course-instructors",
      "admin",
      "status",
      "Approved",
      { page: currentPage, limit, searchTerm, sortBy, sortOrder },
    ],
    queryFn: () =>
      getPaginatedCourseInstructors("Approved", {
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
      render: (instructor) => <Badge variant="default">{instructor.status}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[140px]",
      render: (instructor) => (
        <div className="flex items-center gap-1">
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
          {isDevEnvironment ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Resend CI credentials email"
              aria-label="Resend CI credentials email"
              disabled={resendMutation.isPending}
              onClick={() => resendMutation.mutate(instructor.id)}
            >
              <RefreshCw
                className={`h-4 w-4 ${resendMutation.isPending && resendingId === instructor.id ? "animate-spin" : ""}`}
              />
            </Button>
          ) : null}
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
      emptyMessage="No approved instructors found matching your criteria"
      resultsText={(count, pageTotal) =>
        `Showing ${count} of ${pageTotal} approved instructors`
      }
      />

      <AdminCIAgreementDialog
        instructor={agreementInstructor}
        onClose={() => setAgreementInstructor(null)}
      />
    </>
  );
}
