"use client";

import { useOrderByIdAdmin } from "@/hooks/api/order.hooks";
import { OrderRowInvoiceDialog } from "@/components/orders/OrderRowInvoiceDialog";

interface AdminOrderInvoiceDialogProps {
  orderId: number | null;
  onClose: () => void;
}

export function AdminOrderInvoiceDialog({
  orderId,
  onClose,
}: AdminOrderInvoiceDialogProps) {
  const orderQuery = useOrderByIdAdmin(orderId ?? undefined);

  return (
    <OrderRowInvoiceDialog
      orderId={orderId}
      onClose={onClose}
      order={orderQuery.data}
      isLoading={orderQuery.isLoading}
      isError={orderQuery.isError}
      audience="admin"
    />
  );
}
