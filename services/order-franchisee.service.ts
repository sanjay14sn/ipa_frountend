/**
 * order-franchisee.service.ts
 *
 * Franchisee-side order functions: creating orders, previewing invoices,
 * handling Razorpay payments, and CI (course-instructor) orders.
 * Shared types and normalizers live in order-admin.service.ts.
 */

import { api } from "@/lib/axios";
import {
  compactRequestParams,
  normalizePaginatedResult,
  unwrapData,
} from "@/lib/unwrap-api";
import { withProgramScope } from "@/services/_scope";
import { RAZORPAY_KEY_ID } from "@/lib/config";
import {
  type OrderData,
  type InvoicePreview,
  normalizeOrder,
  parseInvoicePreviewPayload,
} from "@/services/order-admin.service";

// Re-export shared types so consumers can import from this file too.
export type { OrderData, InvoicePreview };

// ---------------------------------------------------------------------------
// Franchisee-specific types
// ---------------------------------------------------------------------------

export interface StartingKitItem {
  streamId: number;
  quantity: number;
  tshirtItemId: number | null;
}

export interface CreateOrderDto {
  studentIds?: number[];
  instructorIds?: number[];
  startingKitItems?: StartingKitItem[];
  customItems?: CustomMaterialLine[];
  /** Franchise-kit items folded into the same unified order (one checkout). */
  franchiseKitItems?: FranchiseKitOrderItem[];
  /** Program scope the franchise-kit items belong to (kits are per-program). */
  franchiseKitProgramId?: number;
  notes?: string;
  paymentRecordId?: number;
}

interface UpdateOrderDto {
  status?: string;
  notes?: string;
}

export interface FranchiseeOrderListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  status?: string;
  orderType?: string;
  paymentStatus?: string;
  /** Active program scope. Auto-injected from the scope store via withProgramScope. */
  programId?: number;
  /** Legacy: agreement-driven scope. Backend resolves to programId. */
  agreementId?: number;
}

export interface InitiateOrderPaymentDto {
  studentIds?: number[];
  instructorIds?: number[];
  startingKitItems?: StartingKitItem[];
  customItems?: CustomMaterialLine[];
  franchiseKitItems?: FranchiseKitOrderItem[];
  franchiseKitProgramId?: number;
  notes?: string;
  paymentRecordId?: number;
  totalAmount: number;
  /**
   * GST (18%) portion of `totalAmount`, taken from `previewUnified.gstAmount`.
   * Forwarded to the backend at initiate-time so the payment row gets
   * `goodsGstAmount` populated (the order doesn't exist yet — it's created
   * after Razorpay verify, so the backend can't look it up).
   */
  goodsGstAmount?: number;
}

export interface OrderPaymentResponse {
  orderId: string;
  businessOrderId: number;
  paymentRecordId?: number;
  amount: number;
  currency: string;
  franchiseId: string | number;
  franchiseName: string;
  paymentType: string;
  key: string;
  studentIds: number[];
  instructorIds?: number[];
  startingKitItems?: StartingKitItem[];
  customItems?: CustomMaterialLine[];
  franchiseKitItems?: FranchiseKitOrderItem[];
  franchiseKitProgramId?: number;
  notes?: string;
  isZeroAmount?: boolean;
}

export interface VerifyOrderPaymentDto {
  paymentId?: string;
  orderId?: string;
  signature?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
}

export interface VerifyOrderPaymentResponse {
  message: string;
  status: string;
  order?: OrderData;
}

/** A custom (re-order) inventory line attached to a student, folded into the
 * unified order. Priced off the inventory item's unitPrice with no GST. */
export interface CustomMaterialLine {
  studentId: number;
  inventoryItemId: number;
  quantity: number;
}

/** An inventory item a student may custom-order: their level-template items +
 * the program kit items. Shape mirrors the backend `/order/available-items`. */
