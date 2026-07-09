"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  bulkAssignFranchiseKitTemplateItems,
  getFranchiseKitTemplateItems,
  removeFranchiseKitTemplateItem,
  updateFranchiseKitTemplateItem,
  bulkAssignInventoryToProgramKit,
  getProgramKitItems,
  removeInventoryFromProgramKit,
  updateProgramKitItem,
  type FranchiseKitTemplateItem,
  type ProgramKitItemSummary,
  type Inventory,
} from "@/services/inventory.service";
import { InventoryCheckboxLinkPanel } from "@/components/inventory/InventoryCheckboxLinkPanel";
import { useKitCatalog } from "@/hooks/api/inventory.hooks";
import { queryKeys } from "@/hooks/api/query-keys";
import { formatRupees } from "@/lib/currency-utils";
import { RawTableSurface } from "@/components/shared";

function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0;
}

export interface KitManagementProps {
  /** Switches service pair + copy: franchise kit template vs program kit. */
  scope: "franchise" | "program";
  programId: number;
  programName: string;
  /** Used by the "program" scope today; kept optional. */
  onCountChange?: (count: number) => void;
}

/** Normalized row shape both scopes render through. */
interface KitRow {
  key: number;
  inventoryId: number;
  name: string;
  sku?: string | null;
  inactive: boolean;
  defaultQuantity: number | null | undefined;
  nameMeta?: string | null;
  detail: React.ReactNode;
}

const COPY = {
  franchise: {
    title: "Franchise kit items",
    intro: (programName: string) =>
      `Master kit every new ${programName} franchise is seeded with. Customize per franchise from the franchise agreement.`,
    empty: "No franchise kit items yet. Add items from inventory below.",
    detailHeader: "Catalog price",
    removed: "Removed from franchise kit",
    added: "added to franchise kit",
  },
  program: {
    title: "Program kit items",
    intro: (programName: string) =>
      `Add default kit inventory for ${programName}.`,
    empty: "No kit items assigned yet. Add items from inventory below.",
    detailHeader: "Details",
    removed: "Removed from kit",
    added: "added to kit",
  },
} as const;

/**
 * One kit-template manager (CMP-10) — the former FranchiseKitManagement /
 * ProgramKitManagement pair merged behind a `scope` switch. The raw <table>
 * converted to ui/table primitives inside RawTableSurface in the same merge
 * (SW-P8, reconciliation #6).
 */
