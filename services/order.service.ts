import { api } from "@/lib/axios";
import { getApiBaseUrl } from "@/lib/api-utils";
import {
  compactRequestParams,
  normalizePaginatedResult,
  unwrapData,
} from "@/lib/unwrap-api";

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
  VERIFIED = "Verified",
  SHIPPED = "Shipped",
  SHIPPING = "Shipped",
  DELIVERED = "Delivered",
  CANCELLED = "Cancelled",
  READY_TO_SHIP = "Ready to ship",
  BACKORDERED = "Backordered",
  ALLOCATED = "Allocated",
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
  tax: number | null;
}

export interface ShipmentSummary {
  id: number;
  status: string;
  trackingNumber?: string | null;
  carrier?: string | null;
  dcPdfPath?: string | null;
}

export interface OrderData {
  id: number;
  totalItems?: number;
  totalStudents?: number;
  totalInstructors?: number;
  totalAmount: string | number;
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
    name: string;
    city?: string;
  };
  orderItems?: Record<string, OrderItemData[]>;
  lineItems?: OrderItemData[];
  dcPdfPath?: string | null;
  shipment?: ShipmentSummary | null;
  paymentDetails?: PaymentDetails | null;
}

export interface CreateOrderDto {
  studentIds: number[];
  notes?: string;
  paymentRecordId?: number;
}

export interface UpdateOrderDto {
  status?: OrderStatus | string;
  notes?: string;
}

export interface InvoiceLine {
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  studentId?: number;
  inventoryItemId?: number;
  itemType?: 'LEVEL' | 'KIT' | 'FEE';
}

export interface StudentBreakdown {
  studentId: number;
  studentName: string;
  levelId: number;
  levelName: string;
  isFirstLevel: boolean;
  royalty: number;
  materialCost: number;
  kitCost: number;
  totalPrice: number;
  durationInMonths: number;
}

export interface InvoicePreview {
  franchiseId: string;
  programId: number;
  levelId: number;
  isFirstLevel: boolean;
  students: StudentBreakdown[];
  lines: InvoiceLine[];
  totalAmount: number;
}

export interface InvoiceItem {
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

export interface FranchiseeOrderListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  status?: string;
  orderType?: string;
  paymentStatus?: string;
}

export interface AdminOrderListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  phase?: "orders" | "shipping";
  franchiseId?: string;
}