export interface AvailableInventoryItem {
  inventoryItemId: number;
  name: string;
  sku: string | null;
  unitPrice: number;
  availableStock: number;
  isKitItem: boolean;
  isLevelItem: boolean;
}

export interface StudentAvailableItems {
  studentId: number;
  studentName: string;
  levelId: number;
  items: AvailableInventoryItem[];
}

interface StudentOrderHistory {
  studentId: number;
  studentName: string;
  levelId: number;
  levelName: string;
  hasOrderedForLevel: boolean;
  orderCount: number;
  orders: Array<{
    orderId: number;
    orderStatus: string;
    orderDate: string;
    inventoryId: number;
    inventoryName: string;
  }>;
}

interface InvoiceItem {
  studentId: number;
  studentName: string;
  rollNo: string;
  levelId: number;
  levelName: string;
  programId: number;
  isFirstLevel: boolean;
  materialCost: number;
  kitCost?: number;
  royalty: number;
  durationInMonths: number;
  totalPrice: number;
  inventoryItems: Array<{
    id: number;
    name: string;
  }>;
}

interface CIMaterialsPreview {
  ciId: number;
  ciName: string;
  trainingLevel: {
    id: number;
    name: string;
    description?: string;
  };
  inventoryItems: Array<{
    id: number;
    name: string;
    description?: string;
    quantity: number;
    availableQuantity: number;
    price: number;
  }>;
  hasExistingOrder: boolean;
  totalAmount: number;
}

// ---------------------------------------------------------------------------
// Franchisee API functions
// ---------------------------------------------------------------------------

async function createOrderFromPayload(
  payload: CreateOrderDto,
): Promise<OrderData> {
  const response = await api.post("/order", payload);
  return normalizeOrder(unwrapData(response));
}

export async function createOrder(orderData: CreateOrderDto): Promise<OrderData> {
  return createOrderFromPayload(orderData);
}

