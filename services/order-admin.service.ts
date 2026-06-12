/**
 * order-admin.service.ts
 *
 * Admin-side order management functions plus all shared types / normalizers
 * that are consumed by every order sub-domain.  Franchisee and dispatch
 * modules import the shared pieces from here.
 */

import { api } from "@/lib/axios";
import { getApiBaseUrl } from "@/lib/api-utils";
import {
  compactRequestParams,
  normalizePaginatedResult,
  unwrapData,
} from "@/lib/unwrap-api";

// ---------------------------------------------------------------------------
// Shared primitive types
// ---------------------------------------------------------------------------

export interface Response {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
}

export enum OrderStatus {
  PENDING = "Pending",
  PROCESSING = "Processing",
  SHIPPED = "Shipped",
  DELIVERED = "Delivered",
  CANCELLED = "Cancelled",
}

export type OrderAllocationStatus =
  | "PENDING_ALLOCATION"
  | "ALLOCATED"
  | "BACKORDERED"
  | "RELEASED";

export type OrderFulfillmentStatus =
  | "PENDING_ALLOCATION"
  | "BACKORDERED"
  | "READY_TO_SHIP"
  | "PENDING"
  | "VERIFIED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItemData {
  id: number;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  /** Pre-GST unit price; mirrors `unitPrice` on legacy rows. */
  unitNetPrice?: string | number | null;
  /** GST on a single unit (0 for KIT / FEE lines). */
  unitGstAmount?: string | number | null;
  /** GST on the whole line — usually `unitGstAmount * quantity`. */
  lineGstAmount?: string | number | null;
  /** Tag for the GST category — drives whether GST hint shows on the row. */
  lineCategory?: "ROYALTY" | "MATERIAL" | "KIT" | "FEE" | null;
  reservedQty?: number;
  backorderedQty?: number;
  fulfilledQty?: number;
  studentId?: number | null;
  instructorId?: number | null;
  inventory: {
    id: number;
    name: string;
    sku?: string | null;
  } | null;
  student?: {
    id: number;
    name: string;
    rollNo?: string | null;
  } | null;
}

export interface PaymentDetails {
  method: string | null;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;
  email: string | null;
  contact: string | null;
  cardLast4: string | null;
  cardNetwork: string | null;
  cardType: string | null;
  cardIssuer: string | null;
  fee: number | null;
  /** @deprecated Razorpay processing-fee tax — use `gatewayFeeTaxAmount`. */
  tax: number | null;
  /** Razorpay's tax on the gateway processing fee. */
  gatewayFeeTaxAmount?: number | null;
  /** Goods/services GST (18%) on what the franchisee paid for. */
  goodsGstAmount?: number | null;
}

export interface PaymentSummary {
  id: number;
  status: string;
  method: string | null;
  amount: number;
  currency: string;
  paidAt: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  bank?: string | null;
  wallet?: string | null;
  vpa?: string | null;
  email?: string | null;
  contact?: string | null;
  fee?: number | null;
  /** @deprecated Razorpay processing-fee tax — use `gatewayFeeTaxAmount`. */
  tax?: number | null;
  /** Razorpay's tax on the gateway processing fee. */
  gatewayFeeTaxAmount?: number | null;
  /** Goods/services GST (18%) on what the franchisee paid for. */
  goodsGstAmount?: number | null;
  /** Raw Razorpay / checkout payload (order detail responses). */
  acquirerData?: Record<string, unknown> | null;
}

export interface ShipmentSummary {
  id: number;
  status: string;
  trackingNumber?: string | null;
  carrier?: string | null;
  dcPdfPath?: string | null;
}

/** Certificate / ID card dispatch line on an order (admin API) */
export interface DispatchOrderItemAdmin {
  id: number;
  itemType: string;
  studentId: number;
  studentName: string;
  rollNo: string;
  levelId: number | null;
  progressionId: number | null;
  levelCode: string | null;
  levelName: string | null;
  marksDisplay: string | null;
  instructorName: string | null;
  instructorCode: string | null;
}

// ---------------------------------------------------------------------------
// Invoice preview types (shared — used by both admin and franchisee)
// ---------------------------------------------------------------------------

