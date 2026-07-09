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
import CustomMaterialsList from "@/app/franchisee/orders/components/CustomMaterialsList";
import { DispatchRecipientTable } from "@/components/orders/DispatchRecipientTable";
import { isStandaloneDispatchOrderType } from "@/lib/dispatch-order-helpers";
import { OrderPaymentDetailsPanel } from "@/components/orders/OrderPaymentDetailsPanel";
import { formatRupees } from "@/lib/currency-utils";

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

function defaultDispatchTab(certCount: number, idCount: number) {
  if (certCount > 0) return "certificates";
  if (idCount > 0) return "id-cards";
  return "certificates";
}

function TabCount({ n }: { n: number }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground group-data-[state=active]:bg-accent group-data-[state=active]:text-accent-foreground">
      {n}
    </span>
  );
}

function TotalFooter({ snapshot }: { snapshot: InvoicePreview }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-6 border-t border-border bg-muted/30 px-6 py-4">
      <div className="text-sm font-semibold text-card-foreground">Total</div>
      <div className="shrink-0 text-2xl font-semibold tabular-nums text-card-foreground">
        {formatRupees(snapshot.totalAmount)}
      </div>
    </div>
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

function lookupStudentName(snapshot: InvoicePreview, id: number) {
  const g = snapshot.studentGroups?.find((x) => x.studentId === id);
  if (g) return { name: g.studentName };
  const st = snapshot.students.find((x) => x.studentId === id);
  return st ? { name: st.studentName } : undefined;
}

function lookupInstructorName(snapshot: InvoicePreview, id: number) {
  const g = snapshot.instructorGroups?.find((x) => x.instructorId === id);
  return g ? { name: g.name, instructorId: g.instructorCode } : undefined;
}

interface EmptyBodyProps {
  order: OrderData | undefined;
}

function EmptyBody({ order }: EmptyBodyProps) {
  return (
    <div className="px-6 py-6">
      <p className="text-sm text-muted-foreground">
        No stored material invoice or dispatch lines for this order.
      </p>
      {order?.payment ? (
        <OrderPaymentDetailsPanel
          payment={order.payment}
          className="mt-4"
          fallbackGoodsGstAmount={order.gstAmount ?? null}
        />
      ) : null}
    </div>
  );
}

interface InlineInvoiceBodyProps {
  snapshot: InvoicePreview;
  groupedSummary: React.ReactNode;
  order: OrderData | undefined;
}

function InlineInvoiceBody({ snapshot, groupedSummary, order }: InlineInvoiceBodyProps) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {groupedSummary ?? (
          <p className="text-sm text-muted-foreground">
            No stored invoice snapshot for this order.
          </p>
        )}
        {order?.payment ? (
          <OrderPaymentDetailsPanel
            payment={order.payment}
            className="mt-4"
            fallbackGoodsGstAmount={order.gstAmount ?? null}
          />
        ) : null}
      </div>
      <TotalFooter snapshot={snapshot} />
    </>
  );
}

interface TabbedBodyProps {
  orderId: number | null;
  showInvoiceTab: boolean;
  hasCustom: boolean;
  hasDispatch: boolean;
  invoiceTabCount: number;
  certCount: number;
  idCount: number;
  customGroups: NonNullable<InvoicePreview["customGroups"]>;
  certificates: NonNullable<OrderData["dispatchItems"]>;
  idCards: NonNullable<OrderData["dispatchItems"]>;
  groupedSummary: React.ReactNode;
  order: OrderData | undefined;
  snapshot: InvoicePreview | null;
  showFooter: boolean;
}

