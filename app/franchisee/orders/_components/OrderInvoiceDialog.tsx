"use client";

import { useOrderById } from "@/hooks/api/order.hooks";
import { OrderRowInvoiceDialog } from "@/components/orders/OrderRowInvoiceDialog";

interface OrderInvoiceDialogProps {
  orderId: number | null;
  onClose: () => void;
}

export default function OrderInvoiceDialog({
  orderId,
  onClose,
}: OrderInvoiceDialogProps) {
  const orderQuery = useOrderById(orderId ?? undefined);

  return (
    <OrderRowInvoiceDialog
      orderId={orderId}
      onClose={onClose}
      order={orderQuery.data}
      isLoading={orderQuery.isLoading}
      isError={orderQuery.isError}
      audience="franchisee"
    />
  );
}
