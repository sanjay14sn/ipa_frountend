"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { DataTable } from "@/components/shared";
import {
  adjustInventoryStock,
  createInventory,
  deleteInventory,
  getInventoryItemsForLevel,
  updateInventory,
  type InventoryItemSummary,
} from "@/services/inventory.service";
import { isInventoryCategory } from "@/lib/inventory-categories";
import {
  invalidateAfterStockAdjustment,
  invalidateInventoryAdminLists,
  useInventoryPaginatedQuery,
} from "@/hooks/api/inventory.hooks";
import { useLevelsByProgram } from "@/hooks/api/level.hooks";
import { useStreamsByProgram } from "@/hooks/api/stream.hooks";
import { getAllPrograms } from "@/services/program.service";
import {
  deriveAdjustmentPreview,
  EMPTY_ADJUSTMENT,
  EMPTY_FORM,
  mapInventoryFormToPayload,
  mapItemToEditForm,
  type AdjustmentFormState,
  type InventoryFormState,
} from "./inventory/types";
import {
  AddInventoryDialog,
  DeleteInventoryDialog,
  EditInventoryDialog,
} from "./inventory/inventory-item-dialogs";
import { StockAdjustmentDialog } from "./inventory/stock-adjustment-dialog";
import { MovementHistoryDialog } from "./inventory/movement-history-dialog";
import {
  buildInventoryColumns,
  InventoryExpandedRow,
  INVENTORY_TABLE_FILTERS,
  INVENTORY_SORT_OPTIONS,
} from "./inventory/inventory-table-columns";
import { InventoryLevelAssignmentCard } from "./inventory/inventory-level-assignment-card";
import { InventoryTableToolbar } from "./inventory/inventory-table-toolbar";

const ITEMS_PER_PAGE = 10;

interface InventorySectionProps {
  regionLocationId?: number;
  /** Read-only oversight view (super-admin regional operations): hide all mutation affordances. */
  readOnly?: boolean;
}

