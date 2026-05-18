"use client";

import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared";
import type { DataTableColumn } from "@/components/shared";
import type { CIFranchiseSummary } from "@/hooks/api/course-instructor.hooks";
import { useAdminCISummaries } from "@/hooks/api/course-instructor.hooks";
import type { AdminCourseInstructorData } from "@/services/course-instructor.service";
import FranchiseCiDetails from "./FranchiseCiDetails";

interface CiApprovalsSummaryTableProps {
  refreshTrigger: number;
  onApprove: (instructor: AdminCourseInstructorData) => void;
  onReject: (instructor: AdminCourseInstructorData) => void;
}

export default function CiApprovalsSummaryTable({
  refreshTrigger,
  onApprove,
  onReject,
}: CiApprovalsSummaryTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const limit = 10;

  const requestParams = useMemo(
    () => ({
      page: currentPage,
      limit,
      search: searchTerm || undefined,
    }),
    [currentPage, searchTerm],
  );

  const summariesQuery = useAdminCISummaries(requestParams, refreshTrigger);
  const summaries = summariesQuery.data?.data ?? [];
  const total = summariesQuery.data?.meta.total ?? 0;
  const totalPages = summariesQuery.data?.meta.totalPages ?? 1;
  const loading = summariesQuery.isLoading && !summariesQuery.data;

  const columns: DataTableColumn<CIFranchiseSummary>[] = [
    {
      key: "franchise",
      header: "Franchise",
      className: "w-[300px]",
    },
    {
      key: "pending",
      header: "Pending",
      className: "text-center",
      render: (g) => (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
          {g.totalPending} pending
        </Badge>
      ),
    },
    {
      key: "approved",
      header: "Approved",
      className: "text-center",
      render: (g) => (
        <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">
          {g.totalApproved} approved
        </Badge>
      ),
    },
    {
      key: "rejected",
      header: "Rejected",
      className: "text-center",
      render: (g) => (
        <Badge variant="destructive">
          {g.totalRejected} rejected
        </Badge>
      ),
    },
  ];

  return (
    <DataTable
      data={summaries}
      loading={loading}
      columns={columns}
      getRowId={(g) => g.franchiseId}
      renderMainCell={(g) => (
        <div className="flex flex-col">
          <div className="font-medium text-gray-900">{g.franchiseName}</div>
        </div>
      )}
      renderExpandedContent={(g) => (
        <FranchiseCiDetails
          franchiseId={g.franchiseId}
          franchiseName={g.franchiseName}
          totalPending={g.totalPending}
          totalApproved={g.totalApproved}
          totalRejected={g.totalRejected}
          onApprove={onApprove}
          onReject={onReject}
        />
      )}
      searchPlaceholder="Search franchises..."
      onSearchChange={(value) => {
        setSearchTerm(value);
        setCurrentPage(1);
      }}
      pagination={{ total, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={limit}
      emptyMessage="No franchise CI activity found"
      resultsText={(_, t) =>
        `${t} franchise${t !== 1 ? "es" : ""} with CI applications`
      }
    />
  );
}