export interface InvoiceLine {
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  /** Pre-GST unit price; mirrors `unitPrice` on legacy snapshots. */
  unitNetPrice?: number | null;
  /** GST on this line (0 for KIT / FEE). */
  lineGstAmount?: number | null;
  lineCategory?: "ROYALTY" | "MATERIAL" | "KIT" | "FEE" | null;
  studentId?: number;
  instructorId?: number;
  inventoryItemId?: number;
  itemType?: "LEVEL" | "KIT" | "FEE";
}

export interface InvoicePreviewLineItem {
  name: string;
  quantity: number;
}

export interface StartingKitGroupPreview {
  streamId: number;
  streamName: string;
  quantity: number;
  kitUnit: number;
  /** GST per unit on the kit portion. Always 0 per business rule. */
  kitGstUnit?: number;
  royaltyUnit: number;
  /** GST per unit on the royalty portion (18% when `gstRoyalty=false`). */
  royaltyGstUnit?: number;
  tshirtBreakdown: Array<{
    tshirtItemId: number | null;
    tshirtName: string | null;
    quantity: number;
  }>;
  items: InvoicePreviewLineItem[];
}

export interface InstructorGroupPreview {
  instructorId: number;
  name: string;
  instructorCode: string;
  items: InvoicePreviewLineItem[];
}

/** Per-item row inside `studentGroups` from unified `POST /order/preview-invoice`. */
export interface StudentGroupPreviewItem {
  name: string;
  quantity: number;
  inventoryItemId?: number;
  itemType?: "LEVEL" | "KIT" | "FEE";
}

/** Unified preview groups students with line items; `lines` is empty on that contract. */
export interface StudentGroupPreview {
  studentId: number;
  studentName: string;
  levelId: number;
  levelName: string;
  levelCode?: string;
  isFirstLevel: boolean;
  durationInMonths: number;
  royalty: number;
  /** GST portion of royalty (18% when `gstRoyalty=false`). */
  royaltyGst?: number;
  materialCost: number;
  /** GST portion of material cost (18% when `gstMaterialCost=false`). */
  materialCostGst?: number;
  kitCost: number;
  /** GST portion of kit cost — always 0 per business rule. */
  kitCostGst?: number;
  totalPrice: number;
  items: StudentGroupPreviewItem[];
}

export interface StudentBreakdown {
  studentId: number;
  studentName: string;
  levelId: number;
  levelName: string;
  levelCode?: string;
  isFirstLevel: boolean;
  royalty: number;
  royaltyGst?: number;
  materialCost: number;
  materialCostGst?: number;
  kitCost: number;
  /** Always 0 per business rule. */
  kitCostGst?: number;
  totalPrice: number;
  durationInMonths: number;
}

