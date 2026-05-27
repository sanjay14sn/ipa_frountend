"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  ExpandedDetailSurface,
  KeyFactCard,
  KeyFactsGrid,
  ProfileCard,
  ProfileCardSection,
  StatusBadge,
  TableMainCell,
} from "@/components/shared";
import type { DataTableColumn, DataTableSortOption } from "@/components/shared";
import {
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Users,
  X,
  XCircle,
} from "lucide-react";
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
      className: "w-[260px]",
    },
    {
      key: "city",
      header: "City",
      render: (ci) => ci.city || "—",
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (ci) => <StatusBadge label={ci.status} />,
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
      <div className="space-y-3 p-3 md:p-4">
        <KeyFactsGrid columns={4}>
          <KeyFactCard
            icon={Building2}
            label="Franchise"
            value={franchiseName}
          />
          <KeyFactCard icon={Clock} label="Pending" value={totalPending} />
          <KeyFactCard
            icon={CheckCircle2}
            label="Approved"
            value={totalApproved}
          />
          <KeyFactCard
            icon={XCircle}
            label="Rejected"
            value={totalRejected}
          />
        </KeyFactsGrid>

        <ProfileCard contentClassName="space-y-2 p-3 md:p-4">
          <ProfileCardSection icon={Users} label="Pending applications">
            <DataTable
              data={instructors}
              loading={loading}
              columns={columns}
              getRowId={(ci) => ci.id.toString()}
              renderMainCell={(ci) => (
                <TableMainCell title={ci.name} subtitle={ci.instructorId} />
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
              resultsText={(count, t) =>
                `Showing ${count} of ${t} pending applications`
              }
            />
          </ProfileCardSection>
        </ProfileCard>
      </div>
    </ExpandedDetailSurface>
  );
}
