"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightLeft,
  Boxes,
  Edit2,
  Plus,
  Trash2,
  Unlink2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleField } from "@/components/shared/toggle-field";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  DataTable,
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
  StatusBadge,
  type DataTableColumn,
  type DataTableFilter,
  type DataTableSortOption,
} from "@/components/shared";
import { Separator } from "@/components/ui/separator";
import { getAllPrograms, type Program } from "@/services/program.service";
import type { Level } from "@/services/level.service";
import type { Stream } from "@/services/stream.service";
import {
  adjustInventoryStock,
  bulkAssignInventoryToLevel,
  createInventory,
  deleteInventory,
  getAllInventory,
  getInventoryItemsForLevel,
  unassignInventoryFromLevel,
  updateInventory,
  type CreateInventoryDto,
  type InventoryItemSummary,
  type InventoryLifecycleStatus,
  type InventoryType,
  type UpdateInventoryDto,
} from "@/services/inventory.service";
import {
  INVENTORY_CATEGORIES,
  isInventoryCategory,
  type InventoryCategoryName,
} from "@/lib/inventory-categories";
import {
  invalidateAfterStockAdjustment,
  invalidateInventoryAdminLists,
  invalidateLevelItems,
  useInventoryPaginatedQuery,
} from "@/hooks/api/inventory.hooks";
import { InventoryCheckboxLinkPanel } from "@/components/inventory/InventoryCheckboxLinkPanel";
import { useLevelsByProgram } from "@/hooks/api/level.hooks";
import { useStreamsByProgram } from "@/hooks/api/stream.hooks";

const ITEMS_PER_PAGE = 10;

const INVENTORY_TYPES: InventoryType[] = [
  "SALEABLE",
  "PACKAGING",
  "MARKETING",
  "ADMIN_CONSUMABLE",
];
const LIFECYCLE_STATUSES: InventoryLifecycleStatus[] = [
  "ACTIVE",
  "OBSOLETE",
  "DISCONTINUED",
];

type InventoryFormState = {
  name: string;
  description: string;
  categoryName: string;
  legacyItemCode: string;
  legacyIsoCode: string;
  inventoryType: InventoryType;
  lifecycleStatus: InventoryLifecycleStatus;
  unitOfMeasurement: string;
  reorderPoint: number;
  safetyStock: number;
  reorderCycleDays: number;
  isActive: boolean;
};

type AdjustmentDirection = "INCREASE" | "DECREASE";

type AdjustmentFormState = {
  direction: AdjustmentDirection;
  quantity: string;
  reason: string;
  unitCost: string;
};

const EMPTY_ADJUSTMENT: AdjustmentFormState = {
  direction: "INCREASE",
  quantity: "",
  reason: "",
  unitCost: "",
};

const EMPTY_FORM: InventoryFormState = {
  name: "",
  description: "",
  categoryName: "",
  legacyItemCode: "",
  legacyIsoCode: "",
  inventoryType: "SALEABLE",
  lifecycleStatus: "ACTIVE",
  unitOfMeasurement: "Numbers",
  reorderPoint: 0,
  safetyStock: 0,
  reorderCycleDays: 30,
  isActive: true,
};

function levelFilterLabel(level: Level, streams: Stream[]) {
  const stream = streams.find((entry) => entry.id === level.streamId);
  const streamLabel = stream?.name?.trim();
  const suffix = streamLabel ? ` (${streamLabel})` : ` (stream ${level.streamId})`;
  return `${level.name}${suffix}`;
}

