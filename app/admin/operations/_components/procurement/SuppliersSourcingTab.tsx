"use client";

import { formatRupees } from "@/lib/currency-utils";

import { Plus } from "lucide-react";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AppDialog,
  AppDialogBody,
  AppDialogFooter,
  AppDialogHeader,
  DialogFormField,
  FormDialog,
  DialogFormGrid,
} from "@/components/shared/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleField } from "@/components/shared/toggle-field";
import { TabsContent } from "@/components/ui/tabs";
import { ProcurementBulkLinePicker } from "@/components/procurement/ProcurementBulkLinePicker";
import type { BulkSourcingLineSubmit } from "@/components/procurement/ProcurementBulkLinePicker";
import type {
  Supplier,
  SupplierItemTerm,
} from "@/services/procurement.service";
import { ProcurementRecordsCard } from "./ProcurementRecordsCard";
import {
  booleanBadge,
  ITEMS_PER_PAGE,
  type SupplierFormState,
} from "./procurement-utils";
import type { InventoryItemSummary as InventoryItem } from "@/services/inventory.service";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type SuppliersSourcingTabProps = {
  // Data
  suppliers: Supplier[] | undefined;
  suppliersIsFetching: boolean;
  suppliersTotal: number;
  suppliersTotal_pages: number;
  supplierTerms: SupplierItemTerm[] | undefined;
  termsIsFetching: boolean;
  termsTotal: number;
  termsTotalPages: number;
  allSuppliers: Supplier[];
  allSupplierTerms: SupplierItemTerm[];
  inventoryItems: InventoryItem[];
  inventoryIsLoading: boolean;
  inventoryPrefillItem?: InventoryItem;
  // Filters / pagination state
  supplierPage: number;
  termPage: number;
  supplierFilters: DataTableFilter[];
  sourcingFilters: DataTableFilter[];
  // Callbacks - supplier table
  onSupplierSearchChange: (value: string) => void;
  onSupplierFilterChange: (key: string, value: string | string[]) => void;
  onSupplierPageChange: (page: number) => void;
  // Callbacks - sourcing terms table
  onSourcingSearchChange: (value: string) => void;
  onSourcingFilterChange: (key: string, value: string | string[]) => void;
  onTermPageChange: (page: number) => void;
  // Shortcut card
  onOpenSourcingModal: (prefilledInventoryItemId?: number) => void;
  onOpenSupplierModal: () => void;
  // Supplier dialog
  isSupplierOpen: boolean;
  onSupplierOpenChange: (open: boolean) => void;
  supplierForm: SupplierFormState;
  onSupplierFormChange: (patch: Partial<SupplierFormState>) => void;
  onCreateSupplier: () => void;
  submitting: boolean;
  // Sourcing dialog
  isSourcingOpen: boolean;
  onSourcingOpenChange: (open: boolean) => void;
  sourcingSupplierId: number | "";
  onSourcingSupplierIdChange: (id: number | "") => void;
  sourcingItemSeed: number[];
  onSourcingItemSeedChange: (seed: number[]) => void;
  linkedItemIdsForSourcingSupplier: Set<number>;
  onBulkSourcingSubmit: (lines: BulkSourcingLineSubmit[]) => Promise<void>;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SuppliersSourcingTab({
  suppliers,
  suppliersIsFetching,
  suppliersTotal,
  suppliersTotal_pages,
  supplierTerms,
  termsIsFetching,
  termsTotal,
  termsTotalPages,
  allSuppliers,
  allSupplierTerms,
  inventoryItems,
  inventoryIsLoading,
  inventoryPrefillItem,
  supplierPage,
  termPage,
  supplierFilters,
  sourcingFilters,
  onSupplierSearchChange,
  onSupplierFilterChange,
  onSupplierPageChange,
  onSourcingSearchChange,
  onSourcingFilterChange,
  onTermPageChange,
  onOpenSourcingModal,
  onOpenSupplierModal,
  isSupplierOpen,
  onSupplierOpenChange,
  supplierForm,
  onSupplierFormChange,
  onCreateSupplier,
  submitting,
  isSourcingOpen,
  onSourcingOpenChange,
  sourcingSupplierId,
  onSourcingSupplierIdChange,
  sourcingItemSeed,
  onSourcingItemSeedChange,
  linkedItemIdsForSourcingSupplier,
  onBulkSourcingSubmit,
}: SuppliersSourcingTabProps) {
  const supplierColumns: DataTableColumn<Supplier>[] = [
    { key: "supplier", header: "Supplier" },
    {
      key: "contact",
      header: "Contact",
      render: (supplier) => (
        <div className="space-y-1">
          <div>{supplier.contactPerson || "No contact set"}</div>
          <div className="text-xs text-muted-foreground">
            {supplier.email || supplier.phone || "No contact details"}
          </div>
        </div>
      ),
    },
    {
      key: "city",
      header: "City",
      render: (supplier) => supplier.city || "-",
    },
    {
      key: "gstin",
      header: "GSTIN",
      render: (supplier) => supplier.gstin || "-",
    },
    {
      key: "status",
      header: "Status",
      render: (supplier) => booleanBadge(supplier.isActive, "Active", "Inactive"),
    },
  ];

  const termColumns: DataTableColumn<SupplierItemTerm>[] = [
    { key: "item", header: "Item" },
    {
      key: "supplier",
      header: "Supplier",
      render: (term) => term.supplier?.name ?? `Supplier #${term.supplierId}`,
    },
    {
      key: "supplierSku",
      header: "SKU",
      render: (term) => term.supplierSku || term.supplier?.code || "-",
    },
    {
      key: "cost",
      header: "Unit cost",
      render: (term) => formatRupees(term.currentUnitCost),
    },
    {
      key: "lead",
      header: "Lead",
      render: (term) => `${term.leadTimeDays} day${term.leadTimeDays === 1 ? "" : "s"}`,
    },
    {
      key: "moq",
      header: "MOQ / Pack",
      render: (term) => `${term.moq} / ${term.casePack}`,
    },
    {
      key: "preferred",
      header: "Preferred",
      render: (term) => booleanBadge(term.isPreferred, "Yes", "No"),
    },
  ];

  return (
    <>
      <TabsContent value="suppliers-sourcing" className="space-y-6">
        {inventoryPrefillItem ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="font-medium">Inventory shortcut detected</div>
                <p className="text-sm text-muted-foreground">
                  New sourcing records will open with{" "}
                  <span className="font-medium text-foreground">
                    {inventoryPrefillItem.name} ({inventoryPrefillItem.sku})
                  </span>{" "}
                  already selected.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => onOpenSourcingModal(inventoryPrefillItem.id)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add sourcing
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <ProcurementRecordsCard
          title="Supplier directory"
          description="View supplier records first, then add a new supplier only when needed."
        >
          <DataTable<Supplier>
            data={suppliers ?? []}
            loading={suppliersIsFetching}
            columns={supplierColumns}
            getRowId={(supplier) => String(supplier.id)}
            renderMainCell={(supplier) => (
              <div className="flex flex-col">
                <span className="font-medium">{supplier.name}</span>
                <span className="text-sm text-muted-foreground">
                  {supplier.code || "Code pending"}
                </span>
              </div>
            )}
            searchPlaceholder="Search suppliers..."
            onSearchChange={(value) => onSupplierSearchChange(value)}
            filters={supplierFilters}
            onFilterChange={onSupplierFilterChange}
            pagination={{
              total: suppliersTotal,
              totalPages: suppliersTotal_pages,
            }}
            currentPage={supplierPage}
            onPageChange={onSupplierPageChange}
            itemsPerPage={ITEMS_PER_PAGE}
            resultsText={(count, total) =>
              `Showing ${count} of ${total} supplier${total === 1 ? "" : "s"}`
            }
            emptyMessage="No suppliers match the current filters."
            toolbarActions={
              <Button onClick={onOpenSupplierModal}>
                <Plus className="mr-2 h-4 w-4" />
                Add supplier
              </Button>
            }
          />
        </ProcurementRecordsCard>

        <ProcurementRecordsCard
          title="Item sourcing"
          description="Review sourcing terms across suppliers and open the creation form only when you need a new term."
        >
          <DataTable<SupplierItemTerm>
            data={supplierTerms ?? []}
            loading={termsIsFetching}
            columns={termColumns}
            getRowId={(term) => String(term.id)}
            renderMainCell={(term) => (
              <div className="flex flex-col">
                <span className="font-medium">
                  {term.inventoryItem?.name ?? `Item #${term.inventoryItemId}`}
                </span>
                <span className="text-sm text-muted-foreground">
                  {term.inventoryItem?.sku ?? "No SKU"}
                </span>
              </div>
            )}
            searchPlaceholder="Search sourcing terms..."
            onSearchChange={(value) => onSourcingSearchChange(value)}
            filters={sourcingFilters}
            onFilterChange={onSourcingFilterChange}
            pagination={{
              total: termsTotal,
              totalPages: termsTotalPages,
            }}
            currentPage={termPage}
            onPageChange={onTermPageChange}
            itemsPerPage={ITEMS_PER_PAGE}
            resultsText={(count, total) =>
              `Showing ${count} of ${total} sourcing term${total === 1 ? "" : "s"}`
            }
            emptyMessage="No sourcing terms match the current filters."
            toolbarActions={
              <Button onClick={() => onOpenSourcingModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Add sourcing
              </Button>
            }
          />
        </ProcurementRecordsCard>
      </TabsContent>

      <FormDialog
        open={isSupplierOpen}
        onOpenChange={onSupplierOpenChange}
        size="lg"
        title="Add supplier"
        description="Supplier creation is tucked behind a modal so the records view stays focused."
        headerIcon={Plus}
        onSubmit={(e) => {
          e.preventDefault();
          onCreateSupplier();
        }}
        isSubmitting={submitting}
        submitLabel="Create supplier"
      >
        <DialogFormField label="Supplier name">
          <Input
            value={supplierForm.name}
            onChange={(event) => onSupplierFormChange({ name: event.target.value })}
          />
        </DialogFormField>
        <DialogFormField label="Contact person">
          <Input
            value={supplierForm.contactPerson}
            onChange={(event) =>
              onSupplierFormChange({ contactPerson: event.target.value })
            }
          />
        </DialogFormField>
        <DialogFormGrid cols={2}>
          <DialogFormField label="Email">
            <Input
              value={supplierForm.email}
              onChange={(event) => onSupplierFormChange({ email: event.target.value })}
            />
          </DialogFormField>
          <DialogFormField label="Phone">
            <Input
              value={supplierForm.phone}
              onChange={(event) => onSupplierFormChange({ phone: event.target.value })}
            />
          </DialogFormField>
          <DialogFormField label="City">
            <Input
              value={supplierForm.city}
              onChange={(event) => onSupplierFormChange({ city: event.target.value })}
            />
          </DialogFormField>
          <DialogFormField label="GSTIN">
            <Input
              value={supplierForm.gstin}
              onChange={(event) => onSupplierFormChange({ gstin: event.target.value })}
            />
          </DialogFormField>
        </DialogFormGrid>
        <ToggleField
          label="Supplier status"
          value={supplierForm.isActive ? "active" : "inactive"}
          onValueChange={(v) => onSupplierFormChange({ isActive: v === "active" })}
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
      </FormDialog>

      <AppDialog
        open={isSourcingOpen}
        onOpenChange={onSourcingOpenChange}
        size="xl"
        padding="flush"
        scrollBody
      >
        <AppDialogHeader
          title="Add sourcing"
          description="Choose one supplier, then select inventory items to create or update sourcing terms in bulk."
          sticky
        />
        <AppDialogBody layout="fill" className="space-y-3">
          <div className="shrink-0 space-y-3">
            <DialogFormField label="Supplier">
              <Select
                value={sourcingSupplierId === "" ? "none" : String(sourcingSupplierId)}
                onValueChange={(value) =>
                  onSourcingSupplierIdChange(value === "none" ? "" : Number(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choose supplier</SelectItem>
                  {allSuppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={String(supplier.id)}>
                      {supplier.name} ({supplier.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DialogFormField>
            {sourcingSupplierId !== "" ? (
              <div className="rounded-lg border border-border bg-card px-3 py-2 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Existing sourcing
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {allSupplierTerms.filter((t) => t.supplierId === sourcingSupplierId).length} items
                  </div>
                </div>
                {allSupplierTerms.filter((t) => t.supplierId === sourcingSupplierId)
                  .length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No rows yet for this supplier.
                  </p>
                ) : (
                  <div className="flex max-h-14 flex-wrap gap-1 overflow-y-auto scrollbar-green">
                    {allSupplierTerms
                      .filter((t) => t.supplierId === sourcingSupplierId)
                      .map((term) => (
                        <Badge
                          key={term.id}
                          variant="secondary"
                          className="h-6 gap-1 rounded-full px-2 py-0 text-[11px] font-normal"
                        >
                          {term.inventoryItem?.name ?? `Item #${term.inventoryItemId}`}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
          {sourcingSupplierId !== "" ? (
            <ProcurementBulkLinePicker
              key={`sourcing-${String(sourcingSupplierId)}-${sourcingItemSeed.join(",")}`}
              mode="sourcing"
              resetKey={`${String(sourcingSupplierId)}-${sourcingItemSeed.join(",")}`}
              catalogItems={inventoryItems}
              isCatalogLoading={inventoryIsLoading}
              excludeInventoryIds={linkedItemIdsForSourcingSupplier}
              initialSourcingItemIds={sourcingItemSeed}
              onSubmitSourcing={onBulkSourcingSubmit}
            />
          ) : (
            <p className="shrink-0 text-sm text-muted-foreground">
              Select a supplier to enable the item picker. Saving runs from the
              picker&apos;s Save button.
            </p>
          )}
        </AppDialogBody>
        <AppDialogFooter
          sticky
          padded
          secondary={{
            label: "Close",
            onClick: () => {
              onSourcingOpenChange(false);
              onSourcingSupplierIdChange("");
              onSourcingItemSeedChange([]);
            },
          }}
        />
      </AppDialog>
    </>
  );
}
