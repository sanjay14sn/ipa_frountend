"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared";
import type { DataTableColumn, DataTableSortOption } from "@/components/shared";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import { Separator } from "@/components/ui/separator";
import { Check, X } from "lucide-react";
import { useAdminCIDetails } from "@/hooks/api/course-instructor.hooks";
import type { AdminCourseInstructorData } from "@/services/course-instructor.service";
import CourseInstructorDetails from "./CourseInstructorDetails";

interface FranchiseCiDetailsProps {
  franchiseId: string;
  franchiseName: string;
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  onApprove: (instructor: AdminCourseInstructorData) => void;
  onReject: (instructor: AdminCourseInstructorData) => void;
}

export default function FranchiseCiDetails({
  franchiseId,
  franchiseName,
  totalPending,
  totalApproved,
  totalRejected,
  onApprove,
  onReject,
}: FranchiseCiDetailsProps) {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const limit = 10;

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      search: searchTerm || undefined,
      status: "Pending" as const,
      sortBy,
      sortOrder,
    }),
    [page, searchTerm, sortBy, sortOrder],
  );

  const detailsQuery = useAdminCIDetails(franchiseId, queryParams);
  const instructors = detailsQuery.data?.data ?? [];
  const totalInstructors = detailsQuery.data?.meta.total ?? 0;
  const totalPages = detailsQuery.data?.meta.totalPages ?? 1;
  const loading = detailsQuery.isLoading && !detailsQuery.data;

  const columns: DataTableColumn<AdminCourseInstructorData>[] = [
    {
      key: "instructor",
      header: "Instructor",
      className: "w-[300px]",
    },
    {
      key: "contact",
      header: "Contact",
      className: "w-[150px]",
      render: (ci) => (
        <span className="text-sm text-card-foreground">{ci.phone || "N/A"}</span>
      ),
    },
    {
      key: "location",
      header: "Location",
      className: "w-[150px]",
      render: (ci) => (
        <span className="text-sm text-card-foreground">{ci.city || "N/A"}</span>
      ),
    },
    {
      key: "professional",
      header: "Professional",
      className: "w-[200px]",
      render: (ci) => (
        <span className="text-sm text-card-foreground">
          {[ci.education, ci.occupation].filter(Boolean).join(" · ") || "N/A"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-[110px]",
      render: (ci) => (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
          {ci.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[96px] text-center",
      render: (ci) => (
        <div className="flex w-full items-center justify-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onApprove(ci)}
            title="Approve"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onReject(ci)}
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
    <ExpandedDetailSurface className="border-t border-border/60">
      <ExpandedDetailSection title="CI approval summary">
        <DetailFieldsGrid columns={4}>
          <DetailField label="Franchise" value={franchiseName} />
          <DetailField label="Pending" value={totalPending} />
          <DetailField label="Approved" value={totalApproved} />
          <DetailField label="Rejected" value={totalRejected} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Pending applications">
        <DataTable
          data={instructors}
          loading={loading}
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
            <CourseInstructorDetails
              instructors={[ci]}
              lastRow={false}
              expandedRows={new Set([ci.id.toString()])}
              onToggleRow={() => {}}
              onApprove={onApprove}
              onReject={onReject}
              showActions
            />
          )}
          searchPlaceholder="Search instructors or instructor IDs..."
          onSearchChange={(value) => {
            setSearchTerm(value);
            setPage(1);
          }}
          sortOptions={sortOptions}
          defaultSortBy="createdAt"
          defaultSortOrder="DESC"
          onSortChange={(by, order) => {
            setSortBy(by);
            setSortOrder(order);
          }}
          pagination={{ total: totalInstructors, totalPages }}
          currentPage={page}
          onPageChange={setPage}
          itemsPerPage={limit}
          emptyMessage="No pending applications for this franchise"
          resultsText={(count, t) => `Showing ${count} of ${t} pending applications`}
        />
      </ExpandedDetailSection>
    </ExpandedDetailSurface>
  );
}
