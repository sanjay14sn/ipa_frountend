"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AppDialog,
  AppDialogBody,
  AppDialogFooter,
  AppDialogHeader,
  DialogFormField,
  DialogFormGrid,
  FormDialog,
} from "@/components/shared/dialog";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleField } from "@/components/shared/toggle-field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
import { ProcurementBulkLinePicker } from "@/components/procurement/ProcurementBulkLinePicker";
import type { BulkSourcingLineSubmit } from "@/components/procurement/ProcurementBulkLinePicker";
import {
  bulkUpsertSupplierItemTerms,
  createPurchaseOrder,
  createSupplier,
  getPurchaseOrderById,
  postPurchaseReceipt,
  type CreatePurchaseOrderDto,
  type PostPurchaseReceiptDto,
  type PurchaseOrderLineInput,
  type PurchaseOrderSummary,
  type Supplier,
  type SupplierItemTerm,
} from "@/services/procurement.service";

type ProcurementSubTab =
  | "suppliers-sourcing"
  | "purchase-orders"
  | "receipts"
  | "replenishment";

type SupplierFormState = {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  gstin: string;
  isActive: boolean;
};

type PurchaseOrderFormState = {
  supplierId: number | "";
  referenceNo: string;
  expectedDeliveryAt: string;
  notes: string;
};

type ReceiptRow = {
  id: string;
  receiptId: number;
  purchaseOrderId: number;
  supplierId: number;
  supplierName: string;
  createdAt?: string | null;
  lineCount: number;
  totalReceived: number;
  totalRejected: number;
  linePreview: string;
};

type ReceiptPoLineSnapshot = {
  inventoryItemId: number;
  orderedQty: number;
  priorReceivedQty: number;
  unitCost: number;
};

const INITIAL_SUPPLIER_FORM: SupplierFormState = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  city: "",
  gstin: "",
  isActive: true,
};

const ITEMS_PER_PAGE = 10;
const ALL_SUPPLIERS_LIMIT = 10_000;

