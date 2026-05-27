"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  invalidateProcurementQueries,
  usePurchaseOrders,
  usePurchaseReceipts,
  useReplenishmentDrafts,
  useSupplierTerms,
  useSuppliers,
} from "@/hooks/api/procurement.hooks";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { getAllInventory } from "@/services/inventory.service";
import {
  bulkUpsertSupplierItemTerms,
  createPurchaseOrder,
  createSupplier,
  getPurchaseOrderById,
  postPurchaseReceipt,
  type CreatePurchaseOrderDto,
  type PostPurchaseReceiptDto,
  type PurchaseOrderLineInput,
  type SupplierItemTerm,
} from "@/services/procurement.service";
import type { BulkSourcingLineSubmit } from "@/components/procurement/ProcurementBulkLinePicker";
import {
  buildExpectedDeliveryDate,
  createPurchaseOrderForm,
  filterOptionsFromSuppliers,
  INITIAL_SUPPLIER_FORM,
  ITEMS_PER_PAGE,
  ALL_SUPPLIERS_LIMIT,
  PURCHASE_ORDER_STATUS_OPTIONS,
  suggestPurchaseOrderQuantity,
  toOptionalNumberFilter,
  toOptionalPreferredFilter,
  toOptionalSearch,
  type ProcurementSubTab,
  type PurchaseOrderFormState,
  type ReceiptPoLineSnapshot,
  type ReceiptRow,
  type SupplierFormState,
} from "@/app/admin/operations/components/procurement/procurement-utils";
import { SuppliersSourcingTab } from "@/app/admin/operations/components/procurement/SuppliersSourcingTab";
import { PurchaseOrdersTab } from "@/app/admin/operations/components/procurement/PurchaseOrdersTab";
import { ReceiptsTab } from "@/app/admin/operations/components/procurement/ReceiptsTab";
import { ReplenishmentTab } from "@/app/admin/operations/components/procurement/ReplenishmentTab";