export interface InitiateOrderPaymentDto {
  studentIds: number[];
  notes?: string;
  totalAmount: number;
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

export interface CustomOrderItem {
  studentId: number;
  inventoryId: number;
  quantity: number;
}

export interface CreateCustomOrderDto {
  studentIds: number[];
  customItems: CustomOrderItem[];
  notes?: string;
}

export interface AvailableItem {
  id: number;
  name: string;
  description: string;
  categoryId: number;
  category?: {
    id: number;
    name: string;
    description: string;
  };
  price: number;
  isKitItem: boolean;
  defaultQuantity?: number;
}

export interface StudentAvailableItems {
  studentId: number;
  studentName: string;
  rollNo: string;
  levelId: number;
  levelName: string;
  programId: number;
  programName: string;
  levelItems: AvailableItem[];
  kitItems: AvailableItem[];
  allItems?: AvailableItem[];
}

export interface StudentOrderHistory {
  studentId: number;
  studentName: string;
  levelId: number;
  levelName: string;
  hasOrderedForLevel: boolean;
  orderCount: number;
  orders: Array<{
    orderId: number;
    orderStatus: OrderStatus | string;
    orderDate: string;
    inventoryId: number;
    inventoryName: string;
  }>;
}

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

function normalizeOrder(row: any): OrderData {
  const lineItems = Array.isArray(row?.orderItems)
    ? (row.orderItems as RawOrderLine[]).map(normalizeOrderLine)
    : [];
  const groupedItems = groupOrderItems(lineItems);
  const status =
    row?.status ??
    row?.franchiseeStatus ??
    row?.adminStatus ??
    OrderStatus.PENDING;

  return {
    id: Number(row?.id ?? 0),
    totalItems: Number(row?.totalItems ?? lineItems.length),
    totalStudents: Number(row?.totalStudents ?? 0),
    totalInstructors: Number(row?.totalInstructors ?? 0),
    totalAmount: toCurrencyString(row?.totalAmount),
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
    paymentDetails: row?.paymentDetails ?? null,
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

export async function createOrderFromPayload(
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
  const merged: FranchiseeOrderListParams = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 10_000,
    ...params,
  };
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

export async function updateFranchiseeOrder(
  _orderId: number,
  _updateData: UpdateOrderDto,
): Promise<OrderData> {
  throw new Error("updateFranchiseeOrder not supported in ipa-new");
}

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

export async function getOrdersByFranchise(): Promise<Record<string, OrderData[]>> {
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

export async function cancelOrderAdmin(orderId: number): Promise<OrderData> {
  await api.post(`/admin/order/${orderId}/cancel`);
  return getOrderByIdAdmin(orderId);
}

export function getDcPdfUrl(dcPdfPath: string): string {
  if (!dcPdfPath) return "";
  const baseUrl = api.defaults.baseURL || getApiBaseUrl();
  return `${baseUrl}/uploads/${dcPdfPath}`;
}

export async function regenerateDcPdf(orderId: number): Promise<OrderData> {
  return getOrderByIdAdmin(orderId);
}

export async function updateOrderAdmin(
  _orderId: number,
  _updateData: UpdateOrderDto,
): Promise<OrderData> {
  throw new Error("updateOrderAdmin not supported in ipa-new");
}

export async function verifyOrderAdmin(
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

export async function previewOrderInvoice(
  studentIds: number[],
): Promise<InvoicePreview> {
  const response = await api.post("/order/preview-invoice", { studentIds });
  const data = unwrapData<any>(response);
  return {
    franchiseId: String(data?.franchiseId ?? ""),
    programId: Number(data?.programId ?? 0),
    levelId: Number(data?.levelId ?? 0),
    isFirstLevel: Boolean(data?.isFirstLevel ?? false),
    totalAmount: Number(data?.totalAmount ?? 0),
    students: Array.isArray(data?.students)
      ? data.students.map((s: any) => ({
          studentId: Number(s?.studentId ?? 0),
          studentName: String(s?.studentName ?? ""),
          levelId: Number(s?.levelId ?? 0),
          levelName: String(s?.levelName ?? ""),
          isFirstLevel: Boolean(s?.isFirstLevel ?? false),
          royalty: Number(s?.royalty ?? 0),
          materialCost: Number(s?.materialCost ?? 0),
          kitCost: Number(s?.kitCost ?? 0),
          totalPrice: Number(s?.totalPrice ?? 0),
          durationInMonths: Number(s?.durationInMonths ?? 0),
        }))
      : [],
    lines: Array.isArray(data?.lines)
      ? data.lines.map((line: any) => ({
          code: String(line?.code ?? ""),
          description: String(line?.description ?? ""),
          quantity: Number(line?.quantity ?? 0),
          unitPrice: Number(line?.unitPrice ?? 0),
          totalPrice: Number(line?.totalPrice ?? 0),
          studentId: line?.studentId != null ? Number(line.studentId) : undefined,
          inventoryItemId: line?.inventoryItemId != null ? Number(line.inventoryItemId) : undefined,
          itemType: line?.itemType ?? undefined,
        }))
      : [],
  };
}

export async function getInvoiceDetails(
  studentIds: number[],
): Promise<InvoiceItem[]> {
  const preview = await previewOrderInvoice(studentIds);
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
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
      studentIds: paymentData.studentIds,
      notes: paymentData.notes,
      isZeroAmount: true,
    };
  }

  // Non-zero: initiate Razorpay payment BEFORE creating the order.
  // The order is created (as PAID) only after verifyOrderPayment succeeds.
  const response = await api.post("/billing/payment/initiate", {
    type: "ORDER_PAYMENT",
    amount: paymentData.totalAmount,
    acquirerData: { studentIds: paymentData.studentIds },
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
    key:
      billing.keyId ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY ||
      "",
    studentIds: paymentData.studentIds,
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

export async function initiateCustomOrderPayment(
  _orderData: CreateCustomOrderDto,
): Promise<OrderPaymentResponse> {
  throw new Error("Custom orders are disabled in this cutover");
}

export async function getAvailableItems(
  _studentIds: number[],
): Promise<StudentAvailableItems[]> {
  return [];
}

export async function getStudentOrderHistory(
  _studentId: number,
): Promise<StudentOrderHistory> {
  throw new Error("Student order history not available in ipa-new");
}

export interface CIMaterialsPreview {
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

export async function getCIMaterialsPreview(
  _ciId: number,
): Promise<CIMaterialsPreview> {
  throw new Error("CI materials preview not available in ipa-new");
}

export async function createCIMaterialsOrder(_ciId: number): Promise<OrderData> {
  throw new Error("CI materials order not available in ipa-new");
}

export async function previewCIOrderInvoice(
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

export async function initiateCIOrderPayment(data: {
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
