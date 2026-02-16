"use client";

import { useRef, createRef } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentData, PaymentStatus } from "@/services/payment.service";
import { NestedSection } from "@/components/shared";

interface PaymentsSectionProps {
  payments: PaymentData[];
  franchiseId: string;
  franchiseName: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

export let paymentsDotRef = createRef<HTMLDivElement>();

export default function PaymentsSection({
  payments,
  franchiseId,
  franchiseName,
  isExpanded,
  onToggle,
}: PaymentsSectionProps) {
  paymentsDotRef = useRef<HTMLDivElement>(null);

  const getStatusBadgeVariant = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.COMPLETED:
        return "default";
      case PaymentStatus.PENDING:
        return "secondary";
      case PaymentStatus.FAILED:
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatPaymentType = (type: string) => {
    const typeMap: Record<string, string> = {
      franchise_fee: "Franchise Fee",
      ci_payment: "CI Payment",
      subscription: "Subscription",
    };
    return typeMap[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div ref={paymentsDotRef}>
      <NestedSection
        id={`${franchiseId}-payments`}
        title={`Payments (${payments.length})`}
        badge={
          <Badge variant="secondary">
            ₹
            {payments
              .reduce((acc, p) => acc + p.amount, 0)
              .toLocaleString("en-IN")}
          </Badge>
        }
        isExpanded={isExpanded}
        onToggle={onToggle}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary hover:bg-secondary">
              <TableHead>Order ID</TableHead>
              <TableHead className="text-center">Type</TableHead>
              <TableHead className="text-center">Amount</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Subscription</TableHead>
              <TableHead className="text-center">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id} className="hover:bg-gray-50">
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {payment.razorpayOrderId}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-xs">
                    {formatPaymentType(payment.type)}
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-medium">
                  {formatCurrency(payment.amount, payment.currency)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={getStatusBadgeVariant(payment.status)}>
                    {payment.status.charAt(0).toUpperCase() +
                      payment.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-center text-sm text-gray-600">
                  {payment.subscription
                    ? payment.subscription.plan.name
                    : "One-time"}
                </TableCell>
                <TableCell className="text-center text-sm text-gray-600">
                  {new Date(payment.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </NestedSection>
    </div>
  );
}
