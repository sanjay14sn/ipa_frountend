"use client";

import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared";
import type { DataTableColumn } from "@/components/shared";
import type { CertificateFranchiseSummary } from "@/services/student.service";
import { useAdminCertificateSummaries } from "@/hooks/api/student.hooks";
import FranchiseCertificateDetails from "./FranchiseCertificateDetails";

interface AdminCertificateRequestsTableProps {
  scopedFranchiseId?: string;
}

export default function AdminCertificateRequestsTable({
  scopedFranchiseId,
}: AdminCertificateRequestsTableProps) {
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

  const summariesQuery = useAdminCertificateSummaries(requestParams);
  const summaries = summariesQuery.data?.data ?? [];
  const total = summariesQuery.data?.meta.total ?? 0;
  const totalPages = summariesQuery.data?.meta.totalPages ?? 1;
  const loading = summariesQuery.isLoading && !summariesQuery.data;

  const columns: DataTableColumn<CertificateFranchiseSummary>[] = [
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
        <Badge variant="secondary">
          {g.totalPending} pending
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
    {
      key: "rejected",
      header: "Rejected",
      className: "text-center",
      render: (g) => (
        <Badge variant="outline" className="border-red-300 text-red-700">
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
        <div className="font-medium text-gray-900">{g.franchiseName}</div>
      )}
      renderExpandedContent={(g) => (
        <FranchiseCertificateDetails
          franchiseId={g.franchiseId}
          franchiseName={g.franchiseName}
          totalPending={g.totalPending}
          totalIssued={g.totalIssued}
          totalRejected={g.totalRejected}
        />
      )}
      searchPlaceholder="Search by student name, roll number, instructor, or franchise..."
      onSearchChange={(value) => {
        setSearchTerm(value);
        setCurrentPage(1);
      }}
      pagination={{ total, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={limit}
      emptyMessage="No certificate request activity found for franchises"
      resultsText={(_, t) =>
        `${t} franchise${t !== 1 ? "es" : ""} with certificate requests`
      }
    />
  );
}
