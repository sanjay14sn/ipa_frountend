"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import { PaymentData, PaymentStatus } from "@/services/payment.service";
import { useAdminFranchisePayments } from "@/hooks/api/payment.hooks";

type MethodSpecificField = {
  label: string;
  value: string;
};

function normalizeMethod(method?: string | null): string {
  return (method ?? "").trim().toLowerCase();
}

function methodBadgeClass(method?: string | null): string {
  switch (normalizeMethod(method)) {
    case "card":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "upi":
      return "bg-green-100 text-green-800 border-green-200";
    case "netbanking":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "wallet":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "paylater":
      return "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200";
    case "emi":
      return "bg-teal-100 text-teal-800 border-teal-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function methodLabel(method?: string | null) {
  const value = normalizeMethod(method);
  if (!value) return "N/A";
  switch (value) {
    case "netbanking":
      return "Netbanking";
    case "paylater":
      return "Pay Later";
    default:
      return value.charAt(0).toUpperCase() + value.slice(1);
  }
}

function formatDateTime(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN");
}

function formatAmount(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return "N/A";
  return `Rs. ${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function boolToYesNo(value?: boolean) {
  if (value == null) return "N/A";
  return value ? "Yes" : "No";
}

function getMethodSpecificFields(payment: PaymentData): MethodSpecificField[] {
  const method = normalizeMethod(payment.method);
  const card = payment.acquirerData?.card as
    | {
        last4?: string;
        network?: string;
        type?: string;
        issuer?: string;
        international?: boolean;
        emi?: boolean;
      }
    | undefined;
  const acquirerRefs =
    (payment.acquirerData?.razorpayAcquirerData as Record<string, unknown>) ??
    undefined;

  const fields: MethodSpecificField[] = [];

  if (method === "card") {
    fields.push({ label: "Card Last 4", value: card?.last4 ? `**** ${card.last4}` : "N/A" });
    fields.push({ label: "Card Network", value: card?.network || "N/A" });
    fields.push({ label: "Card Type", value: card?.type || "N/A" });
    fields.push({ label: "Card Issuer", value: card?.issuer || "N/A" });
    fields.push({ label: "International", value: boolToYesNo(card?.international) });
    fields.push({ label: "EMI", value: boolToYesNo(card?.emi) });
  } else if (method === "upi") {
    fields.push({ label: "UPI VPA", value: payment.vpa || "N/A" });
  } else if (method === "netbanking") {
    fields.push({ label: "Bank Code", value: payment.bank || "N/A" });
  } else if (method === "wallet") {
    fields.push({ label: "Wallet", value: payment.wallet || "N/A" });
  } else {
    if (payment.vpa) fields.push({ label: "UPI VPA", value: payment.vpa });
    if (payment.bank) fields.push({ label: "Bank Code", value: payment.bank });
    if (payment.wallet) fields.push({ label: "Wallet", value: payment.wallet });
  }

  if (acquirerRefs) {
    Object.entries(acquirerRefs).forEach(([key, value]) => {
      const display = String(value ?? "").trim();
      if (!display) return;
      fields.push({
        label: `Acquirer ${key.replaceAll("_", " ")}`,
        value: display,
      });
    });
  }

  if (fields.length === 0) {
    fields.push({ label: "Method details", value: "N/A" });
  }

  return fields;
}

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
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
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

  const paymentsQuery = useAdminFranchisePayments(franchiseId || null, queryParams);
  const payments = paymentsQuery.data?.data ?? [];
  const totalPaymentsCount = paymentsQuery.data?.meta.total ?? 0;
  const totalPages = paymentsQuery.data?.meta.totalPages ?? 1;

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
          <DetailField
            label="Pending payments"
            value={totalPending ?? "N/A"}
          />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Payments">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by order or payment ID..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPaymentsPage(1);
              }}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            {["all", "Completed", "Pending", "Failed"].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setStatusFilter(s);
                  setPaymentsPage(1);
                }}
              >
                {s === "all" ? "All" : s}
              </Button>
            ))}
          </div>
        </div>

        {!franchiseId ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Payments not scoped to a specific franchise.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                      No payments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.razorpayPaymentId ||
                          payment.razorpayOrderId ||
                          `#${payment.id}`}
                      </TableCell>
                      <TableCell>{payment.type || "Payment"}</TableCell>
                      <TableCell>
                        {payment.method ? (
                          <Badge
                            variant="outline"
                            className={methodBadgeClass(payment.method)}
                          >
                            {methodLabel(payment.method)}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {payment.createdAt
                          ? new Date(payment.createdAt).toLocaleDateString("en-IN")
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        Rs. {payment.amount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right">
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
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 py-3 border-t">
                <span className="text-sm text-muted-foreground">
                  Page {paymentsPage} of {totalPages} ({totalPaymentsCount} total)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentsPage((p) => Math.max(1, p - 1))}
                    disabled={paymentsPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentsPage((p) => Math.min(totalPages, p + 1))}
                    disabled={paymentsPage >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
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
                  value={<Badge variant="outline">{selectedPayment.status}</Badge>}
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
                  value={formatDateTime(selectedPayment.createdAt)}
                />
                <DetailField
                  label="Amount"
                  value={formatAmount(selectedPayment.amount)}
                />
                <DetailField label="Fee" value={formatAmount(selectedPayment.fee)} />
                <DetailField
                  label="GST / Tax"
                  value={formatAmount(selectedPayment.tax)}
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