function TabbedBody({
  orderId,
  showInvoiceTab,
  hasCustom,
  hasDispatch,
  invoiceTabCount,
  certCount,
  idCount,
  customGroups,
  certificates,
  idCards,
  groupedSummary,
  order,
  snapshot,
  showFooter,
}: TabbedBodyProps) {
  return (
    <Tabs
      key={orderId ?? "closed"}
      defaultValue={
        showInvoiceTab
          ? "invoice"
          : hasCustom
            ? "custom-materials"
            : defaultDispatchTab(certCount, idCount)
      }
      className="flex min-h-0 flex-1 flex-col"
    >
      <TabsList className="mx-6 mt-3 flex h-auto w-auto flex-shrink-0 flex-wrap justify-start gap-1 self-start rounded-xl border border-border bg-muted/40 p-1 text-muted-foreground">
        {showInvoiceTab ? (
          <TabsTrigger value="invoice" className="group gap-2">
            Invoice
            <TabCount n={invoiceTabCount} />
          </TabsTrigger>
        ) : null}
        {hasCustom ? (
          <TabsTrigger value="custom-materials" className="group gap-2">
            Custom materials
            <TabCount n={customGroups.length} />
          </TabsTrigger>
        ) : null}
        {hasDispatch ? (
          <TabsTrigger value="certificates" className="group gap-2">
            Certificates
            <TabCount n={certCount} />
          </TabsTrigger>
        ) : null}
        {hasDispatch ? (
          <TabsTrigger value="id-cards" className="group gap-2">
            ID cards
            <TabCount n={idCount} />
          </TabsTrigger>
        ) : null}
      </TabsList>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {showInvoiceTab ? (
          <TabsContent value="invoice" className="mt-0 space-y-3 focus-visible:ring-0">
            {groupedSummary}
          </TabsContent>
        ) : null}
        {hasCustom ? (
          <TabsContent
            value="custom-materials"
            className="mt-0 focus-visible:ring-0"
          >
            <CustomMaterialsList groups={customGroups} />
          </TabsContent>
        ) : null}
        {hasDispatch ? (
          <TabsContent value="certificates" className="mt-0 focus-visible:ring-0">
            <DispatchRecipientTable rows={certificates} emptyLabel="None on this order." />
          </TabsContent>
        ) : null}
        {hasDispatch ? (
          <TabsContent value="id-cards" className="mt-0 focus-visible:ring-0">
            <DispatchRecipientTable rows={idCards} emptyLabel="None on this order." />
          </TabsContent>
        ) : null}
        {order?.payment ? (
          <OrderPaymentDetailsPanel
            payment={order.payment}
            className="mt-4"
            fallbackGoodsGstAmount={order.gstAmount ?? null}
          />
        ) : null}
      </div>
      {showFooter && snapshot ? <TotalFooter snapshot={snapshot} /> : null}
    </Tabs>
  );
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

  const customGroups = useMemo(
    () => (hasMaterialSnapshot ? (snapshot?.customGroups ?? []) : []),
    [hasMaterialSnapshot, snapshot],
  );
  const hasCustom = customGroups.length > 0;

  const materialSelection = useMemo(
    () => (snapshot ? materialSelectionFromSnapshot(snapshot) : null),
    [snapshot],
  );

  const invoiceTabCount = snapshot ? invoiceGroupCount(snapshot) : 0;

  const tabsMode =
    hasDispatch && hasMaterialSnapshot
      ? "mixed"
      : hasDispatch
        ? "dispatch-only"
        : hasMaterialSnapshot
          ? "invoice-only"
          : "empty";

  const showInvoiceTab = hasMaterialSnapshot && invoiceTabCount > 0;
  const inlineInvoiceOnly = tabsMode === "invoice-only" && !hasCustom;
  const showTabbedFooter = hasMaterialSnapshot && (tabsMode === "mixed" || hasCustom);

  const groupedSummary = useMemo(() => {
    if (!snapshot || !materialSelection) return null;
    return (
      <UnifiedInvoiceGroupedSummary
        preview={snapshot}
        startingKitRows={materialSelection.kitRows}
        selectedStudentIds={materialSelection.studentIds}
        selectedInstructorIds={materialSelection.instructorIds}
        getStudentById={(id) => lookupStudentName(snapshot, id)}
        getInstructorById={(id) => lookupInstructorName(snapshot, id)}
        readOnly
      />
    );
  }, [snapshot, materialSelection]);

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

        {isError ? (
          <p className="px-6 py-4 text-sm text-destructive">
            Failed to load order. Please try again later.
          </p>
        ) : isLoading ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">Loading order…</p>
        ) : tabsMode === "empty" ? (
          <EmptyBody order={order} />
        ) : inlineInvoiceOnly && snapshot ? (
          <InlineInvoiceBody snapshot={snapshot} groupedSummary={groupedSummary} order={order} />
        ) : (
          <TabbedBody
            orderId={orderId}
            showInvoiceTab={showInvoiceTab}
            hasCustom={hasCustom}
            hasDispatch={hasDispatch}
            invoiceTabCount={invoiceTabCount}
            certCount={certCount}
            idCount={idCount}
            customGroups={customGroups ?? []}
            certificates={certificates}
            idCards={idCards}
            groupedSummary={groupedSummary}
            order={order}
            snapshot={snapshot}
            showFooter={showTabbedFooter}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
