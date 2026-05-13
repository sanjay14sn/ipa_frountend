"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrderByIdAdmin } from "@/hooks/api/order.hooks";
import { previewOrderInvoice } from "@/services/order.service";
import InvoicePreviewCard from "@/app/franchisee/orders/components/InvoicePreviewCard";
import { DispatchRecipientTable } from "./DispatchRecipientTable";
import { isStandaloneDispatchOrderType } from "./dispatch-order-helpers";

interface AdminOrderInvoiceDialogProps {
  orderId: number | null;
  onClose: () => void;
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function defaultDispatchTab(certCount: number, idCount: number) {
  if (certCount > 0) return "certificates";
  if (idCount > 0) return "id-cards";
  return "certificates";
}

function defaultTabValue(
  tabsMode: "mixed" | "dispatch-only",
  certCount: number,
  idCount: number,
) {
  if (tabsMode === "mixed") return "invoice";
  return defaultDispatchTab(certCount, idCount);
}

function TabCount({ n }: { n: number }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground group-data-[state=active]:bg-accent group-data-[state=active]:text-accent-foreground">
      {n}
    </span>
  );
}

export function AdminOrderInvoiceDialog({
  orderId,
  onClose,
}: AdminOrderInvoiceDialogProps) {
  const orderQuery = useOrderByIdAdmin(orderId ?? undefined);
  const order = orderQuery.data;

  const dispatchItems = order?.dispatchItems ?? [];
  const hasDispatch = dispatchItems.length > 0;
  const standaloneDispatch =
    order != null && isStandaloneDispatchOrderType(order.orderType);

  const certificates = useMemo(
    () => dispatchItems.filter((d) => d.itemType === "CERTIFICATE"),
    [dispatchItems],
  );
  const idCards = useMemo(
    () => dispatchItems.filter((d) => d.itemType === "ID_CARD"),
    [dispatchItems],
  );
  const certCount = certificates.length;
  const idCount = idCards.length;

  const studentIds: number[] = useMemo(() => {
    if (orderId == null || !order) return [];
    const dispatch = order.dispatchItems ?? [];
    const fromLines =
      order.lineItems
        ?.filter((l) => l.studentId != null)
        .map((l) => l.studentId as number) ?? [];
    const fromDispatch =
      dispatch
        .filter((d) => d.studentId != null && d.studentId > 0)
        .map((d) => d.studentId as number) ?? [];
    return [...new Set([...fromLines, ...fromDispatch])];
  }, [orderId, order]);

  const showInvoicePreview = studentIds.length > 0 && !standaloneDispatch;
  const invoiceStudentCount = studentIds.length;

  const invoiceQuery = useQuery({
    queryKey: ["admin-order-invoice", orderId, studentIds],
    queryFn: () =>
      previewOrderInvoice({
        studentIds,
        franchiseId: order?.franchiseId,
      }),
    enabled: showInvoicePreview && order != null,
  });

  const invoiceFailed = showInvoicePreview && invoiceQuery.isError;
  const orderFailed = orderQuery.isError;

  const tabsMode =
    hasDispatch && showInvoicePreview
      ? "mixed"
      : hasDispatch
        ? "dispatch-only"
        : showInvoicePreview
          ? "invoice-only"
          : "empty";

  const dialogPreviewFooter = showInvoicePreview && hasDispatch;

  return (
    <Dialog open={orderId != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[min(90vh,46rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl sm:p-0">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 pb-3 pt-5 pr-14">
          <DialogTitle className="text-left text-xl font-semibold text-card-foreground">
            {standaloneDispatch ? "Order details" : "Order invoice & details"}{" "}
            <span className="font-medium text-muted-foreground">—</span>{" "}
            <span className="text-muted-foreground">Order #{orderId}</span>
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-muted-foreground">
            {standaloneDispatch
              ? "Certificate and ID card dispatch only (no material charges). Recipient lists show student, level, marks, and course instructor."
              : "Certificate and ID dispatch (no charge), then inventory and fee breakdown for this order."}
          </DialogDescription>
        </DialogHeader>

        {orderFailed ? (
          <p className="px-6 py-4 text-sm text-destructive">
            Failed to load order. Please try again later.
          </p>
        ) : invoiceFailed ? (
          <p className="px-6 py-4 text-sm text-destructive">
            Failed to load invoice. Please try again later.
          </p>
        ) : tabsMode === "empty" ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">
            No student line items or dispatch lines found for this order.
          </p>
        ) : tabsMode === "invoice-only" ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <InvoicePreviewCard
              loading={orderQuery.isLoading || invoiceQuery.isLoading}
              preview={invoiceQuery.data ?? null}
              selected={studentIds.length}
              emptyMessage="No student items found in this order."
              variant="card"
              copyVariant="finalized"
            />
          </div>
        ) : (
          <Tabs
            key={orderId ?? "closed"}
            defaultValue={defaultTabValue(tabsMode as "mixed" | "dispatch-only", certCount, idCount)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList className="mx-6 mt-3 flex h-auto w-auto flex-shrink-0 flex-wrap justify-start gap-1 self-start rounded-xl border border-border bg-muted/40 p-1 text-muted-foreground">
              {tabsMode === "mixed" ? (
                <TabsTrigger value="invoice" className="group gap-2">
                  Invoice
                  <TabCount n={invoiceStudentCount} />
                </TabsTrigger>
              ) : null}
              <TabsTrigger value="certificates" className="group gap-2">
                Certificates
                <TabCount n={certCount} />
              </TabsTrigger>
              <TabsTrigger value="id-cards" className="group gap-2">
                ID cards
                <TabCount n={idCount} />
              </TabsTrigger>
            </TabsList>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {tabsMode === "mixed" ? (
                <TabsContent value="invoice" className="mt-0 space-y-3 focus-visible:ring-0">
                  <InvoicePreviewCard
                    loading={orderQuery.isLoading || invoiceQuery.isLoading}
                    preview={invoiceQuery.data ?? null}
                    selected={studentIds.length}
                    emptyMessage="No student items found in this order."
                    variant="embedded"
                    hideFooter
                    copyVariant="finalized"
                  />
                </TabsContent>
              ) : null}
              <TabsContent value="certificates" className="mt-0 focus-visible:ring-0">
                <DispatchRecipientTable rows={certificates} emptyLabel="None on this order." />
              </TabsContent>

              <TabsContent value="id-cards" className="mt-0 focus-visible:ring-0">
                <DispatchRecipientTable rows={idCards} emptyLabel="None on this order." />
              </TabsContent>
            </div>
          </Tabs>
        )}

        {dialogPreviewFooter ? (
          <div className="flex shrink-0 items-center justify-between gap-6 border-t border-border bg-muted/30 px-6 py-4">
            <div className="text-sm font-semibold text-card-foreground">Total</div>
            <div className="shrink-0 text-2xl font-semibold tabular-nums text-card-foreground">
              {invoiceQuery.isLoading || !invoiceQuery.data
                ? "—"
                : currencyFormatter.format(invoiceQuery.data.totalAmount)}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
