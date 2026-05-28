"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  IndianRupee,
  Receipt,
  Wallet,
} from "lucide-react";
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
  ContactPill,
  ContactPillGrid,
  DataTable,
  ExpandedDetailSurface,
  KeyFactCard,
  KeyFactsGrid,
  LabeledValue,
  ProfileCard,
  ProfileCardSection,
  StatusBadge,
  TableMainCell,
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
  hideSummary?: boolean;
}

export default function FranchisePaymentsDetails({
  franchiseId,
  franchiseName,
  totalCompleted,
  totalPending,
  totalAmount,
  hideSummary = false,
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
      key: "payment",
      header: "Payment",
    },
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
      <div className="space-y-3 p-3 md:p-4">
        {!hideSummary && (
          <KeyFactsGrid columns={4}>
            <KeyFactCard
              icon={Receipt}
              label="Total payments"
              value={totalPaymentsCount}
            />
            <KeyFactCard
              icon={IndianRupee}
              label="Completed amount"
              value={
                totalAmount != null
                  ? formatRsAmount(totalAmount, "INR")
                  : "—"
              }
            />
            <KeyFactCard
              icon={CheckCircle2}
              label="Completed"
              value={totalCompleted ?? "—"}
            />
            <KeyFactCard
              icon={Clock}
              label="Pending"
              value={totalPending ?? "—"}
            />
          </KeyFactsGrid>
        )}

        <ProfileCard contentClassName="space-y-2 p-3 md:p-4">
          <ProfileCardSection icon={Wallet} label="Payments">
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
          </ProfileCardSection>
        </ProfileCard>
      </div>

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

            <div className="space-y-3">
              <ProfileCard>
                <ProfileCardSection icon={Receipt} label="Overview">
                  <ContactPillGrid columns={3}>
                    <ContactPill
                      icon={Receipt}
                      label="Franchise"
                      value={franchiseName}
                    />
                    <ContactPill
                      icon={Receipt}
                      label="Franchisee"
                      value={selectedPayment.franchisee?.name || "—"}
                    />
                    <ContactPill
                      icon={Wallet}
                      label="Type"
                      value={selectedPayment.type || "Payment"}
                    />
                  </ContactPillGrid>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <StatusBadge label={selectedPayment.status ?? "—"} />
                    {selectedPayment.method ? (
                      <Badge
                        variant="outline"
                        className={methodBadgeClass(selectedPayment.method)}
                      >
                        {methodLabel(selectedPayment.method)}
                      </Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {formatPaymentDateTime(selectedPayment.createdAt)}
                    </span>
                  </div>
                </ProfileCardSection>
                <ProfileCardSection icon={IndianRupee} label="Amounts" divider>
                  <ContactPillGrid columns={4}>
                    <ContactPill
                      icon={IndianRupee}
                      label="Amount"
                      value={formatRsAmount(
                        selectedPayment.amount,
                        selectedPayment.currency ?? "INR",
                      )}
                    />
                    <ContactPill
                      icon={IndianRupee}
                      label="Fee"
                      value={formatRsAmount(
                        selectedPayment.fee,
                        selectedPayment.currency ?? "INR",
                      )}
                    />
                    <ContactPill
                      icon={IndianRupee}
                      label="Gateway fee tax"
                      value={formatRsAmount(
                        selectedPayment.gatewayFeeTaxAmount ??
                          selectedPayment.tax,
                        selectedPayment.currency ?? "INR",
                      )}
                    />
                    {selectedPayment.goodsGstAmount != null &&
                    Number(selectedPayment.goodsGstAmount) > 0 ? (
                      <ContactPill
                        icon={IndianRupee}
                        label="GST (18%)"
                        value={formatRsAmount(
                          selectedPayment.goodsGstAmount,
                          selectedPayment.currency ?? "INR",
                        )}
                      />
                    ) : null}
                  </ContactPillGrid>
                </ProfileCardSection>
                <ProfileCardSection icon={CreditCard} label="Identifiers" divider>
                  <ContactPillGrid columns={2}>
                    <ContactPill
                      icon={Receipt}
                      label="Order ID"
                      value={selectedPayment.razorpayOrderId || "—"}
                    />
                    <ContactPill
                      icon={Receipt}
                      label="Payment ID"
                      value={selectedPayment.razorpayPaymentId || "—"}
                    />
                    <ContactPill
                      icon={Receipt}
                      label="Payer email"
                      value={
                        selectedPayment.email ||
                        selectedPayment.franchisee?.mail ||
                        "—"
                      }
                    />
                    <ContactPill
                      icon={Receipt}
                      label="Payer contact"
                      value={
                        selectedPayment.contact ||
                        selectedPayment.franchisee?.phone ||
                        "—"
                      }
                    />
                  </ContactPillGrid>
                </ProfileCardSection>
              </ProfileCard>

              {selectedPaymentMethodFields.length > 0 ? (
                <ProfileCard>
                  <ProfileCardSection icon={CreditCard} label="Method details">
                    <ContactPillGrid columns={3}>
                      {selectedPaymentMethodFields.map((field) => (
                        <ContactPill
                          key={`${field.label}-${field.value}`}
                          icon={CreditCard}
                          label={field.label}
                          value={field.value}
                        />
                      ))}
                    </ContactPillGrid>
                  </ProfileCardSection>
                </ProfileCard>
              ) : null}

              {selectedPayment.acquirerData ? (
                <ProfileCard>
                  <ProfileCardSection
                    icon={Receipt}
                    label="Captured gateway payload"
                  >
                    <LabeledValue
                      label="Raw response"
                      value={
                        <pre className="max-h-56 overflow-auto rounded bg-muted p-3 text-xs text-foreground">
                          {JSON.stringify(selectedPayment.acquirerData, null, 2)}
                        </pre>
                      }
                    />
                  </ProfileCardSection>
                </ProfileCard>
              ) : null}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </ExpandedDetailSurface>
  );
}
