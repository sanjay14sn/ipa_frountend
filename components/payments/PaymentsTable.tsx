"use client";

import React, { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, StatusBadge, MoneyCell, TableMainCell } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableSortOption,
} from "@/components/shared";
import type { PaymentData } from "@/services/payment.service";
import { useAdminPaymentsPaginated } from "@/hooks/api/payment.hooks";
import { useListParams } from "@/hooks/use-list-params";
import { methodBadgeClass, methodLabel, typeBadgeClass, typeLabel } from "@/lib/payment-details-display";
import { PaymentDetailDialog } from "./PaymentDetailDialog";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const SORT_OPTIONS: DataTableSortOption[] = [
  { value: "createdAt", label: "Date" },
  { value: "amount", label: "Amount" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "franchise_fee", label: "Franchise Fee" },
  { value: "renewal_fee", label: "Renewal Fee" },
  { value: "ci_training_fee", label: "CI Training Fee" },
  { value: "order_payment", label: "Order Payment" },
];

const METHOD_OPTIONS = [
  { value: "all", label: "All methods" },
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
  { value: "netbanking", label: "Netbanking" },
  { value: "wallet", label: "Wallet" },
];

export default function PaymentsTable() {
  const listParams = useListParams({
    filterDefaults: { status: "all", type: "all", method: "all" },
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    // Orders/shipping tables on the same hub URL own the unprefixed ?q=/?page=
    prefix: "pay",
  });
  const [limit, setLimit] = useState<number>(10);
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);

  const sortBy = listParams.sortBy ?? "createdAt";
  const sortOrder: "ASC" | "DESC" = listParams.sortOrder === "asc" ? "ASC" : "DESC";
  const { status, type, method } = listParams.filters;

  const queryParams = useMemo(
    () => ({
      page: listParams.page,
      limit,
      search: listParams.search || undefined,
      status: status === "all" ? undefined : status,
      type: type === "all" ? undefined : type,
      method: method === "all" ? undefined : method,
      sortBy,
      sortOrder,
    }),
    [listParams.page, limit, listParams.search, status, type, method, sortBy, sortOrder],
  );

  const paymentsQuery = useAdminPaymentsPaginated(queryParams);
  const payments = paymentsQuery.data?.data ?? [];
  const total = paymentsQuery.data?.meta.total ?? 0;
  const totalPages = paymentsQuery.data?.meta.totalPages ?? 1;
  const loading = paymentsQuery.isLoading && !paymentsQuery.data;

  // defaultValue seeds DataTable's uncontrolled selects from the URL on mount
  const filters: DataTableFilter[] = [
    { key: "status", label: "Status", options: STATUS_OPTIONS, defaultValue: status },
    { key: "type", label: "Type", options: TYPE_OPTIONS, defaultValue: type },
    { key: "method", label: "Method", options: METHOD_OPTIONS, defaultValue: method },
  ];

  const columns: DataTableColumn<PaymentData>[] = [
    { key: "payment", header: "Payment" },
    {
      key: "franchise",
      header: "Franchise",
      render: (payment) => (
        <div className="min-w-0">
          <div className="truncate text-sm">{payment.franchiseName}</div>
          {payment.franchisee?.name ? (
            <div className="truncate text-xs text-muted-foreground">
              {payment.franchisee.name}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "order",
      header: "Order",
      render: (payment) =>
        payment.orderReferenceId ? (
          <span className="text-sm">{payment.orderReferenceId}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "type",
      header: "Type",
      render: (payment) => (
        <div className="min-w-0">
          <Badge variant="outline" className={typeBadgeClass(payment.type)}>
            {typeLabel(payment.type)}
          </Badge>
          {payment.courseInstructor?.name ? (
            <div className="mt-1 truncate text-xs text-muted-foreground">
              {payment.courseInstructor.name}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (payment) =>
        payment.method ? (
          <Badge variant="outline" className={methodBadgeClass(payment.method)}>
            {methodLabel(payment.method)}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (payment) => <StatusBadge label={payment.status ?? "Unknown"} />,
    },
    {
      key: "date",
      header: "Date",
      render: (payment) =>
        payment.createdAt ? formatDate(payment.createdAt) : "N/A",
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right",
      render: (payment) => <MoneyCell amount={payment.amount} className="font-medium" />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (payment) => (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="View payment"
          aria-label="View payment"
          onClick={() => setSelectedPayment(payment)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={payments}
        loading={loading}
        columns={columns}
        getRowId={(payment) => String(payment.id)}
        renderMainCell={(payment) => (
          <TableMainCell
            title={
              payment.razorpayPaymentId ||
              payment.razorpayOrderId ||
              "—"
            }
          />
        )}
        initialSearchValue={listParams.search}
        searchPlaceholder="Search by franchise, order, or payment ID..."
        onSearchChange={listParams.setSearch}
        filters={filters}
        onFilterChange={(key, value) => {
          const v = Array.isArray(value) ? value[0] : value;
          listParams.setFilter(key as "status" | "type" | "method", v || "all");
        }}
        sortOptions={SORT_OPTIONS}
        defaultSortBy={sortBy}
        defaultSortOrder={sortOrder}
        onSortChange={(by, order) =>
          listParams.setSort(by, order === "ASC" ? "asc" : "desc")
        }
        pagination={{ total, totalPages }}
        currentPage={listParams.page}
        onPageChange={listParams.setPage}
        itemsPerPage={limit}
        toolbarActions={
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Rows</Label>
            <Select
              value={String(limit)}
              onValueChange={(v) => {
                setLimit(Number(v));
                listParams.setPage(1);
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
        }
        error={paymentsQuery.error}
        onRetry={() => void paymentsQuery.refetch()}
        errorMessage="Couldn't load payments."
        emptyMessage="No payments match the current filters"
        resultsText={(count, tot) =>
          `Showing ${count} of ${tot} payment${tot !== 1 ? "s" : ""}`
        }
      />

      <PaymentDetailDialog
        payment={selectedPayment}
        franchiseName={selectedPayment?.franchiseName ?? ""}
        onClose={() => setSelectedPayment(null)}
      />
    </>
  );
}
