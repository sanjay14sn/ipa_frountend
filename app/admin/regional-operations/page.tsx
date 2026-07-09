"use client";

import { Suspense, useEffect } from "react";
import { PageTabs, TabsContent } from "@/components/shared/page-tabs";
import { PageSkeleton } from "@/components/shared";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { useUser } from "@/context/user-context";
import { useRegions } from "@/hooks/api/region-tracking.hooks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminOrdersTable from "@/components/orders/AdminOrdersTable";
import AdminShippingTable from "@/components/shipping/AdminShippingTable";
import PaymentsTable from "@/components/payments/PaymentsTable";
import { InventorySection } from "../operations/components/inventory-section";
import { MonitoringSection } from "../operations/components/MonitoringSection";

// Same surface as Operations, minus Procurement — this is a read-only oversight view.
const TABS = ["orders", "shipping", "payments", "inventory", "monitoring"] as const;

function RegionalOperationsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const isSuperAdmin = user?.role === "admin" && user.adminRole === "super";

  const [tab, setTab] = useTabFromUrl("monitoring", TABS);

  // Region is chosen here (not "my region"): orders/shipping/payments scope by the
  // region's admin, inventory/monitoring by its warehouse. Both ride in the URL.
  const regionsQuery = useRegions(isSuperAdmin);
  const regions = regionsQuery.data ?? [];

  const selectedRegionAdminId = searchParams.get("regionAdminId");
  const regionAdminId = selectedRegionAdminId
    ? Number(selectedRegionAdminId)
    : undefined;
  const regionLocationParam = searchParams.get("regionLocationId");
  const regionLocationId = regionLocationParam
    ? Number(regionLocationParam)
    : undefined;

  useEffect(() => {
    if (user && !isSuperAdmin) {
      router.replace("/admin/dashboard");
    }
  }, [isSuperAdmin, router, user]);

  if (user && !isSuperAdmin) {
    return null;
  }

  const onRegionChange = (value: string) => {
    const region = regions.find((r) => String(r.adminId) === value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("regionAdminId", value);
    params.set("regionLocationId", String(region?.warehouseLocationId ?? 1));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <PageTabs
      title="Regional Operations"
      description="Read-only oversight of each region's orders, shipping, payments, inventory, and monitoring."
      tabs={[
        { value: "orders", label: "Orders" },
        { value: "shipping", label: "Shipping" },
        { value: "payments", label: "Payments" },
        { value: "inventory", label: "Inventory" },
        { value: "monitoring", label: "Monitoring" },
      ]}
      value={tab}
      onValueChange={setTab}
      headerExtras={
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Region</span>
        <Select
          value={selectedRegionAdminId ?? ""}
          onValueChange={onRegionChange}
        >
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Select a region" />
          </SelectTrigger>
          <SelectContent>
            {regions.map((region) => (
              <SelectItem key={region.adminId} value={String(region.adminId)}>
                {region.isCentral
                  ? `Central / HQ · ${region.adminName}`
                  : `${region.state ?? region.adminName} · ${region.adminName}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      }
    >
      {regionAdminId == null ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
          {regions.length === 0
            ? "No regions found yet."
            : "Select a region above to view its operations (read-only)."}
        </div>
      ) : (
        <>
          <TabsContent value="orders" className="mt-4 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Order management</h2>
              <p className="text-muted-foreground">
                Paid demand, allocation, backorders, and cancellations for this region.
              </p>
            </div>
            {tab === "orders" && (
              <AdminOrdersTable regionAdminId={regionAdminId} readOnly />
            )}
          </TabsContent>

          <TabsContent value="shipping" className="mt-4 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Shipping</h2>
              <p className="text-muted-foreground">
                Dispatch status for this region&apos;s ready orders.
              </p>
            </div>
            {tab === "shipping" && (
              <AdminShippingTable regionAdminId={regionAdminId} readOnly />
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-4 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Payments</h2>
              <p className="text-muted-foreground">
                Billing summaries across all regions (not region-filtered).
              </p>
            </div>
            {tab === "payments" && <PaymentsTable />}
          </TabsContent>

          <TabsContent value="inventory" className="mt-4">
            {tab === "inventory" && (
              <InventorySection regionLocationId={regionLocationId} readOnly />
            )}
          </TabsContent>

          <TabsContent value="monitoring" className="mt-4">
            {tab === "monitoring" && (
              <MonitoringSection
                regionAdminId={regionAdminId}
                regionLocationId={regionLocationId}
              />
            )}
          </TabsContent>
        </>
      )}
    </PageTabs>
  );
}

export default function RegionalOperationsPage() {
  return (
    <Suspense
      fallback={<PageSkeleton />}
    >
      <RegionalOperationsInner />
    </Suspense>
  );
}
