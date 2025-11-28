"use client";

import AdminShippingTable from "./components/AdminShippingTable";

export default function AdminShippingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipping Management</h1>
          <p className="text-muted-foreground">Manage and track orders for shipping</p>
        </div>
      </div>

      <AdminShippingTable />
    </div>
  );
}