export interface CustomGroupPreviewItem {
  inventoryItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/** Custom (re-order) items folded into the unified order, grouped per student.
 * Priced off inventory unitPrice with no GST. Mirrors backend `customGroups`. */
export interface CustomGroupPreview {
  studentId: number;
  studentName: string;
  levelId: number;
  items: CustomGroupPreviewItem[];
  totalPrice: number;
}

export interface InvoicePreview {
  franchiseId: string;
  programId: number;
  levelId: number;
  isFirstLevel: boolean;
  students: StudentBreakdown[];
  /** Populated for legacy student-only preview; unified preview returns `[]` — use `studentGroups`. */
  lines: InvoiceLine[];
  totalAmount: number;
  /** Pre-GST subtotal — present on unified preview. */
  subtotalAmount?: number;
  /** GST contribution to `totalAmount`. */
  gstAmount?: number;
  /** TRUE when total has no separate GST surcharge. */
  isGstInclusive?: boolean;
  /** Present on unified preview (`studentIds` / mixed); mirrors backend `previewUnified`. */
  studentGroups?: StudentGroupPreview[];
  startingKitGroups?: StartingKitGroupPreview[];
  instructorGroups?: InstructorGroupPreview[];
  /** Custom (re-order) items folded into the unified order, grouped per student. */
  customGroups?: CustomGroupPreview[];
}

// ---------------------------------------------------------------------------
// Core order data shape (shared — referenced everywhere)
// ---------------------------------------------------------------------------

export interface OrderData {
  id: number;
  totalItems?: number;
  totalStudents?: number | null;
  totalInstructors?: number | null;
  totalAmount: string | number;
  /** Pre-GST subtotal; mirrors `totalAmount` on legacy rows. */
  subtotalAmount?: string | number | null;
  /** GST contribution to `totalAmount`. Zero when all components are inclusive. */
  gstAmount?: string | number | null;
  /** TRUE when the order total has no separate GST surcharge. */
  isGstInclusive?: boolean;
  status: OrderStatus | string;
  adminStatus?: string;
  franchiseeStatus?: string;
  paymentStatus?: string;
  allocationStatus?: OrderAllocationStatus | string;
  fulfillmentStatus?: OrderFulfillmentStatus | string;
  orderType: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  orderNumber?: string;
  referenceId?: string;
  franchiseId?: string | number;
  franchiseeId?: number;
  createdBy?: number;
  city?: string;
  phone?: string;
  updatedBy?: number;
  readyToShipAt?: string | null;
  backorderedAt?: string | null;
  franchise?: {
    id: string | number;
    code?: string | null;
    name: string;
    city?: string;
  };
  orderItems?: Record<string, OrderItemData[]>;
  lineItems?: OrderItemData[];
  dcPdfPath?: string | null;
  shipment?: ShipmentSummary | null;
  paymentDetails?: PaymentDetails | null;
  /** Payment summary from the order list response; full payment fields on detail responses. */
  payment?: PaymentSummary | null;
  dispatchItems?: DispatchOrderItemAdmin[];
  canCancel?: boolean;
  cancelBlockedReason?: string | null;
  /** Frozen `previewUnified` snapshot from backend when present (unified orders). */
  invoicePreview?: InvoicePreview | null;
}

// ---------------------------------------------------------------------------
// Admin-specific types
// ---------------------------------------------------------------------------

export interface GroupedOrdersResponse extends Response {
  result: {
    data: Record<string, OrderData[]>;
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

export interface AdminOrderListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  phase?: "orders" | "shipping";
  franchiseId?: string;
}

export interface RefreshOrderAllocationResult {
  orderId: number;
  allocationStatus: OrderAllocationStatus | string;
  linesUpdated: number;
  totalReservedDelta: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Internal helpers (shared normalizers — not exported from barrel)
// ---------------------------------------------------------------------------

type RawOrderLine = {
  id: number;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
  reservedQty?: number;
  backorderedQty?: number;
  fulfilledQty?: number;
  studentId?: number | null;
  instructorId?: number | null;
  inventory?: {
    id: number;
    name: string;
    sku?: string | null;
  } | null;
};

function toCurrencyString(value: number | string | null | undefined): string {
  return Number(value ?? 0).toFixed(2);
}

function normalizeDispatchItem(raw: unknown): DispatchOrderItemAdmin {
  const r = raw as Record<string, unknown>;
  return {
    id: Number(r?.id ?? 0),
    itemType: String(r?.itemType ?? ""),
    studentId: Number(r?.studentId ?? 0),
    studentName: String(r?.studentName ?? ""),
    rollNo: String(r?.rollNo ?? ""),
    levelId: r?.levelId != null ? Number(r.levelId) : null,
    progressionId: r?.progressionId != null ? Number(r.progressionId) : null,
    levelCode: r?.levelCode != null ? String(r.levelCode) : null,
    levelName: r?.levelName != null ? String(r.levelName) : null,
    marksDisplay: r?.marksDisplay != null ? String(r.marksDisplay) : null,
    instructorName: r?.instructorName != null ? String(r.instructorName) : null,
    instructorCode: r?.instructorCode != null ? String(r.instructorCode) : null,
  };
}

function cloneAcquirerDataJson(v: unknown): Record<string, unknown> | null {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return null;
  try {
    return JSON.parse(JSON.stringify(v)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function paymentDetailsFromEmbeddedPayment(p: Record<string, unknown>): PaymentDetails {
  const acq = p.acquirerData as { card?: { last4?: string; network?: string; type?: string; issuer?: string } } | null | undefined;
  const card =
    acq && typeof acq === "object" && acq.card && typeof acq.card === "object"
      ? (acq.card as { last4?: string; network?: string; type?: string; issuer?: string })
      : undefined;
  return {
    method: p.method != null ? String(p.method) : null,
    bank: p.bank != null ? String(p.bank) : null,
    wallet: p.wallet != null ? String(p.wallet) : null,
    vpa: p.vpa != null ? String(p.vpa) : null,
    email: p.email != null ? String(p.email) : null,
    contact: p.contact != null ? String(p.contact) : null,
    cardLast4: card?.last4 ?? null,
    cardNetwork: card?.network ?? null,
    cardType: card?.type ?? null,
    cardIssuer: card?.issuer ?? null,
    fee: p.fee != null ? Number(p.fee) : null,
    tax: p.tax != null ? Number(p.tax) : null,
  };
}

function normalizeOrderLine(raw: any): OrderItemData {
  return {
    id: Number(raw?.id ?? 0),
    quantity: Number(raw?.quantity ?? 0),
    unitPrice: toCurrencyString(raw?.unitPrice),
    totalPrice: toCurrencyString(raw?.totalPrice),
    reservedQty: Number(raw?.reservedQty ?? 0),
    backorderedQty: Number(raw?.backorderedQty ?? 0),
    fulfilledQty: Number(raw?.fulfilledQty ?? 0),
    studentId: raw?.studentId ?? null,
    instructorId: raw?.instructorId ?? null,
    inventory: raw?.inventory
      ? {
          id: Number(raw.inventory.id ?? 0),
          name: String(raw.inventory.name ?? ""),
          sku: raw.inventory.sku ?? null,
        }
      : null,
    student: raw?.student
      ? {
          id: Number(raw.student.id ?? 0),
          name: String(raw.student.name ?? ""),
          rollNo: raw.student.rollNo ?? null,
        }
      : null,
  };
}

function groupOrderItems(lines: OrderItemData[]): Record<string, OrderItemData[]> {
  return lines.reduce(
    (acc, line) => {
      const key = line.studentId
        ? `Student ${line.studentId}`
        : line.instructorId
          ? `CI:${line.instructorId}`
          : "Order items";
      acc[key] = acc[key] ?? [];
      acc[key].push(line);
      return acc;
    },
    {} as Record<string, OrderItemData[]>,
  );
}

// ---------------------------------------------------------------------------
// Invoice preview normalizers (shared — used by franchisee + admin)
// ---------------------------------------------------------------------------

function normalizeInvoicePreviewLineItem(raw: unknown): InvoicePreviewLineItem {
  const r = raw as Record<string, unknown>;
  return {
    name: String(r?.name ?? ""),
    quantity: Number(r?.quantity ?? 0),
  };
}

function normalizeTshirtBreakdownEntry(raw: unknown): {
  tshirtItemId: number | null;
  tshirtName: string | null;
  quantity: number;
} {
  const r = raw as Record<string, unknown>;
  return {
    tshirtItemId:
      r?.tshirtItemId == null ? null : Number(r.tshirtItemId),
    tshirtName: r?.tshirtName == null ? null : String(r.tshirtName),
    quantity: Number(r?.quantity ?? 0),
  };
}

function normalizeStartingKitGroupPreview(raw: unknown): StartingKitGroupPreview | null {
  const r = raw as Record<string, unknown>;
  if (r == null || typeof r !== "object") return null;
  if (!Array.isArray(r.items)) return null;
  if (
    r.streamId == null ||
    r.streamName == null ||
    r.quantity == null ||
    r.kitUnit == null ||
    r.royaltyUnit == null
  ) {
    return null;
  }
  return {
    streamId: Number(r.streamId),
    streamName: String(r.streamName),
    quantity: Number(r.quantity),
    kitUnit: Number(r.kitUnit),
    royaltyUnit: Number(r.royaltyUnit),
    tshirtBreakdown: Array.isArray(r.tshirtBreakdown)
      ? (r.tshirtBreakdown as unknown[]).map(normalizeTshirtBreakdownEntry)
      : [],
    items: (r.items as unknown[]).map(normalizeInvoicePreviewLineItem),
  };
}

function normalizeStudentGroupPreviewItem(raw: unknown): StudentGroupPreviewItem {
  const r = raw as Record<string, unknown>;
  const it = r?.itemType;
  const itemType =
    it === "LEVEL" || it === "KIT" || it === "FEE" ? it : undefined;
  return {
    name: String(r?.name ?? ""),
    quantity: Number(r?.quantity ?? 0),
    inventoryItemId:
      r?.inventoryItemId != null ? Number(r.inventoryItemId) : undefined,
    itemType,
  };
}

function normalizeStudentGroupPreview(raw: unknown): StudentGroupPreview | null {
  const r = raw as Record<string, unknown>;
  if (r == null || typeof r !== "object") return null;
  if (r.studentId == null || !Array.isArray(r.items)) return null;
  return {
    studentId: Number(r.studentId),
    studentName: String(r.studentName ?? ""),
    levelId: Number(r.levelId ?? 0),
    levelName: String(r.levelName ?? ""),
    levelCode: String(r.levelCode ?? ""),
    isFirstLevel: Boolean(r.isFirstLevel ?? false),
    durationInMonths: Number(r.durationInMonths ?? 0),
    royalty: Number(r.royalty ?? 0),
    materialCost: Number(r.materialCost ?? 0),
    kitCost: Number(r.kitCost ?? 0),
    totalPrice: Number(r.totalPrice ?? 0),
    items: (r.items as unknown[]).map(normalizeStudentGroupPreviewItem),
  };
}

function normalizeInstructorGroupPreview(raw: unknown): InstructorGroupPreview | null {
  const r = raw as Record<string, unknown>;
  if (r == null || typeof r !== "object") return null;
  if (!Array.isArray(r.items)) return null;
  if (r.instructorId == null || r.name == null || r.instructorCode == null) return null;
  return {
    instructorId: Number(r.instructorId),
    name: String(r.name),
    instructorCode: String(r.instructorCode),
    items: (r.items as unknown[]).map(normalizeInvoicePreviewLineItem),
  };
}

function normalizeCustomGroupPreview(raw: unknown): CustomGroupPreview | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const items: CustomGroupPreviewItem[] = Array.isArray(r.items)
    ? (r.items as Record<string, unknown>[]).map((it) => ({
        inventoryItemId: Number(it?.inventoryItemId ?? 0),
        name: String(it?.name ?? ""),
        quantity: Number(it?.quantity ?? 0),
        unitPrice: Number(it?.unitPrice ?? 0),
        totalPrice: Number(it?.totalPrice ?? 0),
      }))
    : [];
  return {
    studentId: Number(r?.studentId ?? 0),
    studentName: String(r?.studentName ?? ""),
    levelId: Number(r?.levelId ?? 0),
    items,
    totalPrice: Number(
      r?.totalPrice ?? items.reduce((sum, it) => sum + it.totalPrice, 0),
    ),
  };
}

/** Normalize unified / stored preview payload (API or `order.invoicePreview` JSON). */
export function parseInvoicePreviewPayload(data: unknown): InvoicePreview {
  if (data == null || typeof data !== "object") {
    return {
      franchiseId: "",
      programId: 0,
      levelId: 0,
      isFirstLevel: false,
      students: [],
      lines: [],
      totalAmount: 0,
      startingKitGroups: [],
      instructorGroups: [],
    };
  }
  const d = data as Record<string, unknown>;

  const studentGroups: StudentGroupPreview[] = Array.isArray(d?.studentGroups)
    ? (d.studentGroups as unknown[])
        .map(normalizeStudentGroupPreview)
        .filter((g): g is StudentGroupPreview => g != null)
    : [];

  const studentsFromGroups: StudentBreakdown[] = studentGroups.map((g) => ({
    studentId: g.studentId,
    studentName: g.studentName,
    levelId: g.levelId,
    levelName: g.levelName,
    levelCode: g.levelCode,
    isFirstLevel: g.isFirstLevel,
    royalty: g.royalty,
    materialCost: g.materialCost,
    kitCost: g.kitCost,
    totalPrice: g.totalPrice,
    durationInMonths: g.durationInMonths,
  }));

  const studentsLegacy: StudentBreakdown[] = Array.isArray(d?.students)
    ? (d.students as Record<string, unknown>[]).map((s) => ({
        studentId: Number(s?.studentId ?? 0),
        studentName: String(s?.studentName ?? ""),
        levelId: Number(s?.levelId ?? 0),
        levelName: String(s?.levelName ?? ""),
        levelCode: String(s?.levelCode ?? ""),
        isFirstLevel: Boolean(s?.isFirstLevel ?? false),
        royalty: Number(s?.royalty ?? 0),
        materialCost: Number(s?.materialCost ?? 0),
        kitCost: Number(s?.kitCost ?? 0),
        totalPrice: Number(s?.totalPrice ?? 0),
        durationInMonths: Number(s?.durationInMonths ?? 0),
      }))
    : [];

  const students =
    studentsFromGroups.length > 0 ? studentsFromGroups : studentsLegacy;

  const firstGroup = studentGroups[0];
  const firstLegacy = studentsLegacy[0];

  return {
    franchiseId: String(d?.franchiseId ?? ""),
    programId: Number(d?.programId ?? 0),
    levelId: Number(
      d?.levelId ?? firstGroup?.levelId ?? firstLegacy?.levelId ?? 0,
    ),
    isFirstLevel: Boolean(
      d?.isFirstLevel ?? firstGroup?.isFirstLevel ?? firstLegacy?.isFirstLevel ?? false,
    ),
    totalAmount: Number(d?.totalAmount ?? 0),
    students,
    lines: Array.isArray(d?.lines)
      ? (d.lines as Record<string, unknown>[]).map((line) => ({
          code: String(line?.code ?? ""),
          description: String(line?.description ?? ""),
          quantity: Number(line?.quantity ?? 0),
          unitPrice: Number(line?.unitPrice ?? 0),
          totalPrice: Number(line?.totalPrice ?? 0),
          studentId: line?.studentId != null ? Number(line.studentId) : undefined,
          instructorId: line?.instructorId != null ? Number(line.instructorId) : undefined,
          inventoryItemId: line?.inventoryItemId != null ? Number(line.inventoryItemId) : undefined,
          itemType: (line?.itemType ?? undefined) as "KIT" | "FEE" | "LEVEL" | undefined,
        }))
      : [],
    studentGroups: studentGroups.length > 0 ? studentGroups : undefined,
    startingKitGroups: Array.isArray(d?.startingKitGroups)
      ? (d.startingKitGroups as unknown[])
          .map(normalizeStartingKitGroupPreview)
          .filter((g): g is StartingKitGroupPreview => g != null)
      : [],
    instructorGroups: Array.isArray(d?.instructorGroups)
      ? (d.instructorGroups as unknown[])
          .map(normalizeInstructorGroupPreview)
          .filter((g): g is InstructorGroupPreview => g != null)
      : [],
    customGroups: Array.isArray(d?.customGroups)
      ? (d.customGroups as unknown[])
          .map(normalizeCustomGroupPreview)
          .filter((g): g is CustomGroupPreview => g != null)
      : [],
  };
}

// ---------------------------------------------------------------------------
// Core order normalizer (shared — exported for use in franchisee + dispatch)
// ---------------------------------------------------------------------------

export function normalizeOrder(row: any): OrderData {
  const lineItems = Array.isArray(row?.orderItems)
    ? (row.orderItems as RawOrderLine[]).map(normalizeOrderLine)
    : [];
  const groupedItems = groupOrderItems(lineItems);
  const status =
    row?.status ??
    row?.franchiseeStatus ??
    row?.adminStatus ??
    OrderStatus.PENDING;

  // Compute derived counts from grouped items when available
  const groupedKeys = Object.keys(groupedItems);
  const derivedStudents = groupedKeys.length > 0
    ? groupedKeys.filter(k => !k.startsWith("CI:") && k !== "Order items").length
    : null;
  const derivedInstructors = groupedKeys.length > 0
    ? groupedKeys.filter(k => k.startsWith("CI:")).length
    : null;

  // ipa-new lists aggregate counts from invoice preview, dispatch, and lines.
  // Do not overwrite those with derived bucket counts (lines may omit studentId / instructorId).
  const totalStudents =
    row?.totalStudents !== undefined
      ? row.totalStudents == null
        ? null
        : Number(row.totalStudents)
      : derivedStudents;
  const totalInstructors =
    row?.totalInstructors !== undefined
      ? row.totalInstructors == null
        ? null
        : Number(row.totalInstructors)
      : derivedInstructors;

  return {
    id: Number(row?.id ?? 0),
    totalItems: Number(row?.totalItems ?? lineItems.length),
    totalStudents,
    totalInstructors,
    totalAmount: toCurrencyString(row?.totalAmount),
    subtotalAmount:
      row?.subtotalAmount != null ? toCurrencyString(row.subtotalAmount) : null,
    gstAmount:
      row?.gstAmount != null ? toCurrencyString(row.gstAmount) : null,
    isGstInclusive:
      row?.isGstInclusive != null ? Boolean(row.isGstInclusive) : undefined,
    status,
    adminStatus: row?.adminStatus ?? undefined,
    franchiseeStatus: row?.franchiseeStatus ?? undefined,
    paymentStatus: row?.paymentStatus ?? undefined,
    allocationStatus: row?.allocationStatus ?? undefined,
    fulfillmentStatus: row?.fulfillmentStatus ?? undefined,
    orderType: String(row?.orderType ?? ""),
    notes: row?.notes ?? null,
    createdAt: String(row?.createdAt ?? new Date().toISOString()),
    updatedAt: String(row?.updatedAt ?? row?.createdAt ?? new Date().toISOString()),
    referenceId: row?.referenceId ?? undefined,
    franchiseId: row?.franchiseId ?? undefined,
    franchiseeId: row?.franchiseeId ?? undefined,
    createdBy: row?.createdBy ?? undefined,
    updatedBy: row?.updatedBy ?? undefined,
    readyToShipAt: row?.readyToShipAt ?? null,
    backorderedAt: row?.backorderedAt ?? null,
    franchise: row?.franchise
      ? {
          id: row.franchise.id ?? row.franchiseId ?? "",
          name: String(row.franchise.name ?? ""),
          city: row.franchise.city ?? undefined,
        }
      : undefined,
    orderItems: groupedItems,
    lineItems,
    dcPdfPath: row?.dcPdfPath ?? row?.shipment?.dcPdfPath ?? null,
    shipment: row?.shipment
      ? {
          id: Number(row.shipment.id ?? 0),
          status: String(row.shipment.status ?? ""),
          trackingNumber: row.shipment.trackingNumber ?? null,
          carrier: row.shipment.carrier ?? null,
          dcPdfPath: row.shipment.dcPdfPath ?? null,
        }
      : null,
    payment:
      row?.payment != null
        ? (() => {
            const p = row.payment as Record<string, unknown>;
            return {
              id: Number(p.id),
              status: String(p.status),
              method: p.method != null ? String(p.method) : null,
              amount: Number(p.amount ?? 0),
              currency: String(p.currency ?? "INR"),
              paidAt: p.paidAt != null ? String(p.paidAt) : null,
              razorpayOrderId:
                p.razorpayOrderId != null ? String(p.razorpayOrderId) : undefined,
              razorpayPaymentId:
                p.razorpayPaymentId != null ? String(p.razorpayPaymentId) : undefined,
              bank: p.bank != null ? String(p.bank) : null,
              wallet: p.wallet != null ? String(p.wallet) : null,
              vpa: p.vpa != null ? String(p.vpa) : null,
              email: p.email != null ? String(p.email) : null,
              contact: p.contact != null ? String(p.contact) : null,
              fee: p.fee != null ? Number(p.fee) : null,
              tax: p.tax != null ? Number(p.tax) : null,
              gatewayFeeTaxAmount:
                p.gatewayFeeTaxAmount != null
                  ? Number(p.gatewayFeeTaxAmount)
                  : null,
              goodsGstAmount:
                p.goodsGstAmount != null ? Number(p.goodsGstAmount) : null,
              acquirerData: cloneAcquirerDataJson(p.acquirerData),
            };
          })()
        : null,
    paymentDetails:
      row?.paymentDetails != null
        ? row.paymentDetails
        : row?.payment != null &&
            ((row.payment as Record<string, unknown>).razorpayPaymentId != null ||
              (row.payment as Record<string, unknown>).acquirerData != null)
          ? paymentDetailsFromEmbeddedPayment(row.payment as Record<string, unknown>)
          : null,
    dispatchItems: Array.isArray(row?.dispatchItems)
      ? (row.dispatchItems as unknown[]).map(normalizeDispatchItem)
      : [],
    canCancel: Boolean(row?.canCancel ?? false),
    cancelBlockedReason:
      row?.cancelBlockedReason != null ? String(row.cancelBlockedReason) : null,
    invoicePreview:
      row?.invoicePreview != null && typeof row.invoicePreview === "object"
        ? parseInvoicePreviewPayload(row.invoicePreview)
        : null,
  };
}

function normalizeGroupedOrdersResult(result: any): GroupedOrdersResponse["result"] {
  const rawData = result?.data ?? {};
  return {
    data: Object.fromEntries(
      Object.entries(rawData).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.map(normalizeOrder) : [],
      ]),
    ),
    meta: {
      total: Number(result?.meta?.total ?? 0),
      page: Number(result?.meta?.page ?? 1),
      limit: Number(result?.meta?.limit ?? 20),
      totalPages: Number(result?.meta?.totalPages ?? 1),
      hasNextPage: Boolean(result?.meta?.hasNextPage ?? false),
      hasPreviousPage: Boolean(result?.meta?.hasPreviousPage ?? false),
    },
  };
}

// ---------------------------------------------------------------------------
// Admin API functions
// ---------------------------------------------------------------------------

export async function getAllOrdersAdmin(
  params?: AdminOrderListParams,
): Promise<GroupedOrdersResponse["result"]> {
  const response = await api.get("/admin/order/by-franchise", {
    params: compactRequestParams(
      params as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  return normalizeGroupedOrdersResult(unwrapData(response));
}

export async function getAdminOrdersFlat(params?: AdminOrderListParams) {
  const response = await api.get("/admin/order", {
    params: compactRequestParams(
      params as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  const result = unwrapData<unknown>(response);
  const normalized = normalizePaginatedResult<any>(result);
  return {
    rows: normalized.rows.map(normalizeOrder),
    total: normalized.total,
    page: normalized.page,
    limit: normalized.limit,
    totalPages: Math.max(1, Math.ceil(normalized.total / (normalized.limit || 20))),
  };
}

async function getOrdersByFranchise(): Promise<Record<string, OrderData[]>> {
  return (await getAllOrdersAdmin()).data;
}

export async function getOrderByIdAdmin(orderId: number): Promise<OrderData> {
  const response = await api.get(`/admin/order/${orderId}`);
  return normalizeOrder(unwrapData(response));
}

export async function markOrderPaidAdmin(orderId: number): Promise<OrderData> {
  await api.post(`/admin/order/${orderId}/pay`);
  return getOrderByIdAdmin(orderId);
}

export async function cancelOrderAdmin(
  orderId: number,
  options?: { refund?: boolean },
): Promise<OrderData> {
  await api.post(`/admin/order/${orderId}/cancel`, {
    refund: options?.refund === true,
  });
  return getOrderByIdAdmin(orderId);
}

export async function refreshOrderAllocationAdmin(
  orderId: number,
): Promise<RefreshOrderAllocationResult> {
  const response = await api.post(`/admin/order/${orderId}/refresh-allocation`);
  return unwrapData<RefreshOrderAllocationResult>(response);
}

function getDcPdfUrl(dcPdfPath: string): string {
  if (!dcPdfPath) return "";
  const baseUrl = api.defaults.baseURL || getApiBaseUrl();
  return `${baseUrl}/uploads/${dcPdfPath}`;
}

async function regenerateDcPdf(orderId: number): Promise<OrderData> {
  return getOrderByIdAdmin(orderId);
}

async function verifyOrderAdmin(
  orderId: number,
  action: "verify" | "ship" | "deliver" | "cancel" = "verify",
): Promise<OrderData> {
  const path =
    action === "verify"
      ? `/admin/fulfillment/order/${orderId}/verify`
      : action === "ship"
        ? `/admin/fulfillment/order/${orderId}/ship`
        : action === "deliver"
          ? `/admin/fulfillment/order/${orderId}/deliver`
          : `/admin/fulfillment/order/${orderId}/cancel`;
  await api.post(path);
  return getOrderByIdAdmin(orderId);
}
