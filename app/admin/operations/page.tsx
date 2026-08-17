"use client";

import { Suspense } from "react";
import { PageTabs, TabsContent } from "@/components/shared/page-tabs";
import { PageSkeleton } from "@/components/shared";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { useVisitedTabs } from "@/hooks/use-visited-tabs";
import { useUser } from "@/context/user-context";
import AdminOrdersTable from "@/components/orders/AdminOrdersTable";
import AdminShippingTable from "@/components/shipping/AdminShippingTable";
import PaymentsTable from "@/components/payments/PaymentsTable";
import { InventorySection } from "./_components/inventory-section";
import { ProcurementSection } from "./_components/ProcurementSection";
import { MonitoringSection } from "./_components/MonitoringSection";

// KEEP IN SYNC with STAFF_ADMIN_OPERATIONS_TABS in lib/tours/staff-admin-tour.ts
// (the staff-admin guided tour walks these tabs; it can't import from @/app).
const TABS = [
  "orders",
  "shipping",
  "payments",
  "inventory",
  "procurement",
  "monitoring",
] as const;

function AdminOperationsHubInner() {
  const [tab, setTab] = useTabFromUrl("monitoring", TABS);
  // ADM-23: panels mount on first activation and stay mounted after.
  const hasVisited = useVisitedTabs(tab);
  const { user } = useUser();
  const isRegionalAdmin =
    user?.role === "admin" && user.adminRole === "staff";

  // Operations is each admin's own actionable workspace: a regional admin sees
  // their region (their warehouse), the super admin sees its fallback franchises
  // (central warehouse). Backend scoping does this from the JWT — no region prop.
  // Super-admin region oversight lives on the read-only Regional Operations page.

  return (
    <PageTabs
      title="Operations"
      description="Demand, shipping, payments, inventory, procurement, and monitoring in one admin workspace."
      tabs={[
        // ADM-21: the default tab sits first and reads "Overview" — the
        // value stays `monitoring` so deep links keep resolving.
        { value: "monitoring", label: "Overview" },
        { value: "orders", label: "Orders" },
        { value: "shipping", label: "Shipping" },
        { value: "payments", label: "Payments" },
        { value: "inventory", label: "Inventory" },
        { value: "procurement", label: "Procurement" },
      ]}
      value={tab}
      onValueChange={setTab}
    >

        <TabsContent value="orders" forceMount className="data-[state=inactive]:hidden mt-4 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Order management</h2>
            <p className="text-muted-foreground">
              Track paid demand, allocation, backorders, and cancellation from
              the order side. Verified orders move to the Shipping tab for
              dispatch.
            </p>
          </div>
          {hasVisited("orders") && <AdminOrdersTable />}
        </TabsContent>

        <TabsContent value="shipping" forceMount className="data-[state=inactive]:hidden mt-4 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Shipping</h2>
            <p className="text-muted-foreground">
              Orders verified on the Orders tab arrive here for dispatch and
              delivery. Only fully ready orders appear, and the UI never
              exposes partial shipments.
            </p>
          </div>
          {hasVisited("shipping") && <AdminShippingTable />}
        </TabsContent>

        <TabsContent value="payments" forceMount className="data-[state=inactive]:hidden mt-4 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Payments</h2>
            <p className="text-muted-foreground">
              Billing stays in the hub, but order creation and stock allocation are now handled elsewhere.
            </p>
          </div>
          {hasVisited("payments") && <PaymentsTable />}
        </TabsContent>

        <TabsContent value="inventory" forceMount className="data-[state=inactive]:hidden mt-4">
          {hasVisited("inventory") && <InventorySection />}
        </TabsContent>

        <TabsContent value="procurement" forceMount className="data-[state=inactive]:hidden mt-4 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Procurement</h2>
            <p className="text-muted-foreground">
              {isRegionalAdmin
                ? "Request stock from HQ into your warehouse and track receipts."
                : "Manage suppliers, item sourcing, purchase orders, receipts, and replenishment drafts."}
            </p>
          </div>
          {hasVisited("procurement") && <ProcurementSection />}
        </TabsContent>

        <TabsContent value="monitoring" forceMount className="data-[state=inactive]:hidden mt-4">
          {hasVisited("monitoring") && <MonitoringSection />}
        </TabsContent>
    </PageTabs>
  );
}

export default function AdminOperationsHubPage() {
  return (
    <Suspense
      fallback={<PageSkeleton />}
    >
      <AdminOperationsHubInner />
    </Suspense>
  );
}
