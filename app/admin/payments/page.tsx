"use client";

import PaymentsTable from "./components/PaymentsTable";

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Payment Management
          </h1>
          <p className="text-muted-foreground">
            Manage and track all franchisee payments and subscriptions
          </p>
        </div>
      </div>

      <PaymentsTable />
    </div>
  );
}
