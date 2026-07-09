"use client";

import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, StatusBadge, MoneyCell } from "@/components/shared";
import type { DataTableColumn } from "@/components/shared";
import type { FranchisePaymentSummary } from "@/services/payment.service";
import { useAdminFranchisePaymentSummaries } from "@/hooks/api/payment.hooks";
import { usePaginatedListState } from "@/hooks/use-paginated-list-state";
import FranchisePaymentsDetails from "./FranchisePaymentsDetails";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

interface PaymentsTableProps {
  franchiseId?: string;
}

export default function PaymentsTable({
  franchiseId,
}: PaymentsTableProps = {}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [limit, setLimit] = useState<number>(10);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const queryParams = useMemo(
    () => ({
      page: currentPage,
      limit,
      search: searchTerm || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      ...(franchiseId?.trim() ? { franchiseId: franchiseId.trim() } : {}),
    }),
    [currentPage, limit, searchTerm, dateFrom, dateTo, franchiseId],
  );

  const summariesQuery = useAdminFranchisePaymentSummaries(queryParams);
  const {
    rows: summaries,
    total,
    totalPages,
    loading,
  } = usePaginatedListState(summariesQuery);

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
        <MoneyCell amount={s.totalAmount} className="font-medium" />
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {/* Date range filter row */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="payments-date-from" className="text-xs text-muted-foreground">
            From
          </Label>
          <input
            id="payments-date-from"
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="payments-date-to" className="text-xs text-muted-foreground">
            To
          </Label>
          <input
            id="payments-date-to"
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => {
              setDateTo(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setCurrentPage(1);
            }}
            className="h-9 self-end rounded-md px-3 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear dates
          </button>
        )}
        <div className="ml-auto flex items-end gap-2">
          <Label className="text-xs text-muted-foreground">Rows</Label>
          <Select
            value={String(limit)}
            onValueChange={(v) => {
              setLimit(Number(v));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
    </div>
  );
}
