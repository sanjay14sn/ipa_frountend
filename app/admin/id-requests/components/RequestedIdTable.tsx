"use client";

import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared";
import type { DataTableColumn } from "@/components/shared";
import type { IdCardFranchiseSummary } from "@/services/student.service";
import { useAdminIdCardSummaries } from "@/hooks/api/student.hooks";
import FranchiseIdDetails from "./FranchiseIdDetails";

interface RequestedIdTableProps {
  refreshTrigger: number;
  scopedFranchiseId?: string;
  onIssueSuccess?: () => void;
}

export default function RequestedIdTable({
  refreshTrigger,
  scopedFranchiseId,
  onIssueSuccess,
}: RequestedIdTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const limit = 10;

  const requestParams = useMemo(
    () => ({
      page: currentPage,
      limit,
      search: searchTerm || undefined,
      ...(scopedFranchiseId?.trim()
        ? { franchiseId: scopedFranchiseId.trim() }
        : {}),
    }),
    [currentPage, searchTerm, scopedFranchiseId],
  );

  const summariesQuery = useAdminIdCardSummaries(requestParams, refreshTrigger);
  const summaries = summariesQuery.data?.data ?? [];
  const total = summariesQuery.data?.meta.total ?? 0;
  const totalPages = summariesQuery.data?.meta.totalPages ?? 1;
  const loading = summariesQuery.isLoading && !summariesQuery.data;

  const columns: DataTableColumn<IdCardFranchiseSummary>[] = [
    {
      key: "franchise",
      header: "Franchise",
      className: "w-[300px]",
    },
    {
      key: "requested",
      header: "Requested",
      className: "text-center",
      render: (g) => (
        <Badge variant="secondary">
          {g.totalRequested} request{g.totalRequested !== 1 ? "s" : ""}
        </Badge>
      ),
    },
    {
      key: "issued",
      header: "Issued",
      className: "text-center",
      render: (g) => (
        <Badge variant="outline" className="border-green-300 text-green-700">
          {g.totalIssued} issued
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
        <FranchiseIdDetails
          franchiseId={g.franchiseId}
          franchiseName={g.franchiseName}
          totalRequested={g.totalRequested}
          totalIssued={g.totalIssued}
          onIssueSuccess={onIssueSuccess}
        />
      )}
      searchPlaceholder="Search students, roll numbers, or franchises..."
      onSearchChange={(value) => {
        setSearchTerm(value);
        setCurrentPage(1);
      }}
      pagination={{ total, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={limit}
      emptyMessage="No ID request activity found for franchises"
      resultsText={(_, t) =>
        `${t} franchise${t !== 1 ? "es" : ""} with ID requests`
      }
    />
  );
}
