"use client";

import { OrderData } from "@/services/order.service";
import { useOrderById } from "@/hooks/api/order.hooks";
import { Loader2 } from "lucide-react";
import StudentOrderSection from "./StudentOrderSection";
import { Separator } from "@/components/ui/separator";
import {
  DetailField,
  DetailFieldsGrid,
  DetailMessage,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";

interface OrderDetailsProps {
  order: OrderData;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  lastRow: boolean;
}

export default function OrderDetails({
  order,
  lastRow,
  expandedRows,
  onToggleRow,
}: OrderDetailsProps) {
  const orderQuery = useOrderById(order.id);
  const detailedOrder = orderQuery.data ?? null;
  const loading = orderQuery.isLoading;

  if (loading) {
    return (
      <ExpandedDetailSurface
        className={lastRow ? "rounded-b-lg border-t border-border/60" : "border-t border-border/60"}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="mr-3 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading order details...</p>
        </div>
      </ExpandedDetailSurface>
    );
  }

  if (!detailedOrder || !detailedOrder.orderItems) {
    return (
      <ExpandedDetailSurface
        className={lastRow ? "rounded-b-lg border-t border-border/60" : "border-t border-border/60"}
      >
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">
            No order details available
          </p>
        </div>
      </ExpandedDetailSurface>
    );
  }

  const studentKeys = Object.keys(detailedOrder.orderItems);
  const paymentFields = (() => {
    const paymentDetails = detailedOrder.paymentDetails;
    if (!paymentDetails) return [];

    const fields: { label: string; value: string }[] = [];
    if (paymentDetails.method) {
      fields.push({ label: "Payment method", value: paymentDetails.method });
    }
    if (paymentDetails.cardNetwork) {
      fields.push({ label: "Card network", value: paymentDetails.cardNetwork });
    }
    if (paymentDetails.cardType) {
      fields.push({ label: "Card type", value: paymentDetails.cardType });
    }
    if (paymentDetails.cardLast4) {
      fields.push({
        label: "Card number",
        value: `**** **** **** ${paymentDetails.cardLast4}`,
      });
    }
    if (paymentDetails.cardIssuer) {
      fields.push({ label: "Card issuer", value: paymentDetails.cardIssuer });
    }
    if (paymentDetails.vpa) {
      fields.push({ label: "UPI ID", value: paymentDetails.vpa });
    }
    if (paymentDetails.wallet) {
      fields.push({ label: "Wallet provider", value: paymentDetails.wallet });
    }
    if (paymentDetails.bank) {
      fields.push({ label: "Bank", value: paymentDetails.bank });
    }
    if (paymentDetails.email) {
      fields.push({ label: "Email", value: paymentDetails.email });
    }
    if (paymentDetails.contact) {
      fields.push({ label: "Contact", value: paymentDetails.contact });
    }
    if (
      paymentDetails.fee !== null &&
      paymentDetails.fee !== undefined
    ) {
      fields.push({
        label: "Gateway fee",
        value: `₹${paymentDetails.fee.toFixed(2)}`,
      });
    }
    if (
      paymentDetails.tax !== null &&
      paymentDetails.tax !== undefined
    ) {
      fields.push({
        label: "Tax",
        value: `₹${paymentDetails.tax.toFixed(2)}`,
      });
    }
    return fields;
  })();

  return (
    <ExpandedDetailSurface
      className={lastRow ? "rounded-b-lg border-t border-border/60" : "border-t border-border/60"}
    >
      <ExpandedDetailSection title={`Order #${detailedOrder.id}`}>
        <DetailFieldsGrid columns={4}>
          <DetailField
            label="Order date"
            value={new Date(detailedOrder.createdAt).toLocaleDateString()}
          />
          <DetailField label="Status" value={detailedOrder.status} />
          <DetailField
            label="Total amount"
            value={`₹${detailedOrder.totalAmount}`}
          />
          <DetailField label="Students / CIs" value={studentKeys.length} />
          {detailedOrder.referenceId ? (
            <DetailField
              label="Payment reference ID"
              value={detailedOrder.referenceId}
              span={2}
            />
          ) : null}
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      {(paymentFields.length > 0 || detailedOrder.notes) && (
        <>
          <Separator />
          <ExpandedDetailSection title="Payment context">
            {paymentFields.length > 0 ? (
              <DetailFieldsGrid columns={4}>
                {paymentFields.map((field) => (
                  <DetailField
                    key={field.label}
                    label={field.label}
                    value={field.value}
                  />
                ))}
                {detailedOrder.notes ? (
                  <DetailField label="Notes" value={detailedOrder.notes} span={4} />
                ) : null}
              </DetailFieldsGrid>
            ) : (
              <DetailMessage>{detailedOrder.notes}</DetailMessage>
            )}
          </ExpandedDetailSection>
        </>
      )}

      <Separator />

      <ExpandedDetailSection title="Items">
        <div className="space-y-4">
          {studentKeys.map((studentKey, index) => (
            <StudentOrderSection
              key={studentKey}
              studentKey={studentKey}
              items={detailedOrder.orderItems![studentKey]}
              orderId={order.id.toString()}
              isExpanded={expandedRows.has(`${order.id}-${studentKey}`)}
              onToggle={onToggleRow}
              isLast={index === studentKeys.length - 1}
              isCIOrder={studentKey.startsWith("CI:")}
            />
          ))}
        </div>
      </ExpandedDetailSection>
    </ExpandedDetailSurface>
  );
}
