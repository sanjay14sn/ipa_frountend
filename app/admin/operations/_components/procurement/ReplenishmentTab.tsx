"use client";

import { formatRupees } from "@/lib/currency-utils";

import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
} from "@/components/shared";
import { TabsContent } from "@/components/ui/tabs";
import type { PurchaseOrderSummary } from "@/services/procurement.service";
import { ProcurementRecordsCard } from "./ProcurementRecordsCard";
import {
  ITEMS_PER_PAGE,
  statusBadge,
} from "./procurement-utils";
import { formatDate } from "@/lib/date-utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ReplenishmentTabProps = {
  // Data
  replenishmentDrafts: PurchaseOrderSummary[] | undefined;
  draftsIsFetching: boolean;
  draftsTotal: number;
  draftsTotalPages: number;
  // Filters / pagination
  replenishmentPage: number;
  replenishmentFilters: DataTableFilter[];
  // Callbacks
  onReplenishmentSearchChange: (value: string) => void;
  onReplenishmentFilterChange: (key: string, value: string | string[]) => void;
  onReplenishmentPageChange: (page: number) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReplenishmentTab({
  replenishmentDrafts,
  draftsIsFetching,
  draftsTotal,
  draftsTotalPages,
  replenishmentPage,
  replenishmentFilters,
  onReplenishmentSearchChange,
  onReplenishmentFilterChange,
  onReplenishmentPageChange,
}: ReplenishmentTabProps) {
  const replenishmentColumns: DataTableColumn<PurchaseOrderSummary>[] = [
    { key: "draft", header: "Draft" },
    {
      key: "supplier",
      header: "Supplier",
      render: (draft) => draft.supplier?.name ?? "Unknown supplier",
    },
    {
      key: "status",
      header: "Status",
      render: (draft) => statusBadge(draft.status),
    },
    {
      key: "lines",
      header: "Lines",
      render: (draft) => (
        <span>
          {draft.lines.length} line{draft.lines.length === 1 ? "" : "s"}
        </span>
      ),
    },
    {
      key: "expected",
      header: "Expected",
      render: (draft) => formatDate(draft.expectedDeliveryAt),
    },
    {
      key: "total",
      header: "Total",
      render: (draft) => formatRupees(draft.totalCost),
    },
  ];

  return (
    <TabsContent value="replenishment" className="space-y-6">
      <ProcurementRecordsCard
        title="Replenishment drafts"
        description="Review replenishment suggestions as a queue of records before turning them into purchase orders."
      >
        <DataTable<PurchaseOrderSummary>
          data={replenishmentDrafts ?? []}
          loading={draftsIsFetching}
          columns={replenishmentColumns}
          getRowId={(draft) => String(draft.id)}
          renderMainCell={(draft) => (
            <div className="flex flex-col">
              <span className="font-medium">
                {draft.referenceNo || "Draft"}
              </span>
              <span className="text-sm text-muted-foreground">
                {draft.supplier?.name ?? "No supplier"}
              </span>
            </div>
          )}
          searchPlaceholder="Search replenishment drafts..."
          onSearchChange={(value) => onReplenishmentSearchChange(value)}
          filters={replenishmentFilters}
          onFilterChange={onReplenishmentFilterChange}
          pagination={{
            total: draftsTotal,
            totalPages: draftsTotalPages,
          }}
          currentPage={replenishmentPage}
          onPageChange={onReplenishmentPageChange}
          itemsPerPage={ITEMS_PER_PAGE}
          resultsText={(count, total) =>
            `Showing ${count} of ${total} replenishment draft${total === 1 ? "" : "s"}`
          }
          emptyMessage="No replenishment drafts are queued right now."
        />
      </ProcurementRecordsCard>
    </TabsContent>
  );
}
