"use client";

import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DataTable,
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
  type DataTableColumn,
  type DataTableFilter,
} from "@/components/shared";
import { PaymentData } from "@/services/payment.service";
import { useAdminFranchisePayments } from "@/hooks/api/payment.hooks";
import {
  formatPaymentDateTime,
  formatRsAmount,
  getMethodSpecificFields,
  methodBadgeClass,
  methodLabel,
} from "@/lib/payment-details-display";

interface FranchisePaymentsDetailsProps {
  franchiseId: string;
  franchiseName: string;
  totalCompleted?: number;
  totalPending?: number;
  totalAmount?: number;
}

export default function FranchisePaymentsDetails({
  franchiseId,
  franchiseName,
  totalCompleted,
  totalPending,
  totalAmount,
}: FranchisePaymentsDetailsProps) {
  const [paymentsPage, setPaymentsPage] = useState(1);
  const paymentsLimit = 10;
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(
    null,
  );
  const selectedPaymentMethodFields = selectedPayment
    ? getMethodSpecificFields(selectedPayment)
    : [];

  const queryParams = useMemo(
    () => ({
      page: paymentsPage,
      limit: paymentsLimit,
      search: searchTerm || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
    [paymentsPage, searchTerm, statusFilter],
  );

  const paymentsQuery = useAdminFranchisePayments(
    franchiseId || null,
    queryParams,
  );
  const payments = paymentsQuery.data?.data ?? [];
  const totalPaymentsCount = paymentsQuery.data?.meta.total ?? 0;
  const totalPages = paymentsQuery.data?.meta.totalPages ?? 1;
  const loading = paymentsQuery.isLoading && !paymentsQuery.data;

  const columns: DataTableColumn<PaymentData>[] = [
    {
      key: "type",
      header: "Type",
      render: (payment) => payment.type || "Payment",
    },
    {
      key: "method",
      header: "Method",
      render: (payment) =>
        payment.method ? (
          <Badge
            variant="outline"
            className={methodBadgeClass(payment.method)}
          >
            {methodLabel(payment.method)}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (payment) => <Badge variant="outline">{payment.status}</Badge>,
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
      className: "text-right",
      render: (payment) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setSelectedPayment(payment)}
          className="h-8"
        >
          <Eye className="mr-1 h-4 w-4" />
          View
        </Button>
      ),
    },
  ];

  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All" },
        { value: "Completed", label: "Completed" },
        { value: "Pending", label: "Pending" },
        { value: "Failed", label: "Failed" },
      ],
      defaultValue: "all",
    },
  ];

  return (
    <ExpandedDetailSurface className="border-t border-border/60">
      <ExpandedDetailSection title="Franchise payment summary">
        <DetailFieldsGrid columns={4}>
          <DetailField label="Franchise" value={franchiseName} />
          <DetailField label="Total payments" value={totalPaymentsCount} />
          <DetailField
            label="Completed amount"
            value={
              totalAmount != null
                ? `Rs. ${totalAmount.toLocaleString("en-IN")}`
                : "N/A"
            }
          />
          <DetailField
            label="Completed payments"
            value={totalCompleted ?? "N/A"}
          />
          <DetailField label="Pending payments" value={totalPending ?? "N/A"} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Payments">
        {!franchiseId ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Payments not scoped to a specific franchise.
          </p>
        ) : (
          <DataTable
            data={payments}
            loading={loading}
            columns={columns}
            getRowId={(payment) => String(payment.id)}
            renderMainCell={(payment) => (
              <div className="font-medium text-gray-900">
                {payment.razorpayPaymentId ||
                  payment.razorpayOrderId ||
                  `#${payment.id}`}
              </div>
            )}
            searchPlaceholder="Search by order or payment ID..."
            onSearchChange={(value) => {
              setSearchTerm(value);
              setPaymentsPage(1);
            }}
            filters={filters}
            onFilterChange={(key, value) => {
              if (key === "status") setStatusFilter(value as string);
              setPaymentsPage(1);
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

      <Dialog
        open={selectedPayment != null}
        onOpenChange={(open) => {
          if (!open) setSelectedPayment(null);
        }}
      >
        {selectedPayment ? (
          <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                Payment details:{" "}
                {selectedPayment.razorpayPaymentId ||
                  selectedPayment.razorpayOrderId ||
                  `#${selectedPayment.id}`}
              </DialogTitle>
              <DialogDescription>
                Detailed captured payment information for audit and support.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <DetailFieldsGrid columns={3}>
                <DetailField label="Franchise" value={franchiseName} />
                <DetailField
                  label="Franchisee"
                  value={selectedPayment.franchisee?.name || "N/A"}
                />
                <DetailField
                  label="Payment Type"
                  value={selectedPayment.type || "Payment"}
                />
                <DetailField
                  label="Status"
                  value={
                    <Badge variant="outline">{selectedPayment.status}</Badge>
                  }
                />
                <DetailField
                  label="Method"
                  value={
                    selectedPayment.method ? (
                      <Badge
                        variant="outline"
                        className={methodBadgeClass(selectedPayment.method)}
                      >
                        {methodLabel(selectedPayment.method)}
                      </Badge>
                    ) : (
                      "N/A"
                    )
                  }
                />
                <DetailField
                  label="Date"
                  value={formatPaymentDateTime(selectedPayment.createdAt)}
                />
                <DetailField
                  label="Amount"
                  value={formatRsAmount(
                    selectedPayment.amount,
                    selectedPayment.currency ?? "INR",
                  )}
                />
                <DetailField
                  label="Fee"
                  value={formatRsAmount(
                    selectedPayment.fee,
                    selectedPayment.currency ?? "INR",
                  )}
                />
                <DetailField
                  label="GST / Tax"
                  value={formatRsAmount(
                    selectedPayment.tax,
                    selectedPayment.currency ?? "INR",
                  )}
                />
                <DetailField
                  label="Order ID"
                  value={selectedPayment.razorpayOrderId || "N/A"}
                />
                <DetailField
                  label="Payment ID"
                  value={selectedPayment.razorpayPaymentId || "N/A"}
                />
                <DetailField
                  label="Payer Email"
                  value={
                    selectedPayment.email ||
                    selectedPayment.franchisee?.mail ||
                    "N/A"
                  }
                />
                <DetailField
                  label="Payer Contact"
                  value={
                    selectedPayment.contact ||
                    selectedPayment.franchisee?.phone ||
                    "N/A"
                  }
                />
              </DetailFieldsGrid>

              <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Details
                </div>
                <DetailFieldsGrid columns={3}>
                  {selectedPaymentMethodFields.map((field) => (
                    <DetailField
                      key={`${field.label}-${field.value}`}
                      label={field.label}
                      value={field.value}
                    />
                  ))}
                </DetailFieldsGrid>
              </div>

              {selectedPayment.acquirerData ? (
                <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Captured Gateway Payload
                  </div>
                  <pre className="max-h-56 overflow-auto rounded bg-card p-3 text-xs text-foreground">
                    {JSON.stringify(selectedPayment.acquirerData, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </ExpandedDetailSurface>
  );
}