export function InventorySection({
  regionLocationId,
  readOnly,
}: InventorySectionProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [programFilter, setProgramFilter] = useState<number | "">(
    searchParams.get("programId") ? Number(searchParams.get("programId")) : "",
  );
  const [levelFilter, setLevelFilter] = useState<number | "">(
    searchParams.get("levelId") ? Number(searchParams.get("levelId")) : "",
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [formData, setFormData] = useState<InventoryFormState>(EMPTY_FORM);
  const [editingItem, setEditingItem] = useState<InventoryItemSummary | null>(null);
  const [editForm, setEditForm] = useState<InventoryFormState>(EMPTY_FORM);
  const [deletingItem, setDeletingItem] = useState<InventoryItemSummary | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItemSummary | null>(null);
  const [adjustForm, setAdjustForm] = useState<AdjustmentFormState>(EMPTY_ADJUSTMENT);
  const [isAdjustSubmitting, setIsAdjustSubmitting] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<InventoryItemSummary | null>(null);

  const programIdNum = programFilter === "" || programFilter === 0 ? undefined : Number(programFilter);
  const levelIdNum = levelFilter === "" || levelFilter === 0 ? undefined : Number(levelFilter);

  const { data: programs = [] } = useQuery({ queryKey: ["programs", "all", "inventory"], queryFn: getAllPrograms });
  const assignedItemsQuery = useQuery({
    queryKey: ["inventory", "level-items", levelIdNum ?? "none"],
    queryFn: () => getInventoryItemsForLevel(levelIdNum!),
    enabled: Boolean(levelIdNum),
  });
  const assignedItems = assignedItemsQuery.data ?? [];
  const levels = useLevelsByProgram(programIdNum).data ?? [];
  const streams = useStreamsByProgram(programIdNum).data ?? [];

  const inventoryQuery = useInventoryPaginatedQuery({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: searchTerm || undefined,
    programId: programIdNum,
    levelId: levelIdNum,
    category: categoryFilter || undefined,
    status: statusFilter || undefined,
    lowStock: lowStockOnly || undefined,
    sortBy,
    sortOrder,
    regionLocationId,
  });

  const { rows: inventory, total, totalPages, isPending: loading } = inventoryQuery;

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    programFilter,
    levelFilter,
    categoryFilter,
    statusFilter,
    lowStockOnly,
    sortBy,
    sortOrder,
  ]);

  async function refreshInventoryViews() {
    await invalidateInventoryAdminLists();
    if (levelIdNum) await assignedItemsQuery.refetch();
  }

  async function handleAdd() {
    const category = formData.categoryName.trim();
    if (!formData.name.trim() || !isInventoryCategory(category)) {
      toast.error("Item name and a valid category are required.");
      return;
    }
    try {
      await createInventory(mapInventoryFormToPayload(formData, category));
      toast.success("Inventory item created");
      setIsAddOpen(false);
      setFormData(EMPTY_FORM);
      await refreshInventoryViews();
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    }
  }

  async function handleEdit() {
    const category = editForm.categoryName.trim();
    if (!editingItem || !isInventoryCategory(category)) {
      toast.error("A valid category is required.");
      return;
    }
    try {
      const payload = mapInventoryFormToPayload(editForm, category);
      await updateInventory(editingItem.id, payload);
      toast.success("Inventory item updated");
      setIsEditOpen(false);
      setEditingItem(null);
      await refreshInventoryViews();
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    }
  }

  async function handleDelete() {
    if (!deletingItem) return;
    try {
      await deleteInventory(deletingItem.id);
      toast.success("Inventory item deleted");
      setIsDeleteOpen(false);
      setDeletingItem(null);
      await refreshInventoryViews();
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    }
  }

  function openProcurement(itemId: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "procurement");
    params.set("inventoryItemId", String(itemId));
    params.set("procurementAction", "add-sourcing");
    router.replace(`${pathname.replace("/inventory", "/operations")}?${params.toString()}`);
  }

  function openEdit(item: InventoryItemSummary) {
    setEditingItem(item);
    setEditForm(mapItemToEditForm(item));
    setIsEditOpen(true);
  }

  function openAdjust(item: InventoryItemSummary) {
    setAdjustingItem(item);
    setAdjustForm(EMPTY_ADJUSTMENT);
    setIsAdjustOpen(true);
  }

  function openHistory(item: InventoryItemSummary) {
    setHistoryItem(item);
    setIsHistoryOpen(true);
  }

  function closeAdjust() {
    if (isAdjustSubmitting) return;
    setIsAdjustOpen(false);
    setAdjustingItem(null);
    setAdjustForm(EMPTY_ADJUSTMENT);
  }

  async function handleAdjust() {
    if (!adjustingItem) return;
    const trimmedReason = adjustForm.reason.trim();
    const trimmedCost = adjustForm.unitCost.trim();

    // Re-use the preview logic for the final submit validation.
    const preview = deriveAdjustmentPreview(adjustingItem, adjustForm);
    if (preview.error) {
      toast.error(preview.error);
      return;
    }
    if (!trimmedReason) {
      toast.error("A reason is required for stock adjustments.");
      return;
    }
    if (trimmedReason.length > 500) {
      toast.error("Reason must be 500 characters or fewer.");
      return;
    }

    const { deltaQty } = preview;
    let unitCost: number | undefined;
    if (adjustForm.direction === "INCREASE" && trimmedCost) {
      const costNum = Number(trimmedCost);
      if (!Number.isFinite(costNum) || costNum < 0) {
        toast.error("Unit cost must be zero or positive.");
        return;
      }
      unitCost = costNum;
    }

    try {
      setIsAdjustSubmitting(true);
      await adjustInventoryStock({
        inventoryItemId: adjustingItem.id,
        deltaQty,
        reason: trimmedReason,
        ...(unitCost !== undefined ? { unitCost } : {}),
      });
      toast.success(
        deltaQty > 0
          ? `Added ${Math.abs(deltaQty)} to stock. Backorders for this item are being replenished.`
          : `Removed ${Math.abs(deltaQty)} from stock.`,
      );
      setIsAdjustOpen(false);
      setAdjustingItem(null);
      setAdjustForm(EMPTY_ADJUSTMENT);
      if (deltaQty > 0) await invalidateAfterStockAdjustment(adjustingItem.id);
      await refreshInventoryViews();
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    } finally {
      setIsAdjustSubmitting(false);
    }
  }

  const adjustPreview = deriveAdjustmentPreview(adjustingItem, adjustForm);

  const columns = buildInventoryColumns({
    onHistory: openHistory,
    onAdjust: openAdjust,
    onProcurement: openProcurement,
    onEdit: openEdit,
    onDelete: (item) => {
      setDeletingItem(item);
      setIsDeleteOpen(true);
    },
    readOnly,
  });

  const toolbarActions = (
    <InventoryTableToolbar
      programFilter={programFilter}
      levelFilter={levelFilter}
      programs={programs}
      levels={levels}
      streams={streams}
      onProgramChange={(value) => {
        setProgramFilter(value);
        setLevelFilter("");
      }}
      onLevelChange={setLevelFilter}
      onAddClick={() => {
        setFormData(EMPTY_FORM);
        setIsAddOpen(true);
      }}
      readOnly={readOnly}
    />
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Inventory catalog</CardTitle>
          {/* ADM-24: one line of orientation — detail lives in row tooltips. */}
          <p className="text-sm text-muted-foreground">
            The item master with stock levels; use a row&apos;s Adjust action
            to record manual corrections, or its History action to review
            every movement.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!readOnly && levelIdNum ? (
            <InventoryLevelAssignmentCard
              levelIdNum={levelIdNum}
              assignedItems={assignedItems}
              onRefresh={refreshInventoryViews}
              onAssignedItemsRefetch={() => assignedItemsQuery.refetch()}
            />
          ) : null}

          <DataTable
            data={inventory}
            loading={loading}
            columns={columns}
            getRowId={(item) => String(item.id)}
            renderMainCell={(item) => (
              <span className="font-medium">
                {item.name}
                {item.sku ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    · {item.sku}
                  </span>
                ) : null}
              </span>
            )}
            renderExpandedContent={(item) => <InventoryExpandedRow item={item} />}
            searchPlaceholder="Name, SKU, legacy code..."
            onSearchChange={setSearchTerm}
            filters={INVENTORY_TABLE_FILTERS}
            onFilterChange={(key, value) => {
              const v = Array.isArray(value) ? value[0] ?? "" : value;
              if (key === "category") setCategoryFilter(v === "all" ? "" : v);
              else if (key === "status") setStatusFilter(v === "all" ? "" : v);
              else if (key === "lowStock") setLowStockOnly(v === "true");
            }}
            sortOptions={INVENTORY_SORT_OPTIONS}
            defaultSortBy={sortBy}
            defaultSortOrder={sortOrder}
            onSortChange={(nextSortBy, nextSortOrder) => {
              setSortBy(nextSortBy);
              setSortOrder(nextSortOrder);
            }}
            toolbarActions={toolbarActions}
            pagination={{ total, totalPages }}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            emptyMessage="No inventory items match the current filters."
            resultsText={(count, totalCount) =>
              `Showing ${count} of ${totalCount} item${totalCount !== 1 ? "s" : ""}.`
            }
          />
        </CardContent>
      </Card>

      <AddInventoryDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        form={formData}
        setForm={setFormData}
        onConfirm={() => void handleAdd()}
      />

      <EditInventoryDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        form={editForm}
        setForm={setEditForm}
        onConfirm={() => void handleEdit()}
      />

      <DeleteInventoryDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        item={deletingItem}
        onConfirm={() => void handleDelete()}
      />

      <StockAdjustmentDialog
        open={isAdjustOpen}
        adjustingItem={adjustingItem}
        adjustForm={adjustForm}
        setAdjustForm={setAdjustForm}
        adjustPreview={adjustPreview}
        isAdjustSubmitting={isAdjustSubmitting}
        onClose={closeAdjust}
        onConfirm={() => void handleAdjust()}
      />

      <MovementHistoryDialog
        open={isHistoryOpen}
        item={historyItem}
        regionLocationId={regionLocationId}
        onClose={() => {
          setIsHistoryOpen(false);
          setHistoryItem(null);
        }}
      />
    </div>
  );
}
