"use client";

import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  ExpandedDetailSection,
  ExpandedDetailSurface,
  StatusBadge,
  TableMainCell,
  type DataTableColumn,
  type DataTableFilter,
  type DataTableSortOption,
} from "@/components/shared";
import type { PaymentData } from "@/services/payment.service";
import { useAdminFranchisePayments } from "@/hooks/api/payment.hooks";
import { methodBadgeClass, methodLabel, typeBadgeClass, typeLabel } from "@/lib/payment-details-display";
import { PaymentDetailDialog } from "./PaymentDetailDialog";

interface FranchisePaymentsDetailsProps {
  franchiseId: string;
  franchiseName: string;
}

const SORT_OPTIONS: DataTableSortOption[] = [
  { value: "createdAt", label: "Date" },
  { value: "amount", label: "Amount" },
];

const filters: DataTableFilter[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "all", label: "All statuses" },
      { value: "completed", label: "Completed" },
      { value: "pending", label: "Pending" },
      { value: "failed", label: "Failed" },
      { value: "refunded", label: "Refunded" },
    ],
    defaultValue: "all",
  },
  {
    key: "type",
    label: "Type",
    options: [
      { value: "all", label: "All types" },
      { value: "franchise_fee", label: "Franchise Fee" },
      { value: "ci_training_fee", label: "CI Training Fee" },
      { value: "order_payment", label: "Order Payment" },
    ],
    defaultValue: "all",
  },
  {
    key: "method",
    label: "Method",
    options: [
      { value: "all", label: "All methods" },
      { value: "card", label: "Card" },
      { value: "upi", label: "UPI" },
      { value: "netbanking", label: "Netbanking" },
      { value: "wallet", label: "Wallet" },
    ],
    defaultValue: "all",
  },
];

export default function FranchisePaymentsDetails({
  franchiseId,
  franchiseName,
}: FranchisePaymentsDetailsProps) {
  const [paymentsPage, setPaymentsPage] = useState(1);
  const paymentsLimit = 10;
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);

  const queryParams = useMemo(
    () => ({
      page: paymentsPage,
      limit: paymentsLimit,
      search: searchTerm || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      type: typeFilter === "all" ? undefined : typeFilter,
      method: methodFilter === "all" ? undefined : methodFilter,
      sortBy,
      sortOrder,
    }),
    [paymentsPage, searchTerm, statusFilter, typeFilter, methodFilter, sortBy, sortOrder],
  );

  const paymentsQuery = useAdminFranchisePayments(franchiseId || null, queryParams);
  const payments = paymentsQuery.data?.data ?? [];
  const totalPaymentsCount = paymentsQuery.data?.meta.total ?? 0;
  const totalPages = paymentsQuery.data?.meta.totalPages ?? 1;
  const loading = paymentsQuery.isLoading && !paymentsQuery.data;

  function resetPage() {
    setPaymentsPage(1);
  }

  const columns: DataTableColumn<PaymentData>[] = [
    { key: "payment", header: "Payment" },
    {
      key: "type",
      header: "Type",
      render: (payment) => (
        <Badge variant="outline" className={typeBadgeClass(payment.type)}>
          {typeLabel(payment.type)}
        </Badge>
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
        payment.createdAt
          ? new Date(payment.createdAt).toLocaleDateString("en-IN")
          : "N/A",
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right",
      render: (payment) => `Rs. ${payment.amount.toLocaleString("en-IN")}`,
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
    <ExpandedDetailSurface className="border-t border-border/60">
      <ExpandedDetailSection title="Payments">
        {!franchiseId ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Payments not scoped to a specific franchise.
          </p>
        ) : (
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
                  `#${payment.id}`
                }
              />
            )}
            searchPlaceholder="Search by order or payment ID..."
            onSearchChange={(value) => {
              setSearchTerm(value);
              resetPage();
            }}
            filters={filters}
            onFilterChange={(key, value) => {
              const v = value as string;
              if (key === "status") setStatusFilter(v);
              else if (key === "type") setTypeFilter(v);
              else if (key === "method") setMethodFilter(v);
              resetPage();
            }}
            sortOptions={SORT_OPTIONS}
            defaultSortBy="createdAt"
            defaultSortOrder="DESC"
            onSortChange={(by, order) => {
              setSortBy(by);
              setSortOrder(order);
              resetPage();
            }}
            pagination={{ total: totalPaymentsCount, totalPages }}
            currentPage={paymentsPage}
            onPageChange={setPaymentsPage}
            itemsPerPage={paymentsLimit}
            emptyMessage="No payments found"
            resultsText={(count, total) =>
              `Showing ${count} of ${total} payments`
            }
          />
        )}
      </ExpandedDetailSection>

      <PaymentDetailDialog
        payment={selectedPayment}
        franchiseName={franchiseName}
        onClose={() => setSelectedPayment(null)}
      />
    </ExpandedDetailSurface>
  );
}
