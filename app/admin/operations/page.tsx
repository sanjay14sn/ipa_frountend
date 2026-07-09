"use client";

import { Suspense } from "react";
import { PageTabs, TabsContent } from "@/components/shared/page-tabs";
import { PageSkeleton } from "@/components/shared";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { useUser } from "@/context/user-context";
import AdminOrdersTable from "@/components/orders/AdminOrdersTable";
import AdminShippingTable from "@/components/shipping/AdminShippingTable";
import PaymentsTable from "@/components/payments/PaymentsTable";
import { InventorySection } from "./components/inventory-section";
import { ProcurementSection } from "./components/ProcurementSection";
import { MonitoringSection } from "./components/MonitoringSection";

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
        { value: "orders", label: "Orders" },
        { value: "shipping", label: "Shipping" },
        { value: "payments", label: "Payments" },
        { value: "inventory", label: "Inventory" },
        { value: "procurement", label: "Procurement" },
        { value: "monitoring", label: "Monitoring" },
      ]}
      value={tab}
      onValueChange={setTab}
    >

        <TabsContent value="orders" className="mt-4 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Order management</h2>
            <p className="text-muted-foreground">
              Track paid demand, allocation, backorders, and cancellation from the order side.
            </p>
          </div>
          {tab === "orders" && <AdminOrdersTable />}
        </TabsContent>

        <TabsContent value="shipping" className="mt-4 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Shipping</h2>
            <p className="text-muted-foreground">
              Only fully ready orders appear here, and the UI never exposes partial shipments.
            </p>
          </div>
          {tab === "shipping" && <AdminShippingTable />}
        </TabsContent>

        <TabsContent value="payments" className="mt-4 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Payments</h2>
            <p className="text-muted-foreground">
              Billing stays in the hub, but order creation and stock allocation are now handled elsewhere.
            </p>
          </div>
          {tab === "payments" && <PaymentsTable />}
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          {tab === "inventory" && <InventorySection />}
        </TabsContent>

        <TabsContent value="procurement" className="mt-4 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Procurement</h2>
            <p className="text-muted-foreground">
              {isRegionalAdmin
                ? "Request stock from HQ into your warehouse and track receipts."
                : "Manage suppliers, item sourcing, purchase orders, receipts, and replenishment drafts."}
            </p>
          </div>
          {tab === "procurement" && <ProcurementSection />}
        </TabsContent>

        <TabsContent value="monitoring" className="mt-4">
          {tab === "monitoring" && <MonitoringSection />}
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
