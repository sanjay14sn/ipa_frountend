import { api } from "@/lib/axios";
import {
  compactRequestParams,
  normalizePaginatedResult,
  unwrapData,
} from "@/lib/unwrap-api";

export interface CreateSupplierDto {
  code?: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  gstin?: string;
  isActive?: boolean;
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  gstin?: string | null;
  isActive: boolean;
}

export interface SupplierItemTerm {
  id: number;
  supplierId: number;
  inventoryItemId: number;
  supplierSku?: string | null;
  isPreferred: boolean;
  currentUnitCost: number;
  leadTimeDays: number;
  moq: number;
  casePack: number;
  lastReceivedAt?: string | null;
  supplier?: { id: number; name: string; code: string } | null;
  inventoryItem?: { id: number; name: string; sku: string } | null;
}

export interface UpsertSupplierItemTermDto {
  supplierId: number;
  inventoryItemId: number;
  supplierSku?: string;
  isPreferred?: boolean;
  currentUnitCost?: number;
  leadTimeDays?: number;
  moq?: number;
  casePack?: number;
}

export interface PurchaseOrderLineInput {
  inventoryItemId: number;
  orderedQty: number;
  unitCost: number;
}

export interface CreatePurchaseOrderDto {
  supplierId: number;
  referenceNo?: string;
  expectedDeliveryAt?: string;
  notes?: string;
  lines: PurchaseOrderLineInput[];
}

export interface PurchaseReceiptLineInput {
  inventoryItemId: number;
  receivedQty: number;
  rejectedQty: number;
  unitCost: number;
}

export interface PostPurchaseReceiptDto {
  lines: PurchaseReceiptLineInput[];
}

export interface PurchaseOrderSummary {
  id: number;
  supplierId: number;
  referenceNo?: string | null;
  status: string;
  totalCost: number;
  expectedDeliveryAt?: string | null;
  notes?: string | null;
  createdBy?: number | null;
  supplier?: { id: number; code: string; name: string } | null;
  lines: Array<{
    id: number;
    inventoryItemId: number;
    orderedQty: number;
    receivedQty: number;
    unitCost: number;
    inventoryItem?: { id: number; name: string; sku: string } | null;
  }>;
  receipts: Array<{
    id: number;
    purchaseOrderId?: number;
    supplierId?: number;
    receivedBy: number;
    createdAt?: string | null;
    supplier?: { id: number; code: string; name: string } | null;
    lines: Array<{
      id: number;
      inventoryItemId: number;
      receivedQty: number;
      rejectedQty: number;
      unitCost: number;
      inventoryItem?: { id: number; name: string; sku: string } | null;
    }>;
  }>;
}

export interface PurchaseReceiptSummary {
  id: number;
  purchaseOrderId: number;
  supplierId: number;
  receivedBy: number;
  createdAt?: string | null;
  supplier?: { id: number; code: string; name: string } | null;
  lines: Array<{
    id: number;
    inventoryItemId: number;
    receivedQty: number;
    rejectedQty: number;
    unitCost: number;
    inventoryItem?: { id: number; name: string; sku: string } | null;
  }>;
}

export interface ProcurementPaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface SupplierListParams extends ProcurementPaginationParams {
  status?: string;
}

export interface SupplierTermListParams extends ProcurementPaginationParams {
  supplierId?: number;
  inventoryItemId?: number;
  preferred?: boolean;
}

export interface PurchaseOrderListParams extends ProcurementPaginationParams {
  status?: string;
  supplierId?: number;
  fromDate?: string;
  toDate?: string;
  /** Super-admin region view: scope to this warehouse location. */
  regionLocationId?: number;
}

export interface PurchaseReceiptListParams extends ProcurementPaginationParams {
  supplierId?: number;
  /** Super-admin region view: scope to this warehouse location. */
  regionLocationId?: number;
}

