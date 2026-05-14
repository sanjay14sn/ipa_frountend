"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { InvoicePreview, OrderData } from "@/services/order.service";
import UnifiedInvoiceGroupedSummary from "@/app/franchisee/orders/components/UnifiedInvoiceGroupedSummary";
import { DispatchRecipientTable } from "@/app/admin/orders/components/DispatchRecipientTable";
import { isStandaloneDispatchOrderType } from "@/lib/dispatch-order-helpers";

export type OrderRowInvoiceAudience = "admin" | "franchisee";

const COPY: Record<
  OrderRowInvoiceAudience,
  {
    titleMaterial: string;
    titleStandalone: string;
    descStandalone: string;
    descMaterial: string;
  }
> = {
  admin: {
    titleMaterial: "Order invoice & details",
    titleStandalone: "Order details",
    descStandalone:
      "Certificate and ID card dispatch only (no material charges). Recipient lists show student, level, marks, and course instructor.",
    descMaterial:
      "Materials invoice reflects the snapshot from checkout. Certificate and ID lists update from dispatch records.",
  },
  franchisee: {
    titleMaterial: "Order invoice",
    titleStandalone: "Order details",
    descStandalone:
      "Certificate and ID card dispatch. Recipients and levels are listed below.",
    descMaterial:
      "Materials as at checkout. Certificates and IDs follow live dispatch data.",
  },
};

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

function materialSelectionFromSnapshot(snapshot: InvoicePreview) {
  const studentIds = snapshot.studentGroups?.length
    ? snapshot.studentGroups.map((g) => g.studentId)
    : snapshot.students.map((s) => s.studentId);
  const instructorIds = (snapshot.instructorGroups ?? []).map((g) => g.instructorId);
  const kitRows = (snapshot.startingKitGroups ?? []).map((g) => ({
    streamId: g.streamId,
    streamName: g.streamName,
    quantity: g.quantity,
  }));
  return { studentIds, instructorIds, kitRows };
}

function invoiceGroupCount(snapshot: InvoicePreview): number {
  let n = 0;
  if ((snapshot.startingKitGroups ?? []).length > 0) {
    n += snapshot.startingKitGroups!.length;
  }
  n += snapshot.students.length;
  n += (snapshot.instructorGroups ?? []).length;
  return n;
}

export interface OrderRowInvoiceDialogProps {
  orderId: number | null;
  onClose: () => void;
  order: OrderData | undefined;
  isLoading: boolean;
  isError: boolean;
  audience: OrderRowInvoiceAudience;
}

export function OrderRowInvoiceDialog({
  orderId,
  onClose,
  order,
  isLoading,
  isError,
  audience,
}: OrderRowInvoiceDialogProps) {
  const labels = COPY[audience];

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

  const snapshot = order?.invoicePreview ?? null;
  const hasMaterialSnapshot = snapshot != null && !standaloneDispatch;

  const materialSelection = useMemo(() => {
    if (!snapshot) return null;
    return materialSelectionFromSnapshot(snapshot);
  }, [snapshot]);

  const invoiceTabCount = snapshot ? invoiceGroupCount(snapshot) : 0;

  const orderFailed = isError;

  const tabsMode =
    hasDispatch && hasMaterialSnapshot
      ? "mixed"
      : hasDispatch
        ? "dispatch-only"
        : hasMaterialSnapshot
          ? "invoice-only"
          : "empty";

  const dialogPreviewFooter = hasMaterialSnapshot && hasDispatch;

  const groupedSummary =
    snapshot && materialSelection ? (
      <UnifiedInvoiceGroupedSummary
        preview={snapshot}
        startingKitRows={materialSelection.kitRows}
        selectedStudentIds={materialSelection.studentIds}
        selectedInstructorIds={materialSelection.instructorIds}
        getStudentById={(id) => {
          const g = snapshot.studentGroups?.find((x) => x.studentId === id);
          if (g) return { name: g.studentName };
          const st = snapshot.students.find((x) => x.studentId === id);
          return st ? { name: st.studentName } : undefined;
        }}
        getInstructorById={(id) => {
          const g = snapshot.instructorGroups?.find((x) => x.instructorId === id);
          return g ? { name: g.name, instructorId: g.instructorCode } : undefined;
        }}
        readOnly
      />
    ) : null;

  return (
    <Dialog open={orderId != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[min(90vh,46rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl sm:p-0">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 pb-3 pt-5 pr-14">
          <DialogTitle className="text-left text-xl font-semibold text-card-foreground">
            {standaloneDispatch ? labels.titleStandalone : labels.titleMaterial}{" "}
            <span className="font-medium text-muted-foreground">—</span>{" "}
            <span className="text-muted-foreground">Order #{orderId}</span>
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-muted-foreground">
            {standaloneDispatch ? labels.descStandalone : labels.descMaterial}
          </DialogDescription>
        </DialogHeader>

        {orderFailed ? (
          <p className="px-6 py-4 text-sm text-destructive">
            Failed to load order. Please try again later.
          </p>
        ) : isLoading ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">Loading order…</p>
        ) : tabsMode === "empty" ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">
            No stored material invoice or dispatch lines for this order.
          </p>
        ) : tabsMode === "invoice-only" ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {hasMaterialSnapshot && snapshot && groupedSummary ? (
                groupedSummary
              ) : (
                <p className="text-sm text-muted-foreground">
                  No stored invoice snapshot for this order.
                </p>
              )}
            </div>
            {snapshot ? (
              <div className="flex shrink-0 items-center justify-between gap-6 border-t border-border bg-muted/30 px-6 py-4">
                <div className="text-sm font-semibold text-card-foreground">Total</div>
                <div className="shrink-0 text-2xl font-semibold tabular-nums text-card-foreground">
                  {currencyFormatter.format(snapshot.totalAmount)}
                </div>
              </div>
            ) : null}
          </>
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
                  <TabCount n={invoiceTabCount} />
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
                  {groupedSummary}
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

        {dialogPreviewFooter && snapshot ? (
          <div className="flex shrink-0 items-center justify-between gap-6 border-t border-border bg-muted/30 px-6 py-4">
            <div className="text-sm font-semibold text-card-foreground">Total</div>
            <div className="shrink-0 text-2xl font-semibold tabular-nums text-card-foreground">
              {currencyFormatter.format(snapshot.totalAmount)}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
