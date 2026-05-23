"use client";

import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable, StatusBadge } from "@/components/shared";
import type { DataTableColumn } from "@/components/shared";
import type { FranchisePaymentSummary } from "@/services/payment.service";
import { useAdminFranchisePaymentSummaries } from "@/hooks/api/payment.hooks";
import FranchisePaymentsDetails from "./FranchisePaymentsDetails";

interface PaymentsTableProps {
  franchiseId?: string;
}

export default function PaymentsTable({ franchiseId }: PaymentsTableProps = {}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const limit = 10;

  const queryParams = useMemo(
    () => ({
      page: currentPage,
      limit,
      search: searchTerm || undefined,
      ...(franchiseId?.trim() ? { franchiseId: franchiseId.trim() } : {}),
    }),
    [currentPage, searchTerm, franchiseId],
  );

  const summariesQuery = useAdminFranchisePaymentSummaries(queryParams);
  const summaries = summariesQuery.data?.data ?? [];
  const total = summariesQuery.data?.meta.total ?? 0;
  const totalPages = summariesQuery.data?.meta.totalPages ?? 1;
  const loading = summariesQuery.isLoading && !summariesQuery.data;

  const columns: DataTableColumn<FranchisePaymentSummary>[] = [
    {
      key: "franchise",
      header: "Franchise",
      className: "w-[280px]",
    },
    {
      key: "totalPayments",
      header: "Payments",
      className: "text-center",
      render: (s) => (
        <Badge variant="secondary">
          {s.totalPayments}
        </Badge>
      ),
    },
    {
      key: "totalPending",
      header: "Pending",
      className: "text-center",
      render: (s) => (
        <StatusBadge tone="warning" label={String(s.totalPending)} />
      ),
    },
    {
      key: "totalAmount",
      header: "Collected",
      className: "text-center",
      render: (s) => (
        <span className="font-medium">
          ₹{s.totalAmount.toLocaleString("en-IN")}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      data={summaries}
      loading={loading}
      columns={columns}
      getRowId={(s) => s.franchiseId ?? s.franchiseName}
      renderMainCell={(s) => (
        <span className="font-medium text-gray-900">{s.franchiseName}</span>
      )}
      renderExpandedContent={(s) => (
        <FranchisePaymentsDetails
          franchiseId={s.franchiseId ?? ""}
          franchiseName={s.franchiseName}
          totalCompleted={s.totalCompleted}
          totalPending={s.totalPending}
          totalAmount={s.totalAmount}
        />
      )}
      searchPlaceholder="Search by franchise or franchisee..."
      onSearchChange={(value) => {
        setSearchTerm(value);
        setCurrentPage(1);
      }}
      pagination={{ total, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={limit}
      emptyMessage="No franchise payment data found"
      resultsText={(_, total) =>
        franchiseId?.trim()
          ? `Showing payments summary for this franchise`
          : `${total} franchise${total !== 1 ? "s" : ""} with payments`
      }
    />
  );
}