export async function getFranchiseeOrders(
  params?: FranchiseeOrderListParams,
): Promise<OrderData[]> {
  const merged: FranchiseeOrderListParams = withProgramScope({
    page: params?.page ?? 1,
    limit: params?.limit ?? 100,
    ...params,
  });
  const response = await api.get("/order", {
    params: compactRequestParams(
      merged as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  const result = unwrapData<unknown>(response);
  const normalized = normalizePaginatedResult<any>(result);
  return Array.isArray(normalized.rows) ? normalized.rows.map(normalizeOrder) : [];
}

export async function getOrderById(orderId: number): Promise<OrderData> {
  const response = await api.get(`/order/${orderId}`);
  return normalizeOrder(unwrapData(response));
}

export async function cancelOrderFranchisee(orderId: number): Promise<OrderData> {
  const response = await api.post(`/order/${orderId}/cancel`);
  return normalizeOrder(unwrapData(response));
}

export async function previewOrderInvoice(
  dto: Pick<
    CreateOrderDto,
    | "studentIds"
    | "instructorIds"
    | "startingKitItems"
    | "customItems"
    | "franchiseKitItems"
    | "franchiseKitProgramId"
  > & { franchiseId?: string | number },
): Promise<InvoicePreview> {
  const body: Record<string, unknown> = {};
  if (dto.studentIds != null && dto.studentIds.length > 0) {
    body.studentIds = dto.studentIds;
  }
  if (dto.instructorIds != null && dto.instructorIds.length > 0) {
    body.instructorIds = dto.instructorIds;
  }
  if (dto.startingKitItems != null && dto.startingKitItems.length > 0) {
    body.startingKitItems = dto.startingKitItems;
  }
  if (dto.customItems != null && dto.customItems.length > 0) {
    body.customItems = dto.customItems;
  }
  if (dto.franchiseKitItems != null && dto.franchiseKitItems.length > 0) {
    body.franchiseKitItems = dto.franchiseKitItems;
    if (dto.franchiseKitProgramId != null) {
      body.franchiseKitProgramId = dto.franchiseKitProgramId;
    }
  }
  if (dto.franchiseId != null && dto.franchiseId !== "") {
    body.franchiseId = String(dto.franchiseId);
  }
  const response = await api.post("/order/preview-invoice", body);
  const data = unwrapData<any>(response);
  return parseInvoicePreviewPayload(data);
}

/**
 * Fetches the inventory items each student may custom-order — their
 * level-template items plus the program kit items — with live prices and
 * stock. Backs the Custom Materials picker. Mirrors `/order/available-items`.
 */
export async function getAvailableItemsForStudents(
  studentIds: number[],
): Promise<StudentAvailableItems[]> {
  if (studentIds.length === 0) return [];
  const response = await api.post("/order/available-items", { studentIds });
  return unwrapData<StudentAvailableItems[]>(response) ?? [];
}

async function getInvoiceDetails(
  studentIds: number[],
): Promise<InvoiceItem[]> {
  const preview = await previewOrderInvoice({ studentIds });
  if (preview.studentGroups != null && preview.studentGroups.length > 0) {
    return preview.studentGroups.map((g) => ({
      studentId: g.studentId,
      studentName: g.studentName,
      rollNo: "",
      levelId: g.levelId,
      levelName: g.levelName,
      programId: preview.programId,
      isFirstLevel: g.isFirstLevel,
      materialCost: g.materialCost,
      kitCost: g.kitCost,
      royalty: g.royalty,
      durationInMonths: g.durationInMonths,
      totalPrice: g.totalPrice,
      inventoryItems: g.items
        .filter((it) => it.itemType === "LEVEL" || it.itemType === "KIT")
        .map((it) => ({
          id: it.inventoryItemId ?? 0,
          name: it.name,
        }))
        .filter((it) => it.id > 0),
    }));
  }
  return preview.lines.map((line, index) => ({
    studentId: studentIds[index] ?? studentIds[0] ?? 0,
    studentName: line.description,
    rollNo: "",
    levelId: preview.levelId,
    levelName: "",
    programId: preview.programId,
    isFirstLevel: preview.isFirstLevel,
    materialCost: line.code === "PROGRAM_FEES" ? line.totalPrice : 0,
    kitCost: line.code === "KIT" ? line.totalPrice : 0,
    royalty: 0,
    durationInMonths: 0,
    totalPrice: line.totalPrice,
    inventoryItems: [],
  }));
}

export async function initiateOrderPayment(
  paymentData: InitiateOrderPaymentDto,
): Promise<OrderPaymentResponse> {
  // Zero-amount: create the FREE order immediately — no Razorpay involved
  if (paymentData.totalAmount <= 0) {
    const createdOrder = await createOrder({
      studentIds: paymentData.studentIds,
      instructorIds: paymentData.instructorIds,
      startingKitItems: paymentData.startingKitItems,
      customItems: paymentData.customItems,
      franchiseKitItems: paymentData.franchiseKitItems,
      franchiseKitProgramId: paymentData.franchiseKitProgramId,
      notes: paymentData.notes,
    });
    return {
      orderId: "",
      businessOrderId: createdOrder.id,
      amount: 0,
      currency: "INR",
      franchiseId: createdOrder.franchiseId ?? "",
      franchiseName: createdOrder.franchise?.name ?? "",
      paymentType: "ORDER_PAYMENT",
      key: RAZORPAY_KEY_ID,
      studentIds: paymentData.studentIds ?? [],
      instructorIds: paymentData.instructorIds,
      startingKitItems: paymentData.startingKitItems,
      customItems: paymentData.customItems,
      franchiseKitItems: paymentData.franchiseKitItems,
      franchiseKitProgramId: paymentData.franchiseKitProgramId,
      notes: paymentData.notes,
      isZeroAmount: true,
    };
  }

  // Non-zero: initiate Razorpay payment BEFORE creating the order.
  // The order is created (as PAID) only after verifyOrderPayment succeeds.
  const response = await api.post("/billing/payment/initiate", {
    type: "ORDER_PAYMENT",
    amount: paymentData.totalAmount,
    // `goodsGstAmount` is the GST portion of the total; sent so the payment
    // row records it (the order doesn't exist at this point, so the server
    // can't look it up like agreement/receivable flows do).
    goodsGstAmount: paymentData.goodsGstAmount,
    acquirerData: {
      studentIds: paymentData.studentIds,
      instructorIds: paymentData.instructorIds,
      startingKitItems: paymentData.startingKitItems,
      customItems: paymentData.customItems,
      franchiseKitItems: paymentData.franchiseKitItems,
      franchiseKitProgramId: paymentData.franchiseKitProgramId,
      // Carried so server-side order recovery (orphan-payment completion)
      // can rebuild the full CreateOrderDto from the payment row alone.
      notes: paymentData.notes,
    },
  });
  const billing = unwrapData<{
    razorpayOrderId: string;
    paymentId: number;
    amount: number;
    keyId?: string;
  }>(response);

  return {
    orderId: billing.razorpayOrderId,
    businessOrderId: 0, // order not yet created; created after payment success
    paymentRecordId: Number(billing.paymentId ?? 0),
    amount: Number(billing.amount ?? paymentData.totalAmount),
    currency: "INR",
    franchiseId: "",
    franchiseName: "",
    paymentType: "ORDER_PAYMENT",
    key: billing.keyId || RAZORPAY_KEY_ID,
    studentIds: paymentData.studentIds ?? [],
    instructorIds: paymentData.instructorIds,
    startingKitItems: paymentData.startingKitItems,
    customItems: paymentData.customItems,
    franchiseKitItems: paymentData.franchiseKitItems,
    franchiseKitProgramId: paymentData.franchiseKitProgramId,
    notes: paymentData.notes,
    isZeroAmount: false,
  };
}

export async function verifyOrderPayment(
  verifyData: VerifyOrderPaymentDto,
): Promise<VerifyOrderPaymentResponse> {
  const razorpayOrderId = verifyData.razorpayOrderId ?? verifyData.orderId ?? "";
  const razorpayPaymentId =
    verifyData.razorpayPaymentId ?? verifyData.paymentId ?? "";
  const signature = verifyData.razorpaySignature ?? verifyData.signature ?? "";

  const response = await api.post("/billing/payment/verify", {
    razorpayOrderId,
    razorpayPaymentId,
    signature,
  });
  const data = unwrapData<{ ok?: boolean }>(response);
  return {
    message: data?.ok ? "ok" : "verified",
    status: "success",
  };
}

// ---------------------------------------------------------------------------
// Franchise kit re-orders (paid, pay-first like the unified flow)
// ---------------------------------------------------------------------------

export interface FranchiseKitOrderItem {
  inventoryItemId: number;
  quantity: number;
}

export interface FranchiseKitOrderPreview {
  franchiseId: string;
  lines: Array<{
    inventoryItemId: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  subtotalAmount: number;
  gstAmount: number;
  isGstInclusive: boolean;
}

export async function previewFranchiseKitOrder(
  programId: number,
  items: FranchiseKitOrderItem[],
): Promise<FranchiseKitOrderPreview> {
  const response = await api.post(
    `/order/programs/${programId}/franchise-kit/preview-invoice`,
    { items },
  );
  return unwrapData(response) as FranchiseKitOrderPreview;
}

export async function createFranchiseKitOrder(input: {
  programId: number;
  items: FranchiseKitOrderItem[];
  notes?: string;
  paymentRecordId?: number;
}): Promise<OrderData> {
  const { programId, ...body } = input;
  const response = await api.post(
    `/order/programs/${programId}/franchise-kit`,
    body,
  );
  return normalizeOrder(unwrapData(response));
}

/**
 * Pay-first initiation for a franchise kit re-order. Zero-amount totals
 * create the FREE order immediately; otherwise a Razorpay payment is
 * initiated and the order is created (PAID) after verification, passing the
 * verified `paymentRecordId` to `createFranchiseKitOrder`. Kit lines are
 * GST-exempt, so `goodsGstAmount` is always 0.
 */
export async function initiateFranchiseKitPayment(input: {
  programId: number;
  items: FranchiseKitOrderItem[];
  totalAmount: number;
  notes?: string;
}): Promise<OrderPaymentResponse> {
  if (input.totalAmount <= 0) {
    const createdOrder = await createFranchiseKitOrder({
      programId: input.programId,
      items: input.items,
      notes: input.notes,
    });
    return {
      orderId: "",
      businessOrderId: createdOrder.id,
      amount: 0,
      currency: "INR",
      franchiseId: createdOrder.franchiseId ?? "",
      franchiseName: createdOrder.franchise?.name ?? "",
      paymentType: "ORDER_PAYMENT",
      key: RAZORPAY_KEY_ID,
      studentIds: [],
      notes: input.notes,
      isZeroAmount: true,
    };
  }

  const response = await api.post("/billing/payment/initiate", {
    type: "ORDER_PAYMENT",
    amount: input.totalAmount,
    goodsGstAmount: 0,
    acquirerData: {
      franchiseKitItems: input.items,
    },
  });
  const billing = unwrapData<{
    razorpayOrderId: string;
    paymentId: number;
    amount: number;
    keyId?: string;
  }>(response);

  return {
    orderId: billing.razorpayOrderId,
    businessOrderId: 0,
    paymentRecordId: Number(billing.paymentId ?? 0),
    amount: Number(billing.amount ?? input.totalAmount),
    currency: "INR",
    franchiseId: "",
    franchiseName: "",
    paymentType: "ORDER_PAYMENT",
    key: billing.keyId || RAZORPAY_KEY_ID,
    studentIds: [],
    notes: input.notes,
    isZeroAmount: false,
  };
}

export async function abandonOrderPayment(input: {
  paymentId?: number;
  razorpayOrderId?: string;
  note?: string;
}) {
  const response = await api.post("/billing/payment/abandon", {
    paymentId: input.paymentId,
    razorpayOrderId: input.razorpayOrderId,
    note: input.note,
  });
  return unwrapData(response);
}

// ---------------------------------------------------------------------------
// CI (Course Instructor) order functions
// ---------------------------------------------------------------------------

async function previewCIOrderInvoice(
  instructorIds: number[],
): Promise<InvoicePreview> {
  const response = await api.post("/order/ci/preview-invoice", { instructorIds });
  const data = unwrapData<any>(response);
  return {
    franchiseId: String(data?.franchiseId ?? ""),
    programId: 0,
    levelId: 0,
    isFirstLevel: false,
    totalAmount: Number(data?.totalAmount ?? 0),
    students: [],
    lines: Array.isArray(data?.lines)
      ? data.lines.map((line: any) => ({
          code: String(line?.code ?? ""),
          description: String(line?.description ?? ""),
          quantity: Number(line?.quantity ?? 0),
          unitPrice: Number(line?.unitPrice ?? 0),
          totalPrice: Number(line?.totalPrice ?? 0),
        }))
      : [],
  };
}

async function initiateCIOrderPayment(data: {
  instructorIds: number[];
  notes?: string;
}): Promise<OrderPaymentResponse> {
  const response = await api.post("/order/ci", {
    instructorIds: data.instructorIds,
    notes: data.notes,
  });
  const created = normalizeOrder(unwrapData(response));
  return {
    orderId: "",
    businessOrderId: created.id,
    amount: 0,
    currency: "INR",
    franchiseId: created.franchiseId ?? "",
    franchiseName: created.franchise?.name ?? "",
    paymentType: "ORDER_PAYMENT",
    key: "",
    studentIds: [],
    notes: data.notes,
    isZeroAmount: true,
  };
}