function createPurchaseOrderForm(): PurchaseOrderFormState {
  return {
    supplierId: "",
    referenceNo: "",
    expectedDeliveryAt: "",
    notes: "",
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(parsed);
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not posted";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatStatusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function statusBadge(status: string) {
  return <Badge variant="secondary">{formatStatusLabel(status)}</Badge>;
}

function booleanBadge(active: boolean, trueLabel: string, falseLabel: string) {
  return active ? (
    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
      {trueLabel}
    </Badge>
  ) : (
    <Badge variant="outline">{falseLabel}</Badge>
  );
}

function toOptionalSearch(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toOptionalNumberFilter(value: string) {
  return value === "all" ? undefined : Number(value);
}

function toOptionalPreferredFilter(value: string) {
  if (value === "preferred") return true;
  if (value === "not-preferred") return false;
  return undefined;
}

function suggestPurchaseOrderQuantity(
  requestedQty: number,
  term?: Pick<SupplierItemTerm, "moq" | "casePack"> | null,
) {
  let quantity = Math.max(1, Math.ceil(requestedQty || 1));
  if (!term) return quantity;

  if (term.moq > 0) {
    quantity = Math.max(quantity, term.moq);
  }

  if (term.casePack > 0) {
    quantity = Math.ceil(quantity / term.casePack) * term.casePack;
  }

  return quantity;
}

function buildExpectedDeliveryDate(leadTimeDays: number) {
  if (leadTimeDays <= 0) return "";
  const date = new Date();
  date.setDate(date.getDate() + leadTimeDays);
  return date.toISOString().slice(0, 10);
}

function filterOptionsFromSuppliers(suppliers: Supplier[]) {
  return [
    { value: "all", label: "All suppliers" },
    ...suppliers
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((supplier) => ({
        value: String(supplier.id),
        label: supplier.name,
      })),
  ];
}

const PURCHASE_ORDER_STATUS_OPTIONS: DataTableFilter["options"] = [
  { value: "all", label: "All statuses" },
  ...[
    "DRAFT",
    "CONFIRMED",
    "PARTIALLY_RECEIVED",
    "RECEIVED",
    "CANCELLED",
  ].map((status) => ({
    value: status,
    label: formatStatusLabel(status),
  })),
];

function ProcurementRecordsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

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
      render: (supplier) => supplier.city || "—",
    },
    {
      key: "gstin",
      header: "GSTIN",
      render: (supplier) => supplier.gstin || "—",
    },
    {
      key: "status",
      header: "Status",
      render: (supplier) =>
        booleanBadge(supplier.isActive, "Active", "Inactive"),
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
      render: (term) => term.supplierSku || term.supplier?.code || "—",
    },
    {
      key: "cost",
      header: "Unit cost",
      render: (term) => formatCurrency(term.currentUnitCost),
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

  const purchaseOrderColumns: DataTableColumn<PurchaseOrderSummary>[] = [
    { key: "order", header: "Purchase order" },
    {
      key: "supplier",
      header: "Supplier",
      render: (order) => order.supplier?.name ?? "Unknown supplier",
    },
    {
      key: "status",
      header: "Status",
      render: (order) => statusBadge(order.status),
    },
    {
      key: "expected",
      header: "Expected",
      render: (order) => formatDate(order.expectedDeliveryAt),
    },
    {
      key: "lines",
      header: "Lines",
      render: (order) => (
        <span>
          {order.lines.length} line{order.lines.length === 1 ? "" : "s"}
        </span>
      ),
    },
    {
      key: "total",
      header: "Total",
      render: (order) => formatCurrency(order.totalCost),
    },
    {
      key: "actions",
      header: "Action",
      render: (order) =>
        order.status !== "RECEIVED" && order.status !== "CANCELLED" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void openReceiptDialog(order.id)}
          >
            Post receipt
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">Closed</span>
        ),
    },
  ];

  const receiptColumns: DataTableColumn<ReceiptRow>[] = [
    { key: "receipt", header: "Receipt" },
    {
      key: "purchaseOrder",
      header: "Purchase order",
      render: (receipt) => `PO #${receipt.purchaseOrderId}`,
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (receipt) => receipt.supplierName,
    },
    {
      key: "postedAt",
      header: "Posted",
      render: (receipt) => formatDateTime(receipt.createdAt),
    },
    {
      key: "quantities",
      header: "Quantities",
      render: (receipt) => (
        <div className="space-y-1">
          <div>Received {receipt.totalReceived}</div>
          <div className="text-xs text-muted-foreground">
            Rejected {receipt.totalRejected}
          </div>
        </div>
      ),
    },
  ];

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
      render: (draft) => formatCurrency(draft.totalCost),
    },
  ];

  const supplierFilters: DataTableFilter[] = [
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

  const sourcingFilters: DataTableFilter[] = [
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

  const purchaseOrderFilters: DataTableFilter[] = [
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

  const receiptFilters: DataTableFilter[] = [
    {
      key: "supplier",
      label: "Supplier",
      options: supplierOptions,
      defaultValue: "all",
    },
  ];

  const replenishmentFilters: DataTableFilter[] = [
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
                  onClick={() => openSourcingModal(inventoryPrefillItem.id)}
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
              data={suppliers}
              loading={suppliersQuery.isFetching}
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
              onSearchChange={(value) => {
                setSupplierPage(1);
                setSupplierSearch(value);
              }}
              filters={supplierFilters}
              onFilterChange={(key, value) => {
                if (key === "status") {
                  setSupplierPage(1);
                  setSupplierStatusFilter(String(value));
                }
              }}
              pagination={{
                total: suppliersQuery.total,
                totalPages: suppliersQuery.totalPages,
              }}
              currentPage={supplierPage}
              onPageChange={setSupplierPage}
              itemsPerPage={ITEMS_PER_PAGE}
              resultsText={(count, total) =>
                `Showing ${count} of ${total} supplier${total === 1 ? "" : "s"}`
              }
              emptyMessage="No suppliers match the current filters."
              toolbarActions={
                <Button onClick={openSupplierModal}>
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
              data={supplierTerms}
              loading={termsQuery.isFetching}
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
              onSearchChange={(value) => {
                setTermPage(1);
                setSourcingSearch(value);
              }}
              filters={sourcingFilters}
              onFilterChange={(key, value) => {
                if (key === "supplier") {
                  setTermPage(1);
                  setSourcingSupplierFilter(String(value));
                }
                if (key === "preferred") {
                  setTermPage(1);
                  setSourcingPreferredFilter(String(value));
                }
              }}
              pagination={{
                total: termsQuery.total,
                totalPages: termsQuery.totalPages,
              }}
              currentPage={termPage}
              onPageChange={setTermPage}
              itemsPerPage={ITEMS_PER_PAGE}
              resultsText={(count, total) =>
                `Showing ${count} of ${total} sourcing term${total === 1 ? "" : "s"}`
              }
              emptyMessage="No sourcing terms match the current filters."
              toolbarActions={
                <Button onClick={() => openSourcingModal()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add sourcing
                </Button>
              }
            />
          </ProcurementRecordsCard>
        </TabsContent>

        <TabsContent value="purchase-orders" className="space-y-6">
          <ProcurementRecordsCard
            title="Purchase orders"
            description="Track purchase orders as records, with creation moved into a focused modal."
          >
            <DataTable<PurchaseOrderSummary>
              data={purchaseOrders}
              loading={purchaseOrdersQuery.isFetching}
              columns={purchaseOrderColumns}
              getRowId={(order) => String(order.id)}
              renderMainCell={(order) => (
                <div className="flex flex-col">
                  <span className="font-medium">PO #{order.id}</span>
                  <span className="text-sm text-muted-foreground">
                    {order.referenceNo || "No reference"}
                  </span>
                </div>
              )}
              searchPlaceholder="Search purchase orders..."
              onSearchChange={(value) => {
                setPurchaseOrderPage(1);
                setPurchaseOrderSearch(value);
              }}
              filters={purchaseOrderFilters}
              onFilterChange={(key, value) => {
                if (key === "status") {
                  setPurchaseOrderPage(1);
                  setPurchaseOrderStatusFilter(String(value));
                }
                if (key === "supplier") {
                  setPurchaseOrderPage(1);
                  setPurchaseOrderSupplierFilter(String(value));
                }
              }}
              pagination={{
                total: purchaseOrdersQuery.total,
                totalPages: purchaseOrdersQuery.totalPages,
              }}
              currentPage={purchaseOrderPage}
              onPageChange={setPurchaseOrderPage}
              itemsPerPage={ITEMS_PER_PAGE}
              resultsText={(count, total) =>
                `Showing ${count} of ${total} purchase order${total === 1 ? "" : "s"}`
              }
              emptyMessage="No purchase orders match the current filters."
              toolbarActions={
                <>
                  <DateToolbarField
                    label="From"
                    value={purchaseOrderDateFrom}
                    onChange={(value) => {
                      setPurchaseOrderPage(1);
                      setPurchaseOrderDateFrom(value);
                    }}
                  />
                  <DateToolbarField
                    label="To"
                    value={purchaseOrderDateTo}
                    onChange={(value) => {
                      setPurchaseOrderPage(1);
                      setPurchaseOrderDateTo(value);
                    }}
                  />
                  <Button onClick={() => openPurchaseOrderModal()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create PO
                  </Button>
                </>
              }
            />
          </ProcurementRecordsCard>
        </TabsContent>

        <TabsContent value="receipts" className="space-y-6">
          <ProcurementRecordsCard
            title="Receipts"
            description="Receipt history now lives in its own records view so teams can review inbound activity without reopening forms."
          >
            <DataTable<ReceiptRow>
              data={receiptRows}
              loading={receiptsQuery.isFetching}
              columns={receiptColumns}
              getRowId={(receipt) => receipt.id}
              renderMainCell={(receipt) => (
                <div className="flex flex-col">
                  <span className="font-medium">Receipt #{receipt.receiptId}</span>
                  <span className="text-sm text-muted-foreground">
                    {receipt.lineCount} line{receipt.lineCount === 1 ? "" : "s"}
                    {receipt.linePreview ? ` · ${receipt.linePreview}` : ""}
                  </span>
                </div>
              )}
              searchPlaceholder="Search receipts..."
              onSearchChange={(value) => {
                setReceiptPage(1);
                setReceiptSearch(value);
              }}
              filters={receiptFilters}
              onFilterChange={(key, value) => {
                if (key === "supplier") {
                  setReceiptPage(1);
                  setReceiptSupplierFilter(String(value));
                }
              }}
              pagination={{
                total: receiptsQuery.total,
                totalPages: receiptsQuery.totalPages,
              }}
              currentPage={receiptPage}
              onPageChange={setReceiptPage}
              itemsPerPage={ITEMS_PER_PAGE}
              resultsText={(count, total) =>
                `Showing ${count} of ${total} receipt${total === 1 ? "" : "s"}`
              }
              emptyMessage="No receipts have been posted yet."
            />
          </ProcurementRecordsCard>
        </TabsContent>

        <TabsContent value="replenishment" className="space-y-6">
          <ProcurementRecordsCard
            title="Replenishment drafts"
            description="Review replenishment suggestions as a queue of records before turning them into purchase orders."
          >
            <DataTable<PurchaseOrderSummary>
              data={replenishmentDrafts}
              loading={draftsQuery.isFetching}
              columns={replenishmentColumns}
              getRowId={(draft) => String(draft.id)}
              renderMainCell={(draft) => (
                <div className="flex flex-col">
                  <span className="font-medium">Draft #{draft.id}</span>
                  <span className="text-sm text-muted-foreground">
                    {draft.referenceNo || "No reference"}
                  </span>
                </div>
              )}
              searchPlaceholder="Search replenishment drafts..."
              onSearchChange={(value) => {
                setReplenishmentPage(1);
                setReplenishmentSearch(value);
              }}
              filters={replenishmentFilters}
              onFilterChange={(key, value) => {
                if (key === "status") {
                  setReplenishmentPage(1);
                  setReplenishmentStatusFilter(String(value));
                }
                if (key === "supplier") {
                  setReplenishmentPage(1);
                  setReplenishmentSupplierFilter(String(value));
                }
              }}
              pagination={{
                total: draftsQuery.total,
                totalPages: draftsQuery.totalPages,
              }}
              currentPage={replenishmentPage}
              onPageChange={setReplenishmentPage}
              itemsPerPage={ITEMS_PER_PAGE}
              resultsText={(count, total) =>
                `Showing ${count} of ${total} replenishment draft${total === 1 ? "" : "s"}`
              }
              emptyMessage="No replenishment drafts are queued right now."
            />
          </ProcurementRecordsCard>
        </TabsContent>
      </Tabs>

      <FormDialog
        open={isSupplierOpen}
        onOpenChange={setIsSupplierOpen}
        size="lg"
        title="Add supplier"
        description="Supplier creation is tucked behind a modal so the records view stays focused."
        headerIcon={Plus}
        onSubmit={(e) => {
          e.preventDefault();
          void handleCreateSupplier();
        }}
        isSubmitting={submitting}
        submitLabel="Create supplier"
      >
        <DialogFormField label="Supplier name">
          <Input
            value={supplierForm.name}
            onChange={(event) =>
              setSupplierForm((prev) => ({ ...prev, name: event.target.value }))
            }
          />
        </DialogFormField>
        <DialogFormField label="Contact person">
          <Input
            value={supplierForm.contactPerson}
            onChange={(event) =>
              setSupplierForm((prev) => ({
                ...prev,
                contactPerson: event.target.value,
              }))
            }
          />
        </DialogFormField>
        <DialogFormGrid cols={2}>
          <DialogFormField label="Email">
            <Input
              value={supplierForm.email}
              onChange={(event) =>
                setSupplierForm((prev) => ({ ...prev, email: event.target.value }))
              }
            />
          </DialogFormField>
          <DialogFormField label="Phone">
            <Input
              value={supplierForm.phone}
              onChange={(event) =>
                setSupplierForm((prev) => ({ ...prev, phone: event.target.value }))
              }
            />
          </DialogFormField>
          <DialogFormField label="City">
            <Input
              value={supplierForm.city}
              onChange={(event) =>
                setSupplierForm((prev) => ({ ...prev, city: event.target.value }))
              }
            />
          </DialogFormField>
          <DialogFormField label="GSTIN">
            <Input
              value={supplierForm.gstin}
              onChange={(event) =>
                setSupplierForm((prev) => ({ ...prev, gstin: event.target.value }))
              }
            />
          </DialogFormField>
        </DialogFormGrid>
        <ToggleField
          label="Supplier status"
          value={supplierForm.isActive ? "active" : "inactive"}
          onValueChange={(v) =>
            setSupplierForm((prev) => ({
              ...prev,
              isActive: v === "active",
            }))
          }
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
      </FormDialog>

      <AppDialog
        open={isSourcingOpen}
        onOpenChange={setIsSourcingOpen}
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
                  setSourcingSupplierId(value === "none" ? "" : Number(value))
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
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
              isCatalogLoading={inventoryQuery.isLoading}
              excludeInventoryIds={linkedItemIdsForSourcingSupplier}
              initialSourcingItemIds={sourcingItemSeed}
              onSubmitSourcing={handleBulkSourcingSubmit}
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
              setIsSourcingOpen(false);
              setSourcingSupplierId("");
              setSourcingItemSeed([]);
            },
          }}
        />
      </AppDialog>

      <AppDialog
        open={isPurchaseOrderOpen}
        onOpenChange={(open) => {
          setIsPurchaseOrderOpen(open);
          if (!open) {
            setPoLineSeed(undefined);
          }
        }}
        size="xl"
        padding="flush"
        scrollBody
      >
        <AppDialogHeader
          title="Create purchase order"
          description="Choose supplier sourcing terms as lines; quantity and unit cost default from each term. Save on the picker creates the order."
          icon={Plus}
          sticky
        />
        <AppDialogBody layout="fill" className="space-y-3">
          <div className="shrink-0 space-y-3">
            <DialogFormGrid cols={3}>
              <DialogFormField label="Supplier">
                <Select
                  value={poForm.supplierId === "" ? "none" : String(poForm.supplierId)}
                  onValueChange={handlePurchaseOrderSupplierSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Choose supplier</SelectItem>
                    {purchaseOrderSuppliersSorted.map((supplier) => (
                      <SelectItem key={supplier.id} value={String(supplier.id)}>
                        {supplier.name}
                        {!supplier.isActive ? " (inactive)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </DialogFormField>
              <DialogFormField label="Reference">
                <Input
                  value={poForm.referenceNo}
                  onChange={(event) =>
                    setPoForm((prev) => ({
                      ...prev,
                      referenceNo: event.target.value,
                    }))
                  }
                />
              </DialogFormField>
              <DialogFormField label="Expected delivery">
                <DateInput
                  value={poForm.expectedDeliveryAt}
                  onChange={(v) =>
                    setPoForm((prev) => ({
                      ...prev,
                      expectedDeliveryAt: v,
                    }))
                  }
                />
              </DialogFormField>
            </DialogFormGrid>
            <DialogFormField label="Notes">
              <Textarea
                rows={1}
                className="min-h-9 resize-y py-2 text-sm leading-snug"
                value={poForm.notes}
                onChange={(event) =>
                  setPoForm((prev) => ({ ...prev, notes: event.target.value }))
                }
              />
            </DialogFormField>
          </div>
          {poForm.supplierId !== "" ? (
            <ProcurementBulkLinePicker
              key={`po-${String(poForm.supplierId)}-${JSON.stringify(poLineSeed ?? [])}`}
              mode="purchase-order"
              resetKey={`${String(poForm.supplierId)}-${JSON.stringify(poLineSeed ?? [])}`}
              catalogItems={inventoryItems}
              isCatalogLoading={inventoryQuery.isLoading}
              excludeInventoryIds={new Set()}
              supplierTerms={supplierTermsForPo}
              supplierTermsCatalogLoading={allSupplierTermsQuery.isLoading}
              initialPoLines={poLineSeed}
              onSubmitPo={handlePurchaseOrderPickerSubmit}
            />
          ) : (
            <p className="shrink-0 text-sm text-muted-foreground">
              Select a supplier to add order lines.
            </p>
          )}
        </AppDialogBody>
        <AppDialogFooter
          sticky
          padded
          secondary={{
            label: "Cancel",
            onClick: () => {
              setIsPurchaseOrderOpen(false);
              setPoLineSeed(undefined);
            },
          }}
        />
      </AppDialog>

      <Dialog open={isReceiptOpen} onOpenChange={handleReceiptDialogOpenChange}>
        <DialogContent className="flex w-[calc(100%-1rem)] max-h-[min(80vh,580px)] max-w-5xl flex-col gap-2 overflow-hidden p-3 sm:w-[calc(100%-1.25rem)] sm:gap-2 sm:p-4">
          <DialogHeader className="shrink-0 space-y-1 pr-7">
            <DialogTitle className="text-lg leading-tight">
              Post purchase receipt
            </DialogTitle>
            {receiptOrderId !== null ? (
              <DialogDescription className="text-xs leading-snug sm:text-sm">
                PO #{receiptOrderId} — ordered quantities are from the purchase
                order. Unit cost is taken from the PO line (not editable).
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
            {receiptBody.lines.map((line, index) => {
              const item = inventoryItems.find(
                (inventoryItem) => inventoryItem.id === line.inventoryItemId,
              );
              const meta = receiptPoSnapshot?.[index];
              const orderedQty = meta?.orderedQty ?? 0;
              const priorReceived = meta?.priorReceivedQty ?? 0;
              const openQty = Math.max(0, orderedQty - priorReceived);
              const moveTotal = line.receivedQty + line.rejectedQty;
              const exceedsOpen = moveTotal > openQty;
              const leavesOpen = Math.max(0, openQty - moveTotal);

              return (
                <div
                  key={`${line.inventoryItemId}-${index}`}
                  className="space-y-2 rounded-md border border-border/80 px-4 py-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="text-sm font-medium leading-snug">
                        {item?.name ?? `Item #${line.inventoryItemId}`}
                      </div>
                      <div className="text-xs leading-tight text-muted-foreground">
                        {item?.sku ?? "No SKU"}
                      </div>
                      <div className="pt-0.5 text-[11px] leading-tight text-muted-foreground">
                        <span>
                          This receipt:{" "}
                          <span className="font-medium text-foreground">
                            {line.receivedQty}
                          </span>{" "}
                          accepted,{" "}
                          <span className="font-medium text-foreground">
                            {line.rejectedQty}
                          </span>{" "}
                          rejected ({moveTotal} of {openQty} open)
                        </span>
                        {leavesOpen > 0 && !exceedsOpen ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {leavesOpen} still open after this receipt
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                      <div className="min-w-0 shrink-0 overflow-x-auto sm:overflow-visible">
                        <div className="flex w-max max-w-full shrink-0 items-center gap-2 rounded-md border bg-muted/30 px-1 py-1 sm:max-w-none sm:gap-0 sm:px-0 sm:py-1">
                          <div className="flex shrink-0 flex-col gap-0.5 px-2 py-0 sm:px-3">
                            <span className="whitespace-nowrap text-xs font-medium uppercase tracking-wide leading-none text-muted-foreground">
                              Ordered
                            </span>
                            <span className="flex h-8 items-center text-sm font-medium tabular-nums leading-none">
                              {orderedQty}
                            </span>
                          </div>
                          <div className="flex shrink-0 flex-col gap-0.5 px-2 py-0 sm:px-3">
                            <span className="whitespace-nowrap text-xs font-medium uppercase tracking-wide leading-none text-muted-foreground">
                              Prev. recv.
                            </span>
                            <span className="flex h-8 items-center text-sm font-medium tabular-nums leading-none">
                              {priorReceived}
                            </span>
                          </div>
                          <div className="flex shrink-0 flex-col gap-0.5 px-2 py-0 sm:px-3">
                            <span className="whitespace-nowrap text-xs font-medium uppercase tracking-wide leading-none text-muted-foreground">
                              Open
                            </span>
                            <span className="flex h-8 items-center text-sm font-semibold tabular-nums leading-none">
                              {openQty}
                            </span>
                          </div>
                          <div className="flex min-w-[6.75rem] shrink-0 flex-col gap-0.5 border-l border-border/60 px-2 py-0 sm:min-w-[7rem] sm:px-3">
                            <span className="whitespace-nowrap text-xs font-medium uppercase tracking-wide leading-none text-muted-foreground">
                              Unit cost
                            </span>
                            <span className="flex h-8 items-center text-sm font-medium tabular-nums leading-none">
                              {meta != null
                                ? formatCurrency(meta.unitCost)
                                : formatCurrency(line.unitCost)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <div className="flex min-w-0 flex-col gap-1.5">
                          <Label className="text-xs leading-none text-muted-foreground">
                            Accepted
                          </Label>
                          <Input
                            className="h-8 w-[3.5rem] px-1.5 text-right text-xs tabular-nums"
                            type="number"
                            min={0}
                            step={1}
                            value={line.receivedQty || ""}
                            placeholder="0"
                            onChange={(event) =>
                              updateReceiptLine(
                                index,
                                "receivedQty",
                                event.target.value === ""
                                  ? 0
                                  : Number(event.target.value),
                              )
                            }
                          />
                        </div>
                        <div className="flex min-w-0 flex-col gap-1.5">
                          <Label className="text-xs leading-none text-muted-foreground">
                            Rejected
                          </Label>
                          <Input
                            className="h-8 w-[3.5rem] px-1.5 text-right text-xs tabular-nums"
                            type="number"
                            min={0}
                            step={1}
                            value={line.rejectedQty || ""}
                            placeholder="0"
                            onChange={(event) =>
                              updateReceiptLine(
                                index,
                                "rejectedQty",
                                event.target.value === ""
                                  ? 0
                                  : Number(event.target.value),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  {exceedsOpen ? (
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-500">
                      Accepted + rejected ({moveTotal}) is more than the open
                      quantity ({openQty}) for this line.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
          <DialogFooter className="shrink-0 gap-1.5 pt-1">
            <Button variant="outline" onClick={() => setIsReceiptOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handlePostReceipt()} disabled={submitting}>
              Save receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DateToolbarField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <DateInput
        value={value}
        onChange={(v) => onChange(v)}
        className="w-full min-w-[170px] sm:w-[170px]"
      />
    </div>
  );
}