export interface PaginatedProcurementResult<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function normalizeSupplier(row: any): Supplier {
  return {
    id: Number(row?.id ?? 0),
    code: String(row?.code ?? ""),
    name: String(row?.name ?? ""),
    contactPerson: row?.contactPerson ?? null,
    email: row?.email ?? null,
    phone: row?.phone ?? null,
    address: row?.address ?? null,
    city: row?.city ?? null,
    state: row?.state ?? null,
    gstin: row?.gstin ?? null,
    isActive: Boolean(row?.isActive ?? true),
  };
}

function normalizeSupplierTerm(row: any): SupplierItemTerm {
  return {
    id: Number(row?.id ?? 0),
    supplierId: Number(row?.supplierId ?? 0),
    inventoryItemId: Number(row?.inventoryItemId ?? 0),
    supplierSku: row?.supplierSku ?? null,
    isPreferred: Boolean(row?.isPreferred ?? false),
    currentUnitCost: Number(row?.currentUnitCost ?? 0),
    leadTimeDays: Number(row?.leadTimeDays ?? 0),
    moq: Number(row?.moq ?? 0),
    casePack: Number(row?.casePack ?? 0),
    lastReceivedAt: row?.lastReceivedAt ?? null,
    supplier: row?.supplier
      ? {
          id: Number(row.supplier.id ?? 0),
          name: String(row.supplier.name ?? ""),
          code: String(row.supplier.code ?? ""),
        }
      : null,
    inventoryItem: row?.inventoryItem
      ? {
          id: Number(row.inventoryItem.id ?? 0),
          name: String(row.inventoryItem.name ?? ""),
          sku: String(row.inventoryItem.sku ?? ""),
        }
      : null,
  };
}

function normalizeLineInventoryItem(line: any) {
  return line?.inventoryItem
    ? {
        id: Number(line.inventoryItem.id ?? 0),
        name: String(line.inventoryItem.name ?? ""),
        sku: String(line.inventoryItem.sku ?? ""),
      }
    : null;
}

function normalizeReceiptLine(line: any) {
  return {
    id: Number(line?.id ?? 0),
    inventoryItemId: Number(line?.inventoryItemId ?? 0),
    receivedQty: Number(line?.receivedQty ?? 0),
    rejectedQty: Number(line?.rejectedQty ?? 0),
    unitCost: Number(line?.unitCost ?? 0),
    inventoryItem: normalizeLineInventoryItem(line),
  };
}

function normalizePurchaseOrder(row: any): PurchaseOrderSummary {
  return {
    id: Number(row?.id ?? 0),
    supplierId: Number(row?.supplierId ?? 0),
    referenceNo: row?.referenceNo ?? null,
    status: String(row?.status ?? ""),
    totalCost: Number(row?.totalCost ?? 0),
    expectedDeliveryAt: row?.expectedDeliveryAt ?? null,
    notes: row?.notes ?? null,
    createdBy: row?.createdBy ?? null,
    supplier: row?.supplier
      ? {
          id: Number(row.supplier.id ?? 0),
          code: String(row.supplier.code ?? ""),
          name: String(row.supplier.name ?? ""),
        }
      : null,
    lines: Array.isArray(row?.lines)
      ? row.lines.map((line: any) => ({
          id: Number(line?.id ?? 0),
          inventoryItemId: Number(line?.inventoryItemId ?? 0),
          orderedQty: Number(line?.orderedQty ?? 0),
          receivedQty: Number(line?.receivedQty ?? 0),
          unitCost: Number(line?.unitCost ?? 0),
          inventoryItem: normalizeLineInventoryItem(line),
        }))
      : [],
    receipts: Array.isArray(row?.receipts)
      ? row.receipts.map((receipt: any) => ({
          id: Number(receipt?.id ?? 0),
          purchaseOrderId:
            receipt?.purchaseOrderId == null
              ? undefined
              : Number(receipt.purchaseOrderId),
          supplierId:
            receipt?.supplierId == null ? undefined : Number(receipt.supplierId),
          receivedBy: Number(receipt?.receivedBy ?? 0),
          createdAt: receipt?.createdAt ?? null,
          supplier: receipt?.supplier
            ? {
                id: Number(receipt.supplier.id ?? 0),
                code: String(receipt.supplier.code ?? ""),
                name: String(receipt.supplier.name ?? ""),
              }
            : null,
          lines: Array.isArray(receipt?.lines)
            ? receipt.lines.map(normalizeReceiptLine)
            : [],
        }))
      : [],
  };
}

