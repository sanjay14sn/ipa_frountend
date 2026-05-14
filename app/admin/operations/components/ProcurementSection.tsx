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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
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
      toast({
        title: "Validation",
        description: "Choose a supplier first.",
        variant: "destructive",
      });
      return;
    }
    try {
      setSubmitting(true);
      await bulkUpsertSupplierItemTerms({
        supplierId: Number(sourcingSupplierId),
        lines,
      });
      toast({ title: "Sourcing saved" });
      setIsSourcingOpen(false);
      setSourcingSupplierId("");
      setSourcingItemSeed([]);
      setTermPage(1);
      await invalidateProcurementQueries();
    } catch (error) {
      toast({
        title: "Error",
        description: getUserFriendlyMessage(error),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePurchaseOrderPickerSubmit(lines: PurchaseOrderLineInput[]) {
    if (poForm.supplierId === "") {
      toast({
        title: "Validation",
        description: "Choose a supplier first.",
        variant: "destructive",
      });
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
      toast({ title: "Purchase order created" });
      setIsPurchaseOrderOpen(false);
      setPoForm(createPurchaseOrderForm());
      setPoLineSeed(undefined);
      setPurchaseOrderPage(1);
      await invalidateProcurementQueries();
    } catch (error) {
      toast({
        title: "Error",
        description: getUserFriendlyMessage(error),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateSupplier() {
    if (!supplierForm.name.trim()) {
      toast({
        title: "Validation",
        description: "Supplier name is required.",
        variant: "destructive",
      });
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
      toast({ title: "Supplier created" });
      setIsSupplierOpen(false);
      setSupplierForm(INITIAL_SUPPLIER_FORM);
      setSupplierPage(1);
      await invalidateProcurementQueries();
    } catch (error) {
      toast({
        title: "Error",
        description: getUserFriendlyMessage(error),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function openReceiptDialog(orderId: number) {
    try {
      const order = await getPurchaseOrderById(orderId);
      setReceiptOrderId(orderId);
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
      toast({
        title: "Error",
        description: getUserFriendlyMessage(error),
        variant: "destructive",
      });
    }
  }

  async function handlePostReceipt() {
    if (!receiptOrderId) return;

    try {
      setSubmitting(true);
      await postPurchaseReceipt(receiptOrderId, receiptBody);
      toast({ title: "Receipt posted" });
      setIsReceiptOpen(false);
      setReceiptOrderId(null);
      setPurchaseOrderPage(1);
      setReceiptPage(1);
      await invalidateProcurementQueries();
    } catch (error) {
      toast({
        title: "Error",
        description: getUserFriendlyMessage(error),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function updateReceiptLine(
    index: number,
    key: keyof PostPurchaseReceiptDto["lines"][number],
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

      <Dialog open={isSupplierOpen} onOpenChange={setIsSupplierOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add supplier</DialogTitle>
            <DialogDescription>
              Supplier creation is tucked behind a modal so the records view stays focused.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Supplier name</Label>
              <Input
                value={supplierForm.name}
                onChange={(event) =>
                  setSupplierForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Contact person</Label>
              <Input
                value={supplierForm.contactPerson}
                onChange={(event) =>
                  setSupplierForm((prev) => ({
                    ...prev,
                    contactPerson: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={supplierForm.email}
                onChange={(event) =>
                  setSupplierForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={supplierForm.phone}
                onChange={(event) =>
                  setSupplierForm((prev) => ({ ...prev, phone: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={supplierForm.city}
                onChange={(event) =>
                  setSupplierForm((prev) => ({ ...prev, city: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>GSTIN</Label>
              <Input
                value={supplierForm.gstin}
                onChange={(event) =>
                  setSupplierForm((prev) => ({ ...prev, gstin: event.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-3 md:col-span-2">
              <Switch
                checked={supplierForm.isActive}
                onCheckedChange={(checked) =>
                  setSupplierForm((prev) => ({ ...prev, isActive: checked }))
                }
              />
              <Label>Active supplier</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSupplierOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateSupplier()} disabled={submitting}>
              Create supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSourcingOpen} onOpenChange={setIsSourcingOpen}>
        <DialogContent className="flex w-[calc(100%-1rem)] max-h-[92vh] max-w-6xl flex-col gap-2 overflow-hidden px-4 py-2.5 sm:w-[calc(100%-1.25rem)] sm:gap-2 sm:px-5 sm:py-2.5">
          <DialogHeader className="shrink-0 space-y-1 pr-7">
            <DialogTitle className="text-lg leading-tight">Add sourcing</DialogTitle>
            <DialogDescription className="text-xs leading-snug sm:text-sm">
              Choose one supplier, then select inventory items to create or update sourcing terms in bulk.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="shrink-0 space-y-1.5">
              <Label>Supplier</Label>
              <Select
                value={sourcingSupplierId === "" ? "none" : String(sourcingSupplierId)}
                onValueChange={(value) =>
                  setSourcingSupplierId(value === "none" ? "" : Number(value))
                }
              >
                <SelectTrigger className="ring-offset-0 focus-visible:ring-inset">
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
            </div>
            {sourcingSupplierId !== "" ? (
              <>
                <div className="shrink-0 rounded-lg border px-2 py-1.5 sm:px-2 sm:py-2">
                  <div className="mb-1 text-sm font-medium leading-tight">Existing sourcing</div>
                  {allSupplierTerms.filter((t) => t.supplierId === sourcingSupplierId)
                    .length === 0 ? (
                    <p className="text-sm text-muted-foreground">No rows yet for this supplier.</p>
                  ) : (
                    <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                      {allSupplierTerms
                        .filter((t) => t.supplierId === sourcingSupplierId)
                        .map((term) => (
                          <Badge key={term.id} variant="secondary" className="font-normal">
                            {term.inventoryItem?.name ?? `Item #${term.inventoryItemId}`}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <ProcurementBulkLinePicker
                    key={`sourcing-${String(sourcingSupplierId)}-${sourcingItemSeed.join(",")}`}
                    mode="sourcing"
                    resetKey={`${String(sourcingSupplierId)}-${sourcingItemSeed.join(",")}`}
                    catalogItems={inventoryItems}
                    isCatalogLoading={inventoryQuery.isLoading}
                    excludeInventoryIds={linkedItemIdsForSourcingSupplier}
                    initialSourcingItemIds={sourcingItemSeed}
                    onSubmitSourcing={handleBulkSourcingSubmit}
                    className="min-h-0 flex-1"
                  />
                </div>
              </>
            ) : (
              <p className="shrink-0 text-sm text-muted-foreground">
                Select a supplier to enable the item picker. Saving runs from the picker&apos;s Save button.
              </p>
            )}
          </div>
          <DialogFooter className="shrink-0 gap-2 pt-1 sm:pt-1.5">
            <Button
              variant="outline"
              onClick={() => {
                setIsSourcingOpen(false);
                setSourcingSupplierId("");
                setSourcingItemSeed([]);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isPurchaseOrderOpen}
        onOpenChange={(open) => {
          setIsPurchaseOrderOpen(open);
          if (!open) {
            setPoLineSeed(undefined);
          }
        }}
      >
        <DialogContent className="flex w-[calc(100%-1rem)] max-h-[92vh] max-w-6xl flex-col gap-1.5 overflow-hidden p-2 sm:w-[calc(100%-1.25rem)] sm:gap-1.5 sm:p-3">
          <DialogHeader className="shrink-0 space-y-0.5 pr-7">
            <DialogTitle className="text-base leading-tight">Create purchase order</DialogTitle>
            <DialogDescription className="text-xs leading-snug text-muted-foreground">
              Choose supplier sourcing terms as lines; quantity and unit cost default from each
              term. Save on the picker creates the order.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            <div className="shrink-0 space-y-1.5">
              <div className="grid grid-cols-1 gap-1.5 md:grid-cols-12">
                <div className="space-y-1 md:col-span-4">
                  <Label className="text-xs">Supplier</Label>
                  <Select
                    value={poForm.supplierId === "" ? "none" : String(poForm.supplierId)}
                    onValueChange={handlePurchaseOrderSupplierSelect}
                  >
                    <SelectTrigger className="h-9 ring-offset-0 focus-visible:ring-inset">
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
                </div>
                <div className="space-y-1 md:col-span-4">
                  <Label className="text-xs">Reference</Label>
                  <Input
                    className="h-9"
                    value={poForm.referenceNo}
                    onChange={(event) =>
                      setPoForm((prev) => ({
                        ...prev,
                        referenceNo: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1 md:col-span-4">
                  <Label className="text-xs">Expected delivery</Label>
                  <Input
                    className="h-9"
                    type="date"
                    value={poForm.expectedDeliveryAt}
                    onChange={(event) =>
                      setPoForm((prev) => ({
                        ...prev,
                        expectedDeliveryAt: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1 md:col-span-12">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    rows={1}
                    className="min-h-9 resize-y py-2 text-sm leading-snug"
                    value={poForm.notes}
                    onChange={(event) =>
                      setPoForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
            {poForm.supplierId !== "" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
                  className="min-h-0 flex-1"
                />
              </div>
            ) : (
              <p className="shrink-0 text-sm text-muted-foreground">
                Select a supplier to add order lines.
              </p>
            )}
          </div>
          <DialogFooter className="shrink-0 gap-1.5 pt-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsPurchaseOrderOpen(false);
                setPoLineSeed(undefined);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post purchase receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {receiptBody.lines.map((line, index) => {
              const item = inventoryItems.find(
                (inventoryItem) => inventoryItem.id === line.inventoryItemId,
              );

              return (
                <div
                  key={`${line.inventoryItemId}-${index}`}
                  className="grid gap-3 rounded-lg border p-3 md:grid-cols-4"
                >
                  <div>
                    <div className="font-medium">
                      {item?.name ?? `Item #${line.inventoryItemId}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item?.sku ?? "No SKU"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Received</Label>
                    <Input
                      type="number"
                      min={0}
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
                  <div className="space-y-1">
                    <Label>Rejected</Label>
                    <Input
                      type="number"
                      min={0}
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
                  <div className="space-y-1">
                    <Label>Unit cost</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unitCost || ""}
                      placeholder="0"
                      onChange={(event) =>
                        updateReceiptLine(
                          index,
                          "unitCost",
                          event.target.value === ""
                            ? 0
                            : Number(event.target.value),
                        )
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
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
      <Input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-[150px] sm:w-[150px]"
      />
    </div>
  );
}