export function ProcurementSection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inventoryFilterParam = searchParams.get("inventoryItemId");
  const parsedInventoryFilterId = inventoryFilterParam
    ? Number(inventoryFilterParam)
    : undefined;
  const inventoryFilterId = Number.isFinite(parsedInventoryFilterId)
    ? parsedInventoryFilterId
    : undefined;
  const procurementAction = searchParams.get("procurementAction");
  const sourcingShortcutHandled = useRef(false);

  const inventoryQuery = useQuery({
    queryKey: ["inventory", "all", "procurement"],
    queryFn: getAllInventory,
  });

  const [activeTab, setActiveTab] = useState<ProcurementSubTab>(
    "suppliers-sourcing",
  );

  const [supplierForm, setSupplierForm] = useState<SupplierFormState>(
    INITIAL_SUPPLIER_FORM,
  );
  const [poForm, setPoForm] = useState<PurchaseOrderFormState>(() =>
    createPurchaseOrderForm(),
  );
  const [sourcingSupplierId, setSourcingSupplierId] = useState<number | "">("");
  const [sourcingItemSeed, setSourcingItemSeed] = useState<number[]>([]);
  const [poLineSeed, setPoLineSeed] = useState<PurchaseOrderLineInput[] | undefined>();

  const [isSupplierOpen, setIsSupplierOpen] = useState(false);
  const [isSourcingOpen, setIsSourcingOpen] = useState(false);
  const [isPurchaseOrderOpen, setIsPurchaseOrderOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptOrderId, setReceiptOrderId] = useState<number | null>(null);
  const [receiptPoSnapshot, setReceiptPoSnapshot] = useState<
    ReceiptPoLineSnapshot[] | null
  >(null);
  const [receiptBody, setReceiptBody] = useState<PostPurchaseReceiptDto>({
    lines: [],
  });
  const [submitting, setSubmitting] = useState(false);

  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierStatusFilter, setSupplierStatusFilter] = useState("all");

  const [sourcingSearch, setSourcingSearch] = useState("");
  const [sourcingSupplierFilter, setSourcingSupplierFilter] = useState("all");
  const [sourcingPreferredFilter, setSourcingPreferredFilter] = useState("all");

  const [purchaseOrderSearch, setPurchaseOrderSearch] = useState("");
  const [purchaseOrderStatusFilter, setPurchaseOrderStatusFilter] =
    useState("all");
  const [purchaseOrderSupplierFilter, setPurchaseOrderSupplierFilter] =
    useState("all");
  const [purchaseOrderDateFrom, setPurchaseOrderDateFrom] = useState("");
  const [purchaseOrderDateTo, setPurchaseOrderDateTo] = useState("");

  const [receiptSearch, setReceiptSearch] = useState("");
  const [receiptSupplierFilter, setReceiptSupplierFilter] = useState("all");

  const [replenishmentSearch, setReplenishmentSearch] = useState("");
  const [replenishmentSupplierFilter, setReplenishmentSupplierFilter] =
    useState("all");
  const [replenishmentStatusFilter, setReplenishmentStatusFilter] =
    useState("all");

  const [supplierPage, setSupplierPage] = useState(1);
  const [termPage, setTermPage] = useState(1);
  const [purchaseOrderPage, setPurchaseOrderPage] = useState(1);
  const [receiptPage, setReceiptPage] = useState(1);
  const [replenishmentPage, setReplenishmentPage] = useState(1);

  const allSuppliersParams = useMemo(
    () => ({ page: 1, limit: ALL_SUPPLIERS_LIMIT }),
    [],
  );
  const allSupplierTermsParams = useMemo(
    () => ({ page: 1, limit: ALL_SUPPLIERS_LIMIT }),
    [],
  );
  const supplierParams = useMemo(
    () => ({
      page: supplierPage,
      limit: ITEMS_PER_PAGE,
      search: toOptionalSearch(supplierSearch),
      status: supplierStatusFilter === "all" ? undefined : supplierStatusFilter,
    }),
    [supplierPage, supplierSearch, supplierStatusFilter],
  );
  const supplierTermParams = useMemo(
    () => ({
      page: termPage,
      limit: ITEMS_PER_PAGE,
      search: toOptionalSearch(sourcingSearch),
      supplierId: toOptionalNumberFilter(sourcingSupplierFilter),
      inventoryItemId: inventoryFilterId,
      preferred: toOptionalPreferredFilter(sourcingPreferredFilter),
    }),
    [
      inventoryFilterId,
      sourcingPreferredFilter,
      sourcingSearch,
      sourcingSupplierFilter,
      termPage,
    ],
  );
  const purchaseOrderParams = useMemo(
    () => ({
      page: purchaseOrderPage,
      limit: ITEMS_PER_PAGE,
      search: toOptionalSearch(purchaseOrderSearch),
      status:
        purchaseOrderStatusFilter === "all"
          ? undefined
          : purchaseOrderStatusFilter,
      supplierId: toOptionalNumberFilter(purchaseOrderSupplierFilter),
      fromDate: purchaseOrderDateFrom || undefined,
      toDate: purchaseOrderDateTo || undefined,
    }),
    [
      purchaseOrderDateFrom,
      purchaseOrderDateTo,
      purchaseOrderPage,
      purchaseOrderSearch,
      purchaseOrderStatusFilter,
      purchaseOrderSupplierFilter,
    ],
  );
  const receiptParams = useMemo(
    () => ({
      page: receiptPage,
      limit: ITEMS_PER_PAGE,
      search: toOptionalSearch(receiptSearch),
      supplierId: toOptionalNumberFilter(receiptSupplierFilter),
    }),
    [receiptPage, receiptSearch, receiptSupplierFilter],
  );
  const replenishmentParams = useMemo(
    () => ({
      page: replenishmentPage,
      limit: ITEMS_PER_PAGE,
      search: toOptionalSearch(replenishmentSearch),
      status:
        replenishmentStatusFilter === "all"
          ? undefined
          : replenishmentStatusFilter,
      supplierId: toOptionalNumberFilter(replenishmentSupplierFilter),
    }),
    [
      replenishmentPage,
      replenishmentSearch,
      replenishmentStatusFilter,
      replenishmentSupplierFilter,
    ],
  );

  const suppliersQuery = useSuppliers(supplierParams);
  const allSuppliersQuery = useSuppliers(allSuppliersParams);
  const allSupplierTermsQuery = useSupplierTerms(allSupplierTermsParams);
  const termsQuery = useSupplierTerms(supplierTermParams);
  const purchaseOrdersQuery = usePurchaseOrders(purchaseOrderParams);
  const receiptsQuery = usePurchaseReceipts(receiptParams);
  const draftsQuery = useReplenishmentDrafts(replenishmentParams);

  const suppliers = suppliersQuery.data;
  const allSuppliers = allSuppliersQuery.data;
  const allSupplierTerms = allSupplierTermsQuery.data;
  const supplierTerms = termsQuery.data;
  const purchaseOrders = purchaseOrdersQuery.data;
  const receipts = receiptsQuery.data;
  const replenishmentDrafts = draftsQuery.data;
  const inventoryItems = useMemo(
    () => inventoryQuery.data ?? [],
    [inventoryQuery.data],
  );

  const inventoryPrefillItem = useMemo(
    () =>
      inventoryFilterId
        ? inventoryItems.find((item) => item.id === inventoryFilterId)
        : undefined,
    [inventoryFilterId, inventoryItems],
  );

  const supplierOptions = useMemo(
    () => filterOptionsFromSuppliers(allSuppliers),
    [allSuppliers],
  );
  const activeSupplierIds = useMemo(
    () =>
      new Set(
        allSuppliers.filter((supplier) => supplier.isActive).map((supplier) => supplier.id),
      ),
    [allSuppliers],
  );
  const linkedItemIdsForSourcingSupplier = useMemo(() => {
    if (sourcingSupplierId === "") return new Set<number>();
    return new Set(
      allSupplierTerms
        .filter((t) => t.supplierId === sourcingSupplierId)
        .map((t) => t.inventoryItemId),
    );
  }, [allSupplierTerms, sourcingSupplierId]);

  const purchaseOrderSuppliersSorted = useMemo(
    () =>
      allSuppliers
        .slice()
        .sort((left, right) => {
          if (left.isActive !== right.isActive) {
            return Number(right.isActive) - Number(left.isActive);
          }
          return left.name.localeCompare(right.name);
        }),
    [allSuppliers],
  );

  const supplierTermsForPo = useMemo(() => {
    if (poForm.supplierId === "") return [] as SupplierItemTerm[];
    return allSupplierTerms.filter((t) => t.supplierId === poForm.supplierId);
  }, [allSupplierTerms, poForm.supplierId]);

  const receiptRows = useMemo<ReceiptRow[]>(
    () =>
      receipts.map((receipt) => {
        const preview = receipt.lines
          .map(
            (line) => line.inventoryItem?.name ?? `Item #${line.inventoryItemId}`,
          )
          .slice(0, 3)
          .join(", ");

        return {
          id: String(receipt.id),
          receiptId: receipt.id,
          purchaseOrderId: receipt.purchaseOrderId,
          supplierId: receipt.supplierId,
          supplierName: receipt.supplier?.name ?? "Unknown supplier",
          createdAt: receipt.createdAt,
          lineCount: receipt.lines.length,
          totalReceived: receipt.lines.reduce(
            (total, line) => total + line.receivedQty,
            0,
          ),
          totalRejected: receipt.lines.reduce(
            (total, line) => total + line.rejectedQty,
            0,
          ),
          linePreview: preview,
        };
      }),
    [receipts],
  );

  useEffect(() => {
    setTermPage(1);
    if (!inventoryFilterId) {
      return;
    }
    setSourcingItemSeed([inventoryFilterId]);
  }, [inventoryFilterId]);

  useEffect(() => {
    if (procurementAction !== "add-sourcing" || sourcingShortcutHandled.current) {
      return;
    }

    sourcingShortcutHandled.current = true;
    setActiveTab("suppliers-sourcing");
    setSourcingSupplierId("");
    setSourcingItemSeed(inventoryFilterId ? [inventoryFilterId] : []);
    setIsSourcingOpen(true);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("procurementAction");
    const queryString = nextParams.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  }, [
    inventoryFilterId,
    pathname,
    procurementAction,
    router,
    searchParams,
  ]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handlePurchaseOrderSupplierSelect(value: string) {
    setPoLineSeed(undefined);
    if (value === "none") {
      setPoForm((prev) => ({ ...prev, supplierId: "" }));
      return;
    }
    setPoForm((prev) => ({ ...prev, supplierId: Number(value) }));
  }

  function openSupplierModal() {
    setSupplierForm(INITIAL_SUPPLIER_FORM);
    setIsSupplierOpen(true);
  }

  function openSourcingModal(prefilledInventoryItemId?: number) {
    setSourcingSupplierId("");
    setSourcingItemSeed(
      prefilledInventoryItemId != null
        ? [prefilledInventoryItemId]
        : inventoryFilterId
          ? [inventoryFilterId]
          : [],
    );
    setActiveTab("suppliers-sourcing");
    setIsSourcingOpen(true);
  }

  function openPurchaseOrderModal(prefilledInventoryItemId?: number) {
    setPoForm(createPurchaseOrderForm());
    if (prefilledInventoryItemId == null) {
      setPoLineSeed(undefined);
      setActiveTab("purchase-orders");
      setIsPurchaseOrderOpen(true);
      return;
    }
    const preferredTerm =
      allSupplierTerms.find(
        (term) =>
          term.inventoryItemId === prefilledInventoryItemId &&
          activeSupplierIds.has(term.supplierId) &&
          term.isPreferred,
      ) ??
      allSupplierTerms.find(
        (term) =>
          term.inventoryItemId === prefilledInventoryItemId &&
          activeSupplierIds.has(term.supplierId),
      ) ??
      allSupplierTerms.find(
        (term) => term.inventoryItemId === prefilledInventoryItemId,
      ) ??
      null;

    if (preferredTerm) {
      setPoForm({
        supplierId: preferredTerm.supplierId,
        referenceNo: "",
        expectedDeliveryAt: buildExpectedDeliveryDate(preferredTerm.leadTimeDays),
        notes: "",
      });
      setPoLineSeed([
        {
          inventoryItemId: prefilledInventoryItemId,
          orderedQty: suggestPurchaseOrderQuantity(1, preferredTerm),
          unitCost: preferredTerm.currentUnitCost,
        },
      ]);
    } else {
      setPoLineSeed([
        {
          inventoryItemId: prefilledInventoryItemId,
          orderedQty: 1,
          unitCost: 0,
        },
      ]);
    }
    setActiveTab("purchase-orders");
    setIsPurchaseOrderOpen(true);
  }

  async function handleBulkSourcingSubmit(lines: BulkSourcingLineSubmit[]) {
    if (sourcingSupplierId === "") {
      toast.error("Choose a supplier first.");
      return;
    }
    try {
      setSubmitting(true);
      await bulkUpsertSupplierItemTerms({
        supplierId: Number(sourcingSupplierId),
        lines,
      });
      toast.success("Sourcing saved");
      setIsSourcingOpen(false);
      setSourcingSupplierId("");
      setSourcingItemSeed([]);
      setTermPage(1);
      await invalidateProcurementQueries();
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePurchaseOrderPickerSubmit(lines: PurchaseOrderLineInput[]) {
    if (poForm.supplierId === "") {
      toast.error("Choose a supplier first.");
      return;
    }
    const payload: CreatePurchaseOrderDto = {
      supplierId: Number(poForm.supplierId),
      referenceNo: poForm.referenceNo || undefined,
      expectedDeliveryAt: poForm.expectedDeliveryAt || undefined,
      notes: poForm.notes || undefined,
      lines,
    };
    try {
      setSubmitting(true);
      await createPurchaseOrder(payload);
      toast.success("Purchase order created");
      setIsPurchaseOrderOpen(false);
      setPoForm(createPurchaseOrderForm());
      setPoLineSeed(undefined);
      setPurchaseOrderPage(1);
      await invalidateProcurementQueries();
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateSupplier() {
    if (!supplierForm.name.trim()) {
      toast.error("Supplier name is required.");
      return;
    }

    try {
      setSubmitting(true);
      await createSupplier({
        name: supplierForm.name.trim(),
        contactPerson: supplierForm.contactPerson || undefined,
        email: supplierForm.email || undefined,
        phone: supplierForm.phone || undefined,
        city: supplierForm.city || undefined,
        gstin: supplierForm.gstin || undefined,
        isActive: supplierForm.isActive,
      });
      toast.success("Supplier created");
      setIsSupplierOpen(false);
      setSupplierForm(INITIAL_SUPPLIER_FORM);
      setSupplierPage(1);
      await invalidateProcurementQueries();
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function openReceiptDialog(orderId: number) {
    try {
      const order = await getPurchaseOrderById(orderId);
      setReceiptOrderId(orderId);
      setReceiptPoSnapshot(
        order.lines.map((line) => ({
          inventoryItemId: line.inventoryItemId,
          orderedQty: line.orderedQty,
          priorReceivedQty: line.receivedQty,
          unitCost: Number(line.unitCost ?? 0),
        })),
      );
      setReceiptBody({
        lines: order.lines.map((line) => ({
          inventoryItemId: line.inventoryItemId,
          receivedQty: Math.max(0, line.orderedQty - line.receivedQty),
          rejectedQty: 0,
          unitCost: Number(line.unitCost ?? 0),
        })),
      });
      setIsReceiptOpen(true);
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    }
  }

  function handleReceiptDialogOpenChange(open: boolean) {
    setIsReceiptOpen(open);
    if (!open) {
      setReceiptOrderId(null);
      setReceiptPoSnapshot(null);
      setReceiptBody({ lines: [] });
    }
  }

  async function handlePostReceipt() {
    if (!receiptOrderId) return;

    try {
      setSubmitting(true);
      const payload: PostPurchaseReceiptDto = {
        lines: receiptBody.lines.map((line, index) => ({
          ...line,
          unitCost:
            receiptPoSnapshot?.[index]?.unitCost ?? Number(line.unitCost ?? 0),
        })),
      };
      await postPurchaseReceipt(receiptOrderId, payload);
      toast.success("Receipt posted");
      setIsReceiptOpen(false);
      setReceiptOrderId(null);
      setReceiptPoSnapshot(null);
      setReceiptBody({ lines: [] });
      setPurchaseOrderPage(1);
      setReceiptPage(1);
      await invalidateProcurementQueries();
    } catch (error) {
      toast.error(getUserFriendlyMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function updateReceiptLine(
    index: number,
    key: "receivedQty" | "rejectedQty",
    value: number,
  ) {
    setReceiptBody((prev) => ({
      lines: prev.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [key]: value } : line,
      ),
    }));
  }

  // ---------------------------------------------------------------------------
  // Columns / filter definitions
  // ---------------------------------------------------------------------------

  const supplierFilters = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All statuses" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
      defaultValue: "all",
    },
  ];

  const sourcingFilters = [
    {
      key: "supplier",
      label: "Supplier",
      options: supplierOptions,
      defaultValue: "all",
    },
    {
      key: "preferred",
      label: "Preferred",
      options: [
        { value: "all", label: "All terms" },
        { value: "preferred", label: "Preferred only" },
        { value: "not-preferred", label: "Not preferred" },
      ],
      defaultValue: "all",
    },
  ];

  const purchaseOrderFilters = [
    {
      key: "status",
      label: "Status",
      options: PURCHASE_ORDER_STATUS_OPTIONS,
      defaultValue: "all",
    },
    {
      key: "supplier",
      label: "Supplier",
      options: supplierOptions,
      defaultValue: "all",
    },
  ];

  const receiptFilters = [
    {
      key: "supplier",
      label: "Supplier",
      options: supplierOptions,
      defaultValue: "all",
    },
  ];

  const replenishmentFilters = [
    {
      key: "status",
      label: "Status",
      options: PURCHASE_ORDER_STATUS_OPTIONS,
      defaultValue: "all",
    },
    {
      key: "supplier",
      label: "Supplier",
      options: supplierOptions,
      defaultValue: "all",
    },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ProcurementSubTab)}
        className="space-y-6"
      >
        <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="suppliers-sourcing"
            className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Suppliers &amp; sourcing
          </TabsTrigger>
          <TabsTrigger
            value="purchase-orders"
            className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Purchase orders
          </TabsTrigger>
          <TabsTrigger
            value="receipts"
            className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Receipts
          </TabsTrigger>
          <TabsTrigger
            value="replenishment"
            className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Replenishment
          </TabsTrigger>
        </TabsList>

        <SuppliersSourcingTab
          suppliers={suppliers}
          suppliersIsFetching={suppliersQuery.isFetching}
          suppliersTotal={suppliersQuery.total}
          suppliersTotal_pages={suppliersQuery.totalPages}
          supplierTerms={supplierTerms}
          termsIsFetching={termsQuery.isFetching}
          termsTotal={termsQuery.total}
          termsTotalPages={termsQuery.totalPages}
          allSuppliers={allSuppliers}
          allSupplierTerms={allSupplierTerms}
          inventoryItems={inventoryItems}
          inventoryIsLoading={inventoryQuery.isLoading}
          inventoryPrefillItem={inventoryPrefillItem}
          supplierPage={supplierPage}
          termPage={termPage}
          supplierFilters={supplierFilters}
          sourcingFilters={sourcingFilters}
          onSupplierSearchChange={(value) => {
            setSupplierPage(1);
            setSupplierSearch(value);
          }}
          onSupplierFilterChange={(key, value) => {
            if (key === "status") {
              setSupplierPage(1);
              setSupplierStatusFilter(String(value));
            }
          }}
          onSupplierPageChange={setSupplierPage}
          onSourcingSearchChange={(value) => {
            setTermPage(1);
            setSourcingSearch(value);
          }}
          onSourcingFilterChange={(key, value) => {
            if (key === "supplier") {
              setTermPage(1);
              setSourcingSupplierFilter(String(value));
            }
            if (key === "preferred") {
              setTermPage(1);
              setSourcingPreferredFilter(String(value));
            }
          }}
          onTermPageChange={setTermPage}
          onOpenSourcingModal={openSourcingModal}
          onOpenSupplierModal={openSupplierModal}
          isSupplierOpen={isSupplierOpen}
          onSupplierOpenChange={setIsSupplierOpen}
          supplierForm={supplierForm}
          onSupplierFormChange={(patch) =>
            setSupplierForm((prev) => ({ ...prev, ...patch }))
          }
          onCreateSupplier={() => void handleCreateSupplier()}
          submitting={submitting}
          isSourcingOpen={isSourcingOpen}
          onSourcingOpenChange={setIsSourcingOpen}
          sourcingSupplierId={sourcingSupplierId}
          onSourcingSupplierIdChange={setSourcingSupplierId}
          sourcingItemSeed={sourcingItemSeed}
          onSourcingItemSeedChange={setSourcingItemSeed}
          linkedItemIdsForSourcingSupplier={linkedItemIdsForSourcingSupplier}
          onBulkSourcingSubmit={handleBulkSourcingSubmit}
        />

        <PurchaseOrdersTab
          purchaseOrders={purchaseOrders}
          purchaseOrdersIsFetching={purchaseOrdersQuery.isFetching}
          purchaseOrdersTotal={purchaseOrdersQuery.total}
          purchaseOrdersTotalPages={purchaseOrdersQuery.totalPages}
          allSupplierTermsIsLoading={allSupplierTermsQuery.isLoading}
          supplierTermsForPo={supplierTermsForPo}
          purchaseOrderSuppliersSorted={purchaseOrderSuppliersSorted}
          inventoryItems={inventoryItems}
          inventoryIsLoading={inventoryQuery.isLoading}
          purchaseOrderPage={purchaseOrderPage}
          purchaseOrderDateFrom={purchaseOrderDateFrom}
          purchaseOrderDateTo={purchaseOrderDateTo}
          purchaseOrderFilters={purchaseOrderFilters}
          onPurchaseOrderSearchChange={(value) => {
            setPurchaseOrderPage(1);
            setPurchaseOrderSearch(value);
          }}
          onPurchaseOrderFilterChange={(key, value) => {
            if (key === "status") {
              setPurchaseOrderPage(1);
              setPurchaseOrderStatusFilter(String(value));
            }
            if (key === "supplier") {
              setPurchaseOrderPage(1);
              setPurchaseOrderSupplierFilter(String(value));
            }
          }}
          onPurchaseOrderPageChange={setPurchaseOrderPage}
          onDateFromChange={setPurchaseOrderDateFrom}
          onDateToChange={setPurchaseOrderDateTo}
          onOpenReceiptDialog={(orderId) => void openReceiptDialog(orderId)}
          onOpenPurchaseOrderModal={() => openPurchaseOrderModal()}
          isPurchaseOrderOpen={isPurchaseOrderOpen}
          onPurchaseOrderOpenChange={setIsPurchaseOrderOpen}
          poForm={poForm}
          onPoFormChange={(patch) => setPoForm((prev) => ({ ...prev, ...patch }))}
          onPurchaseOrderSupplierSelect={handlePurchaseOrderSupplierSelect}
          poLineSeed={poLineSeed}
          onPoLineSeedChange={setPoLineSeed}
          onPurchaseOrderPickerSubmit={handlePurchaseOrderPickerSubmit}
          submitting={submitting}
        />

        <ReceiptsTab
          receiptRows={receiptRows}
          receiptsIsFetching={receiptsQuery.isFetching}
          receiptsTotal={receiptsQuery.total}
          receiptsTotalPages={receiptsQuery.totalPages}
          inventoryItems={inventoryItems}
          receiptPage={receiptPage}
          receiptFilters={receiptFilters}
          onReceiptSearchChange={(value) => {
            setReceiptPage(1);
            setReceiptSearch(value);
          }}
          onReceiptFilterChange={(key, value) => {
            if (key === "supplier") {
              setReceiptPage(1);
              setReceiptSupplierFilter(String(value));
            }
          }}
          onReceiptPageChange={setReceiptPage}
          isReceiptOpen={isReceiptOpen}
          onReceiptOpenChange={handleReceiptDialogOpenChange}
          receiptOrderId={receiptOrderId}
          receiptPoSnapshot={receiptPoSnapshot}
          receiptBody={receiptBody}
          onUpdateReceiptLine={updateReceiptLine}
          onPostReceipt={() => void handlePostReceipt()}
          submitting={submitting}
        />

        <ReplenishmentTab
          replenishmentDrafts={replenishmentDrafts}
          draftsIsFetching={draftsQuery.isFetching}
          draftsTotal={draftsQuery.total}
          draftsTotalPages={draftsQuery.totalPages}
          replenishmentPage={replenishmentPage}
          replenishmentFilters={replenishmentFilters}
          onReplenishmentSearchChange={(value) => {
            setReplenishmentPage(1);
            setReplenishmentSearch(value);
          }}
          onReplenishmentFilterChange={(key, value) => {
            if (key === "status") {
              setReplenishmentPage(1);
              setReplenishmentStatusFilter(String(value));
            }
            if (key === "supplier") {
              setReplenishmentPage(1);
              setReplenishmentSupplierFilter(String(value));
            }
          }}
          onReplenishmentPageChange={setReplenishmentPage}
        />
      </Tabs>
    </div>
  );
}