export function KitManagement({
  scope,
  programId,
  programName,
  onCountChange,
}: KitManagementProps) {
  const queryClient = useQueryClient();
  const onCountChangeRef = useRef(onCountChange);
  const [draftQuantities, setDraftQuantities] = useState<
    Record<number, string>
  >({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const copy = COPY[scope];

  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  const queryKey =
    scope === "franchise"
      ? queryKeys.inventory.franchiseKitTemplate(programId)
      : queryKeys.inventory.programKitItems(programId);

  const kitQuery = useQuery<
    FranchiseKitTemplateItem[] | ProgramKitItemSummary[]
  >({
    queryKey,
    queryFn: async () =>
      scope === "franchise"
        ? await getFranchiseKitTemplateItems(programId)
        : await getProgramKitItems(programId),
  });

  const rows = useMemo<KitRow[]>(() => {
    const data = kitQuery.data ?? [];
    if (scope === "franchise") {
      return (data as FranchiseKitTemplateItem[]).map((item) => ({
        key: item.franchiseKitItemId,
        inventoryId: item.inventoryId,
        name: item.name,
        sku: item.sku,
        inactive: !item.isActive || !item.inventoryIsActive,
        defaultQuantity: item.defaultQuantity,
        nameMeta: item.category || "Uncategorized",
        detail: (
          <span className="text-xs text-muted-foreground">
            {formatRupees(item.unitPrice)}
          </span>
        ),
      }));
    }
    return (data as ProgramKitItemSummary[]).map((item) => ({
      key: item.programKitId,
      inventoryId: item.inventoryId,
      name: item.name,
      sku: item.sku,
      inactive: !item.isActive,
      defaultQuantity: item.defaultQuantity,
      nameMeta: item.description || null,
      detail: (
        <span className="text-xs text-muted-foreground">
          <span className="block">{item.category || "Uncategorized"}</span>
          <span className="mt-1 block">Available {item.availableQty}</span>
        </span>
      ),
    }));
  }, [kitQuery.data, scope]);

  const kitCatalogQuery = useKitCatalog();
  const catalog = useMemo(
    () => (kitCatalogQuery.data ?? []) as Inventory[],
    [kitCatalogQuery.data],
  );
  const linkedInventoryIds = useMemo(
    () => new Set(rows.map((row) => row.inventoryId)),
    [rows],
  );
  const isLoading = kitQuery.isLoading;

  useEffect(() => {
    setDraftQuantities(
      Object.fromEntries(
        rows.map((row) => [row.key, String(row.defaultQuantity ?? 1)]),
      ),
    );
    onCountChangeRef.current?.(rows.length);
  }, [rows]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey });
    await kitQuery.refetch();
  };

  const handleSaveQuantity = async (row: KitRow) => {
    const rawValue =
      draftQuantities[row.key] ?? String(row.defaultQuantity ?? 1);
    const quantity = Number(rawValue);

    if (!isPositiveInteger(quantity)) {
      toast.error("Default quantity must be a positive whole number");
      return;
    }
    if (quantity === Number(row.defaultQuantity ?? 1)) {
      return;
    }

    setPendingKey(`save-${row.key}`);
    try {
      if (scope === "franchise") {
        await updateFranchiseKitTemplateItem(row.key, {
          defaultQuantity: quantity,
        });
      } else {
        await updateProgramKitItem(programId, row.key, {
          defaultQuantity: quantity,
        });
      }
      await refresh();
      toast.success("Quantity updated");
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    } finally {
      setPendingKey(null);
    }
  };

  const handleRemove = async (row: KitRow) => {
    setPendingKey(`remove-${row.key}`);
    try {
      if (scope === "franchise") {
        await removeFranchiseKitTemplateItem(row.key);
      } else {
        await removeInventoryFromProgramKit(programId, row.key);
      }
      await refresh();
      toast.success(copy.removed);
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <div
      data-testid="kit-management"
      className="rounded-lg border bg-card p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-card-foreground">
            {copy.title}
          </h3>
          <Badge variant="secondary">{rows.length} items</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {copy.intro(programName)}
        </p>
      </div>

      <div className="mt-4 space-y-4">
        <RawTableSurface>
          <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2.5">
            <h4 className="text-sm font-medium text-card-foreground">
              Assigned items
            </h4>
            {!isLoading && rows.length > 0 ? (
              <span className="text-xs text-muted-foreground">
                Edit quantity inline
              </span>
            ) : null}
          </div>

          {isLoading ? (
            <div className="px-3 py-5 text-sm text-muted-foreground">
              Loading kit items...
            </div>
          ) : rows.length === 0 ? (
            <div className="px-3 py-5 text-sm text-muted-foreground">
              {copy.empty}
            </div>
          ) : (
            <Table className="table-fixed">
              <colgroup>
                <col className="w-[36%]" />
                <col className="w-[20%]" />
                <col className="w-[28%]" />
                <col className="w-[110px]" />
              </colgroup>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead>Item</TableHead>
                  <TableHead>{copy.detailHeader}</TableHead>
                  <TableHead>Default qty</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const rawDraft =
                    draftQuantities[row.key] ??
                    String(row.defaultQuantity ?? 1);
                  const parsedDraft = Number(rawDraft);
                  const quantityChanged =
                    rawDraft !== "" &&
                    parsedDraft !== Number(row.defaultQuantity ?? 1);
                  const quantityValid = isPositiveInteger(parsedDraft);
                  const saveDisabled =
                    pendingKey !== null || !quantityChanged || !quantityValid;

                  return (
                    <TableRow key={row.key} className="align-top">
                      <TableCell className="px-3 py-3 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium text-card-foreground">
                            {row.name}
                          </p>
                          {row.sku ? (
                            <Badge variant="outline" className="text-[10px]">
                              {row.sku}
                            </Badge>
                          ) : null}
                          {row.inactive ? (
                            <Badge
                              variant="outline"
                              className="border-warning/40 bg-warning-soft text-warning-soft-foreground"
                            >
                              Inactive
                            </Badge>
                          ) : null}
                        </div>
                        {row.nameMeta ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {row.nameMeta}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="px-3 py-3 align-top">
                        {row.detail}
                      </TableCell>
                      <TableCell className="px-3 py-3 align-top">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Input
                            id={`kit-qty-${scope}-${row.key}`}
                            type="number"
                            min="1"
                            inputMode="numeric"
                            value={rawDraft}
                            onChange={(event) =>
                              setDraftQuantities((prev) => ({
                                ...prev,
                                [row.key]: event.target.value,
                              }))
                            }
                            className="h-9 w-full sm:w-24"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={saveDisabled}
                            onClick={() => void handleSaveQuantity(row)}
                            className="sm:h-9"
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-right align-top">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={pendingKey !== null}
                          onClick={() => void handleRemove(row)}
                          className="h-8 w-8 rounded-md p-0 text-destructive hover:bg-destructive-soft hover:text-destructive"
                          title={`Remove ${row.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </RawTableSurface>

        <InventoryCheckboxLinkPanel
          key={programId}
          linkedInventoryIds={linkedInventoryIds}
          catalogItems={catalog}
          isCatalogLoading={kitCatalogQuery.isLoading}
          onSave={async (items) => {
            const { assigned, failed } =
              scope === "franchise"
                ? await bulkAssignFranchiseKitTemplateItems(programId, items)
                : await bulkAssignInventoryToProgramKit(programId, items);
            await refresh();
            if (failed.length > 0) {
              toast.error(`${assigned} added, ${failed.length} failed`);
            } else {
              toast.success(
                `${items.length} item${items.length !== 1 ? "s" : ""} ${copy.added}`,
              );
            }
          }}
        />
      </div>
    </div>
  );
}