function normalizePurchaseReceipt(row: any): PurchaseReceiptSummary {
  return {
    id: Number(row?.id ?? 0),
    purchaseOrderId: Number(row?.purchaseOrderId ?? 0),
    supplierId: Number(row?.supplierId ?? 0),
    receivedBy: Number(row?.receivedBy ?? 0),
    createdAt: row?.createdAt ?? null,
    supplier: row?.supplier
      ? {
          id: Number(row.supplier.id ?? 0),
          code: String(row.supplier.code ?? ""),
          name: String(row.supplier.name ?? ""),
        }
      : null,
    lines: Array.isArray(row?.lines)
      ? row.lines.map(normalizeReceiptLine)
      : [],
  };
}

function normalizeProcurementPaginated<T>(
  result: unknown,
  normalizeRow: (row: any) => T,
): PaginatedProcurementResult<T> {
  const normalized = normalizePaginatedResult<unknown>(result);
  return {
    rows: normalized.rows.map((row) => normalizeRow(row)),
    total: normalized.total,
    page: normalized.page,
    limit: normalized.limit,
    totalPages: Math.max(
      1,
      Math.ceil(normalized.total / (normalized.limit || 20)),
    ),
  };
}

export async function getPaginatedSuppliers(
  params?: SupplierListParams,
): Promise<PaginatedProcurementResult<Supplier>> {
  const response = await api.get("/admin/procurement/supplier", {
    params: compactRequestParams(
      params as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  return normalizeProcurementPaginated(
    unwrapData<unknown>(response),
    normalizeSupplier,
  );
}

async function getAllSuppliers(
  params?: SupplierListParams,
): Promise<Supplier[]> {
  const page = await getPaginatedSuppliers({
    page: params?.page ?? 1,
    limit: params?.limit ?? 10_000,
    search: params?.search,
    status: params?.status,
  });
  return page.rows;
}

async function getSupplierById(id: number): Promise<Supplier> {
  const all = await getAllSuppliers();
  const row = all.find((supplier) => supplier.id === id);
  if (!row) throw new Error("Supplier not found");
  return row;
}

export async function createSupplier(body: CreateSupplierDto): Promise<Supplier> {
  const response = await api.post("/admin/procurement/supplier", body);
  return normalizeSupplier(unwrapData(response));
}

export async function getPaginatedSupplierTerms(
  params?: SupplierTermListParams,
): Promise<PaginatedProcurementResult<SupplierItemTerm>> {
  const response = await api.get("/admin/procurement/supplier-term", {
    params: compactRequestParams(
      params as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  return normalizeProcurementPaginated(
    unwrapData<unknown>(response),
    normalizeSupplierTerm,
  );
}

async function getSupplierTerms(
  params?: SupplierTermListParams | number,
): Promise<SupplierItemTerm[]> {
  const page = await getPaginatedSupplierTerms(
    typeof params === "number"
      ? { inventoryItemId: params, page: 1, limit: 10_000 }
      : { page: params?.page ?? 1, limit: params?.limit ?? 10_000, ...params },
  );
  return page.rows;
}

async function upsertSupplierItemTerm(
  body: UpsertSupplierItemTermDto,
): Promise<SupplierItemTerm> {
  const response = await api.post("/admin/procurement/supplier-term", body);
  return normalizeSupplierTerm(unwrapData(response));
}

export type BulkUpsertSupplierItemTermLine = Omit<
  UpsertSupplierItemTermDto,
  "supplierId"
>;

export async function bulkUpsertSupplierItemTerms(body: {
  supplierId: number;
  lines: BulkUpsertSupplierItemTermLine[];
}): Promise<{ updated: number }> {
  const response = await api.post(
    "/admin/procurement/supplier-term/bulk",
    body,
  );
  return unwrapData(response);
}

export async function createPurchaseOrder(
  body: CreatePurchaseOrderDto,
): Promise<PurchaseOrderSummary> {
  const response = await api.post("/admin/procurement/purchase-orders", body);
  return normalizePurchaseOrder(unwrapData(response));
}

export async function getPaginatedPurchaseOrders(
  params?: PurchaseOrderListParams,
): Promise<PaginatedProcurementResult<PurchaseOrderSummary>> {
  const response = await api.get("/admin/procurement/purchase-orders", {
    params: compactRequestParams(
      params as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  return normalizeProcurementPaginated(
    unwrapData<unknown>(response),
    normalizePurchaseOrder,
  );
}

async function getPurchaseOrders(
  params?: PurchaseOrderListParams | string,
): Promise<PurchaseOrderSummary[]> {
  const page = await getPaginatedPurchaseOrders(
    typeof params === "string"
      ? { status: params, page: 1, limit: 10_000 }
      : { page: params?.page ?? 1, limit: params?.limit ?? 10_000, ...params },
  );
  return page.rows;
}

export async function getPurchaseOrderById(
  id: number,
): Promise<PurchaseOrderSummary> {
  const response = await api.get(`/admin/procurement/purchase-orders/${id}`);
  return normalizePurchaseOrder(unwrapData(response));
}

export async function getPaginatedPurchaseReceipts(
  params?: PurchaseReceiptListParams,
): Promise<PaginatedProcurementResult<PurchaseReceiptSummary>> {
  const response = await api.get("/admin/procurement/purchase-receipts", {
    params: compactRequestParams(
      params as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  return normalizeProcurementPaginated(
    unwrapData<unknown>(response),
    normalizePurchaseReceipt,
  );
}

export async function postPurchaseReceipt(
  purchaseOrderId: number,
  body: PostPurchaseReceiptDto,
) {
  const response = await api.post(
    `/admin/procurement/purchase-orders/${purchaseOrderId}/receipts`,
    body,
  );
  return unwrapData(response);
}

export async function getPaginatedReplenishmentDrafts(
  params?: PurchaseOrderListParams,
): Promise<PaginatedProcurementResult<PurchaseOrderSummary>> {
  const response = await api.get("/admin/procurement/replenishment-drafts", {
    params: compactRequestParams(
      params as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  return normalizeProcurementPaginated(
    unwrapData<unknown>(response),
    normalizePurchaseOrder,
  );
}

async function getReplenishmentDrafts(
  params?: PurchaseOrderListParams,
): Promise<PurchaseOrderSummary[]> {
  const page = await getPaginatedReplenishmentDrafts({
    page: params?.page ?? 1,
    limit: params?.limit ?? 10_000,
    ...params,
  });
  return page.rows;
}

async function createSupplierOrder(body: {
  supplierId: number;
  referenceNo?: string;
  lines: { inventoryId: number; orderedQty: number; unitCost: number }[];
}) {
  return createPurchaseOrder({
    supplierId: body.supplierId,
    referenceNo: body.referenceNo,
    lines: body.lines.map((line) => ({
      inventoryItemId: line.inventoryId,
      orderedQty: line.orderedQty,
      unitCost: line.unitCost,
    })),
  });
}

async function receiveSupplierOrder(
  id: number,
  lines?: { itemId: number; receivedQty: number }[],
) {
  return postPurchaseReceipt(id, {
    lines: (lines ?? []).map((line) => ({
      inventoryItemId: line.itemId,
      receivedQty: line.receivedQty,
      rejectedQty: 0,
      unitCost: 0,
    })),
  });
}

async function getAllSupplierOrders(): Promise<PurchaseOrderSummary[]> {
  return getPurchaseOrders();
}

async function getSupplierOrderById(
  id: number,
): Promise<PurchaseOrderSummary> {
  return getPurchaseOrderById(id);
}

async function getOrderHistoryForInventory(
  _inventoryId: number,
): Promise<unknown[]> {
  return [];
}
