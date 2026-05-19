"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightLeft,
  Edit2,
  Plus,
  Trash2,
  Unlink2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { DataTable, type DataTableColumn } from "@/components/shared";
import { getAllPrograms, type Program } from "@/services/program.service";
import type { Level } from "@/services/level.service";
import type { Stream } from "@/services/stream.service";
import {
  bulkAssignInventoryToLevel,
  createInventory,
  deleteInventory,
  getAllInventory,
  getInventoryItemsForLevel,
  resolveInventoryCategoryId,
  unassignInventoryFromLevel,
  updateInventory,
  type CreateInventoryDto,
  type InventoryItemSummary,
  type InventoryLifecycleStatus,
  type InventoryType,
  type UpdateInventoryDto,
} from "@/services/inventory.service";
import {
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

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [formData, setFormData] = useState<InventoryFormState>(EMPTY_FORM);
  const [editingItem, setEditingItem] = useState<InventoryItemSummary | null>(null);
  const [editForm, setEditForm] = useState<InventoryFormState>(EMPTY_FORM);
  const [deletingItem, setDeletingItem] = useState<InventoryItemSummary | null>(null);

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
    sortBy: "name",
    sortOrder: "ASC",
  });

  const inventory = inventoryQuery.rows;
  const total = inventoryQuery.total;
  const totalPages = inventoryQuery.totalPages;
  const loading = inventoryQuery.isPending;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, programFilter, levelFilter]);

  function resetAddForm() {
    setFormData(EMPTY_FORM);
  }

  function mapFormToPayload(data: InventoryFormState, categoryId: number): CreateInventoryDto {
    return {
      name: data.name.trim(),
      description: data.description.trim() || undefined,
      categoryId,
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
    if (!formData.name.trim() || !formData.categoryName.trim()) {
      toast.error("Item name and category are required.");
      return;
    }

    try {
      const categoryId = await resolveInventoryCategoryId(formData.categoryName);
      await createInventory(mapFormToPayload(formData, categoryId));
      toast.success("Inventory item created");
      setIsAddOpen(false);
      resetAddForm();
      await refreshInventoryViews();
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    }
  }

  async function handleEdit() {
    if (!editingItem || !editForm.categoryName.trim()) {
      toast.error("Category is required.");
      return;
    }

    try {
      const categoryId = await resolveInventoryCategoryId(editForm.categoryName);
      const payload = mapFormToPayload(editForm, categoryId) as UpdateInventoryDto;
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
      categoryName: item.category?.name ?? "",
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

  const columns: DataTableColumn<InventoryItemSummary>[] = [
    {
      key: "category",
      header: "Category",
      render: (item) => (
        <div>
          <div>{item.category?.name ?? "Uncategorized"}</div>
          <div className="text-xs text-muted-foreground">
            {item.unitOfMeasurement || "No unit"}
          </div>
        </div>
      ),
    },
    {
      key: "balances",
      header: "Balances",
      render: (item) => (
        <div>
          <div>On hand {item.onHandQty}</div>
          <div className="text-xs text-muted-foreground">
            Reserved {item.reservedQty} · Available {item.availableQty}
          </div>
          <div className="text-xs text-muted-foreground">
            On order {item.onOrderQty} · Avg cost ₹
            {item.weightedAverageCost.toFixed(2)}
          </div>
        </div>
      ),
    },
    {
      key: "reorder",
      header: "Reorder",
      render: (item) => (
        <div>
          <div>Reorder point {item.reorderPoint}</div>
          <div className="text-xs text-muted-foreground">
            Safety {item.safetyStock} · Cycle {item.reorderCycleDays}d
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <div>
          <Badge
            className={
              item.isActive
                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                : "bg-slate-100 text-slate-700 border-slate-200"
            }
          >
            {item.isActive ? "Active" : "Inactive"}
          </Badge>
          {item.availableQty <= item.reorderPoint ? (
            <div className="mt-2">
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                Low stock
              </Badge>
            </div>
          ) : null}
        </div>
      ),
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
            Manage the item master, stock foundation, reorder thresholds, and level templates. Stock updates come from receipts and level-template assignment, not from raw manual overwrites.
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
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {item.sku}
                  {item.legacyItemCode ? ` · ${item.legacyItemCode}` : ""}
                  {item.legacyIsoCode ? ` · ${item.legacyIsoCode}` : ""}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {item.inventoryType} · {item.lifecycleStatus}
                </div>
              </div>
            )}
            searchPlaceholder="Name, SKU, legacy code..."
            onSearchChange={setSearchTerm}
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
        <Input
          placeholder="Books, Uniforms, Stationery..."
          value={form.categoryName}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, categoryName: event.target.value }))
          }
        />
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
      <div className="flex items-center gap-3">
        <Switch
          checked={form.isActive}
          onCheckedChange={(checked) =>
            setForm((prev) => ({ ...prev, isActive: checked }))
          }
        />
        <Label>Active item</Label>
      </div>
    </div>
  );
}
