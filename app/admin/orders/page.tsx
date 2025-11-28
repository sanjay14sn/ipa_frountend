"use client";

import AdminOrdersTable from "./components/AdminOrdersTable";

export default function AdminOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Order Management
          </h1>
          <p className="text-muted-foreground">
            Manage and track all franchise material orders
          </p>
        </div>
      </div>

      <AdminOrdersTable />
    </div>
  );
}