export function InventorySection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialProgramFilter = searchParams.get("programId");
  const initialLevelFilter = searchParams.get("levelId");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [programFilter, setProgramFilter] = useState<number | "">(
    initialProgramFilter ? Number(initialProgramFilter) : "",
  );
  const [levelFilter, setLevelFilter] = useState<number | "">(
    initialLevelFilter ? Number(initialLevelFilter) : "",
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
  const [adjustingItem, setAdjustingItem] =
    useState<InventoryItemSummary | null>(null);
  const [adjustForm, setAdjustForm] =
    useState<AdjustmentFormState>(EMPTY_ADJUSTMENT);
  const [isAdjustSubmitting, setIsAdjustSubmitting] = useState(false);

  const programIdNum =
    programFilter === "" || programFilter === 0 ? undefined : Number(programFilter);
  const levelIdNum =
    levelFilter === "" || levelFilter === 0 ? undefined : Number(levelFilter);

  const programsQuery = useQuery({
    queryKey: ["programs", "all", "inventory"],
    queryFn: getAllPrograms,
  });
  const catalogQuery = useQuery({
    queryKey: ["inventory", "catalog", "all"],
    queryFn: getAllInventory,
  });
  const assignedItemsQuery = useQuery({
    queryKey: ["inventory", "level-items", levelIdNum ?? "none"],
    queryFn: () => getInventoryItemsForLevel(levelIdNum!),
    enabled: Boolean(levelIdNum),
  });
  const levelsQuery = useLevelsByProgram(programIdNum);
  const streamsQuery = useStreamsByProgram(programIdNum);
  const programs = programsQuery.data ?? [];
  const assignedItems = assignedItemsQuery.data ?? [];
  const levels = levelsQuery.data ?? [];
  const streamsForFilter = streamsQuery.data ?? [];

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
  });

  const inventory = inventoryQuery.rows;
  const total = inventoryQuery.total;
  const totalPages = inventoryQuery.totalPages;
  const loading = inventoryQuery.isPending;

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

  function resetAddForm() {
    setFormData(EMPTY_FORM);
  }

  function mapFormToPayload(
    data: InventoryFormState,
    category: InventoryCategoryName | undefined,
  ): CreateInventoryDto {
    return {
      name: data.name.trim(),
      description: data.description.trim() || undefined,
      category,
      legacyItemCode: data.legacyItemCode.trim() || undefined,
      legacyIsoCode: data.legacyIsoCode.trim() || undefined,
      inventoryType: data.inventoryType,
      lifecycleStatus: data.lifecycleStatus,
      unitOfMeasurement: data.unitOfMeasurement.trim() || undefined,
      reorderPoint: Number(data.reorderPoint || 0),
      safetyStock: Number(data.safetyStock || 0),
      reorderCycleDays: Math.max(1, Number(data.reorderCycleDays || 30)),
      isActive: data.isActive,
    };
  }

  async function refreshInventoryViews() {
    await invalidateInventoryAdminLists();
    await catalogQuery.refetch();
    if (levelIdNum) {
      await assignedItemsQuery.refetch();
    }
  }

  async function handleAdd() {
    const category = formData.categoryName.trim();
    if (!formData.name.trim() || !isInventoryCategory(category)) {
      toast.error("Item name and a valid category are required.");
      return;
    }

    try {
      await createInventory(mapFormToPayload(formData, category));
      toast.success("Inventory item created");
      setIsAddOpen(false);
      resetAddForm();
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
      const payload = mapFormToPayload(editForm, category) as UpdateInventoryDto;
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

  async function handleUnassign(inventoryId: number) {
    if (!levelIdNum) return;
    try {
      await unassignInventoryFromLevel(levelIdNum, inventoryId);
      toast.success("Removed from level");
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
    setEditForm({
      name: item.name,
      description: item.description ?? "",
      categoryName: item.category ?? "",
      legacyItemCode: item.legacyItemCode ?? "",
      legacyIsoCode: item.legacyIsoCode ?? "",
      inventoryType: item.inventoryType,
      lifecycleStatus: item.lifecycleStatus,
      unitOfMeasurement: item.unitOfMeasurement ?? "Numbers",
      reorderPoint: item.reorderPoint,
      safetyStock: item.safetyStock,
      reorderCycleDays: item.reorderCycleDays,
      isActive: item.isActive,
    });
    setIsEditOpen(true);
  }

  function openAdjust(item: InventoryItemSummary) {
    setAdjustingItem(item);
    setAdjustForm(EMPTY_ADJUSTMENT);
    setIsAdjustOpen(true);
  }

  function closeAdjust() {
    if (isAdjustSubmitting) return;
    setIsAdjustOpen(false);
    setAdjustingItem(null);
    setAdjustForm(EMPTY_ADJUSTMENT);
  }

  /**
   * Parsed adjustment derived from `adjustForm` + `adjustingItem`.
   * Centralises validation and the projected on-hand calculation so the
   * dialog and the submit handler share the same source of truth.
   */
  function deriveAdjustmentPreview() {
    if (!adjustingItem) {
      return { error: null as string | null, deltaQty: 0, projected: 0 };
    }
    const trimmedQty = adjustForm.quantity.trim();
    const trimmedReason = adjustForm.reason.trim();
    const trimmedCost = adjustForm.unitCost.trim();

    const qtyNum = trimmedQty === "" ? NaN : Number(trimmedQty);
    if (!Number.isFinite(qtyNum) || !Number.isInteger(qtyNum) || qtyNum <= 0) {
      return {
        error: trimmedQty === "" ? null : "Quantity must be a positive whole number.",
        deltaQty: 0,
        projected: adjustingItem.onHandQty,
      };
    }

    const deltaQty = adjustForm.direction === "INCREASE" ? qtyNum : -qtyNum;
    const projected = adjustingItem.onHandQty + deltaQty;

    if (projected < 0) {
      return {
        error: `Cannot remove ${qtyNum} — only ${adjustingItem.onHandQty} on hand.`,
        deltaQty,
        projected,
      };
    }

    if (!trimmedReason) {
      return { error: null, deltaQty, projected };
    }

    if (trimmedCost && adjustForm.direction === "INCREASE") {
      const costNum = Number(trimmedCost);
      if (!Number.isFinite(costNum) || costNum < 0) {
        return {
          error: "Unit cost must be zero or positive.",
          deltaQty,
          projected,
        };
      }
    }

    return { error: null, deltaQty, projected };
  }

  async function handleAdjust() {
    if (!adjustingItem) return;
    const trimmedQty = adjustForm.quantity.trim();
    const trimmedReason = adjustForm.reason.trim();
    const trimmedCost = adjustForm.unitCost.trim();

    const qtyNum = Number(trimmedQty);
    if (!Number.isFinite(qtyNum) || !Number.isInteger(qtyNum) || qtyNum <= 0) {
      toast.error("Enter a positive whole-number quantity.");
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

    const deltaQty = adjustForm.direction === "INCREASE" ? qtyNum : -qtyNum;
    if (adjustingItem.onHandQty + deltaQty < 0) {
      toast.error(
        `Cannot remove ${qtyNum} — only ${adjustingItem.onHandQty} on hand.`,
      );
      return;
    }

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
          ? `Added ${qtyNum} to stock. Backorders for this item are being replenished.`
          : `Removed ${qtyNum} from stock.`,
      );
      setIsAdjustOpen(false);
      setAdjustingItem(null);
      setAdjustForm(EMPTY_ADJUSTMENT);
      // Positive adjustments can fulfil backordered order lines (including
      // CI-material orders), so refresh the full set of caches that show
      // order / CI training allocation state, not just inventory.
      if (deltaQty > 0) {
        await invalidateAfterStockAdjustment(adjustingItem.id);
      }
      await refreshInventoryViews();
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    } finally {
      setIsAdjustSubmitting(false);
    }
  }

  const columns: DataTableColumn<InventoryItemSummary>[] = [
    {
      key: "item",
      header: "Item",
    },
    {
      key: "category",
      header: "Category",
      render: (item) => item.category ?? "Uncategorized",
    },
    {
      key: "onHand",
      header: "On hand",
      className: "text-center",
      render: (item) => item.onHandQty,
    },
    {
      key: "status",
      header: "Status",
      render: (item) => {
        const lowStock =
          item.isActive && item.availableQty <= item.reorderPoint;
        if (lowStock) return <StatusBadge tone="warning" label="Low stock" />;
        return <StatusBadge label={item.isActive ? "Active" : "Inactive"} />;
      },
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (item) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openAdjust(item)}
            title="Adjust on-hand stock"
          >
            <Boxes className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openProcurement(item.id)}
            title="Manage sourcing in procurement"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(item)}
            title="Edit item"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => {
              setDeletingItem(item);
              setIsDeleteOpen(true);
            }}
            title="Delete item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const adjustPreview = deriveAdjustmentPreview();

  const tableFilters: DataTableFilter[] = [
    {
      key: "category",
      label: "Category",
      options: [
        { value: "all", label: "All categories" },
        ...INVENTORY_CATEGORIES.map((c) => ({ value: c, label: c })),
      ],
      defaultValue: "all",
    },
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
      defaultValue: "all",
    },
    {
      key: "lowStock",
      label: "Stock level",
      options: [
        { value: "all", label: "All items" },
        { value: "true", label: "Low stock only" },
      ],
      defaultValue: "all",
    },
  ];

  const tableSortOptions: DataTableSortOption[] = [
    { value: "name", label: "Name" },
    { value: "availableQty", label: "Available stock" },
    { value: "onHandQty", label: "On-hand stock" },
    { value: "createdAt", label: "Date added" },
  ];

  function handleFilterChange(key: string, value: string | string[]) {
    const v = Array.isArray(value) ? value[0] ?? "" : value;
    if (key === "category") {
      setCategoryFilter(v === "all" ? "" : v);
    } else if (key === "status") {
      setStatusFilter(v === "all" ? "" : v);
    } else if (key === "lowStock") {
      setLowStockOnly(v === "true");
    }
  }

  function handleSortChange(nextSortBy: string, nextSortOrder: "ASC" | "DESC") {
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
  }

  const toolbarActions = (
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-44 space-y-1">
        <Label className="text-xs text-muted-foreground">Program</Label>
        <Select
          value={programFilter === "" ? "all" : String(programFilter)}
          onValueChange={(value) => {
            setProgramFilter(value === "all" ? "" : Number(value));
            setLevelFilter("");
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="All programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All programs</SelectItem>
            {programs.map((program) => (
              <SelectItem key={program.id} value={String(program.id)}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-44 space-y-1">
        <Label className="text-xs text-muted-foreground">Level</Label>
        <Select
          value={levelFilter === "" ? "all" : String(levelFilter)}
          onValueChange={(value) => {
            setLevelFilter(value === "all" ? "" : Number(value));
          }}
          disabled={programFilter === ""}
        >
          <SelectTrigger className="h-9">
            <SelectValue
              placeholder={
                programFilter === "" ? "Select program first" : "All levels"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {levels.map((level) => (
              <SelectItem key={level.id} value={String(level.id)}>
                {levelFilterLabel(level, streamsForFilter)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        className="h-9"
        onClick={() => {
          resetAddForm();
          setIsAddOpen(true);
        }}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add item
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Inventory catalog</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage the item master, stock foundation, reorder thresholds, and
            level templates. Stock typically moves through PO receipts and
            order allocation; use{" "}
            <span className="inline-flex items-center gap-1 font-medium">
              <Boxes className="h-3.5 w-3.5" /> Adjust
            </span>{" "}
            on a row to record manual corrections (recounts, damage, found
            stock). Positive adjustments automatically replenish backorders.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {levelIdNum ? (
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Level template assignments</CardTitle>
                <p className="text-sm text-muted-foreground">
                  The selected level currently has {assignedItems.length} assigned catalog item
                  {assignedItems.length !== 1 ? "s" : ""}.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2">
                  {assignedItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No items assigned to this level yet.
                    </p>
                  ) : (
                    assignedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.sku} · default qty {item.defaultQuantity ?? 1}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => void handleUnassign(item.id)}
                        >
                          <Unlink2 className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <InventoryCheckboxLinkPanel
                  key={levelIdNum}
                  linkedInventoryIds={new Set(assignedItems.map((item) => item.id))}
                  catalogItems={catalogQuery.data ?? []}
                  isCatalogLoading={catalogQuery.isLoading}
                  onSave={async (items) => {
                    const { assigned, failed } = await bulkAssignInventoryToLevel(levelIdNum, items);
                    await invalidateLevelItems(levelIdNum);
                    await assignedItemsQuery.refetch();
                    if (failed.length > 0) {
                      toast.error(`${assigned} assigned, ${failed.length} failed`);
                    } else {
                      toast.success(`${items.length} item${items.length !== 1 ? "s" : ""} assigned to level`);
                    }
                  }}
                />
              </CardContent>
            </Card>
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
            renderExpandedContent={(item) => (
              <ExpandedDetailSurface>
                <ExpandedDetailSection title="Identity">
                  <DetailFieldsGrid columns={4}>
                    <DetailField label="Name" value={item.name} />
                    <DetailField label="SKU" value={item.sku ?? "—"} />
                    <DetailField
                      label="Legacy item code"
                      value={item.legacyItemCode ?? "—"}
                    />
                    <DetailField
                      label="Legacy ISO code"
                      value={item.legacyIsoCode ?? "—"}
                    />
                    <DetailField
                      label="Unit of measurement"
                      value={item.unitOfMeasurement || "—"}
                    />
                    <DetailField
                      label="Inventory type"
                      value={item.inventoryType}
                    />
                    <DetailField
                      label="Lifecycle"
                      value={item.lifecycleStatus}
                    />
                    <DetailField
                      label="Active"
                      value={item.isActive ? "Yes" : "No"}
                    />
                    {item.description ? (
                      <DetailField
                        label="Description"
                        value={item.description}
                        span={4}
                      />
                    ) : null}
                  </DetailFieldsGrid>
                </ExpandedDetailSection>

                <Separator />

                <ExpandedDetailSection title="Stock balances">
                  <DetailFieldsGrid columns={4}>
                    <DetailField label="On hand" value={String(item.onHandQty)} />
                    <DetailField
                      label="Reserved"
                      value={String(item.reservedQty)}
                    />
                    <DetailField
                      label="Available"
                      value={String(item.availableQty)}
                    />
                    <DetailField
                      label="On order"
                      value={String(item.onOrderQty)}
                    />
                    <DetailField
                      label="Avg cost"
                      value={`₹${item.weightedAverageCost.toFixed(2)}`}
                    />
                  </DetailFieldsGrid>
                </ExpandedDetailSection>

                <Separator />

                <ExpandedDetailSection title="Reorder configuration">
                  <DetailFieldsGrid columns={3}>
                    <DetailField
                      label="Reorder point"
                      value={String(item.reorderPoint)}
                    />
                    <DetailField
                      label="Safety stock"
                      value={String(item.safetyStock)}
                    />
                    <DetailField
                      label="Cycle"
                      value={`${item.reorderCycleDays} days`}
                    />
                  </DetailFieldsGrid>
                </ExpandedDetailSection>
              </ExpandedDetailSurface>
            )}
            searchPlaceholder="Name, SKU, legacy code..."
            onSearchChange={setSearchTerm}
            filters={tableFilters}
            onFilterChange={handleFilterChange}
            sortOptions={tableSortOptions}
            defaultSortBy={sortBy}
            defaultSortOrder={sortOrder}
            onSortChange={handleSortChange}
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

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add inventory item</DialogTitle>
          </DialogHeader>
          <InventoryForm form={formData} setForm={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleAdd()}>Create item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit inventory item</DialogTitle>
          </DialogHeader>
          <InventoryForm form={editForm} setForm={setEditForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleEdit()}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete inventory item?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes &quot;{deletingItem?.name}&quot; from the catalog and drops its
              level-template assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isAdjustOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeAdjust();
          } else {
            setIsAdjustOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
          </DialogHeader>
          {adjustingItem ? (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="font-medium">{adjustingItem.name}</div>
                <div className="text-xs text-muted-foreground">
                  {adjustingItem.sku}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">On hand</div>
                    <div className="text-base font-medium text-foreground">
                      {adjustingItem.onHandQty}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Reserved</div>
                    <div className="text-base font-medium text-foreground">
                      {adjustingItem.reservedQty}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Available</div>
                    <div className="text-base font-medium text-foreground">
                      {adjustingItem.availableQty}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Action</Label>
                <Select
                  value={adjustForm.direction}
                  onValueChange={(value) =>
                    setAdjustForm((prev) => ({
                      ...prev,
                      direction: value as AdjustmentDirection,
                      // Clear cost when switching to decrease (cost only
                      // applies to increases)
                      unitCost: value === "INCREASE" ? prev.unitCost : "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCREASE">
                      Increase (add stock)
                    </SelectItem>
                    <SelectItem value="DECREASE">
                      Decrease (remove stock)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="e.g. 5"
                  value={adjustForm.quantity}
                  onChange={(event) =>
                    setAdjustForm((prev) => ({
                      ...prev,
                      quantity: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Projected on-hand after this adjustment:{" "}
                  <span
                    className={
                      adjustPreview.projected < 0
                        ? "font-medium text-destructive"
                        : "font-medium text-foreground"
                    }
                  >
                    {adjustPreview.projected}
                  </span>
                </p>
                {adjustPreview.error ? (
                  <p className="text-xs text-destructive">
                    {adjustPreview.error}
                  </p>
                ) : null}
              </div>

              {adjustForm.direction === "INCREASE" ? (
                <div className="space-y-2">
                  <Label>Unit cost (optional)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder={`Leaves WAC at ₹${adjustingItem.weightedAverageCost.toFixed(2)} when blank`}
                    value={adjustForm.unitCost}
                    onChange={(event) =>
                      setAdjustForm((prev) => ({
                        ...prev,
                        unitCost: event.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Supply a cost to blend into the weighted average; leave
                    blank to add quantity without changing WAC.
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  rows={3}
                  placeholder="e.g. Physical recount, damaged in storage, returned by franchisee..."
                  value={adjustForm.reason}
                  onChange={(event) =>
                    setAdjustForm((prev) => ({
                      ...prev,
                      reason: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Stored on the audit trail. Required. Up to 500 characters.
                </p>
              </div>

              {adjustForm.direction === "INCREASE" ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
                  Positive adjustments automatically replenish any
                  backordered orders for this item, oldest first.
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeAdjust}
              disabled={isAdjustSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleAdjust()}
              disabled={
                isAdjustSubmitting ||
                Boolean(adjustPreview.error) ||
                !adjustForm.quantity.trim() ||
                !adjustForm.reason.trim()
              }
            >
              {isAdjustSubmitting ? "Saving..." : "Apply adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InventoryForm({
  form,
  setForm,
}: {
  form: InventoryFormState;
  setForm: React.Dispatch<React.SetStateAction<InventoryFormState>>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label>Name</Label>
        <Input
          value={form.name}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, name: event.target.value }))
          }
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Description</Label>
        <Textarea
          rows={2}
          value={form.description}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, description: event.target.value }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select
          value={form.categoryName || undefined}
          onValueChange={(value) =>
            setForm((prev) => ({ ...prev, categoryName: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {INVENTORY_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Unit of measurement</Label>
        <Input
          value={form.unitOfMeasurement}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              unitOfMeasurement: event.target.value,
            }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Legacy item code</Label>
        <Input
          value={form.legacyItemCode}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, legacyItemCode: event.target.value }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Legacy ISO code</Label>
        <Input
          value={form.legacyIsoCode}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, legacyIsoCode: event.target.value }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Inventory type</Label>
        <Select
          value={form.inventoryType}
          onValueChange={(value) =>
            setForm((prev) => ({
              ...prev,
              inventoryType: value as InventoryType,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INVENTORY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Lifecycle status</Label>
        <Select
          value={form.lifecycleStatus}
          onValueChange={(value) =>
            setForm((prev) => ({
              ...prev,
              lifecycleStatus: value as InventoryLifecycleStatus,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIFECYCLE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Reorder point</Label>
        <Input
          type="number"
          min={0}
          value={form.reorderPoint}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              reorderPoint: Number(event.target.value) || 0,
            }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Safety stock</Label>
        <Input
          type="number"
          min={0}
          value={form.safetyStock}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              safetyStock: Number(event.target.value) || 0,
            }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Reorder cycle days</Label>
        <Input
          type="number"
          min={1}
          value={form.reorderCycleDays}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              reorderCycleDays: Number(event.target.value) || 30,
            }))
          }
        />
      </div>
      <ToggleField
        label="Item status"
        value={form.isActive ? "active" : "inactive"}
        onValueChange={(v) =>
          setForm((prev) => ({ ...prev, isActive: v === "active" }))
        }
        options={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
      />
    </div>
  );
}
