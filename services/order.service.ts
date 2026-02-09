

export interface Response {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
}

export enum OrderStatus {
  PENDING = "Pending",
  VERIFIED = "Verified",
  SHIPPING = "Shipping",
  DELIVERED = "Delivered",
  CANCELLED = "Cancelled",
}

export interface OrderItemData {
  id: number;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  inventory: {
    id: number;
    name: string;
  };
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

export interface OrderData {
  id: number;
  totalItems?: number;
  totalStudents?: number;
  totalInstructors?: number;
  totalAmount: string | number;
  status: OrderStatus;
  orderType: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Extended fields (may not be present in list view)
  orderNumber?: string;
  referenceId?: string;
  franchiseId?: string | number; // Support both string (new format) and number (legacy)
  createdBy?: number;
  city?: string;
  phone?: string;
  updatedBy?: number;
  franchise?: {
    id: string | number; // Support both string (new format) and number (legacy)
    name: string;
  };
  // Detailed view: order items grouped by student/instructor
  orderItems?: Record<string, OrderItemData[]>;
  // DC PDF path for shipping orders
  dcPdfPath?: string | null;
  // Payment details
  paymentDetails?: PaymentDetails | null;
}

export interface CreateOrderDto {
  studentIds: number[];
  notes?: string;
}

export interface UpdateOrderDto {
  status?: OrderStatus;
  notes?: string;
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

export interface InvoiceResponse extends Response {
  result: InvoiceItem[];
}

export interface OrdersResponse extends Response {
  result: OrderData[];
}

export interface SingleOrderResponse extends Response {
  result: OrderData;
}

import { api } from "@/lib/axios";
import { getApiBaseUrl } from "@/lib/api-utils";

export async function createOrder(
  orderData: CreateOrderDto
): Promise<OrderData> {
  const response = await api.post<SingleOrderResponse>("/orders", orderData);
  return response.data.result;
}

export async function getFranchiseeOrders(): Promise<OrderData[]> {
  const response = await api.get<OrdersResponse>("/orders/franchise");
  return response.data.result;
}

export async function getOrderById(orderId: number): Promise<OrderData> {
  const response = await api.get<SingleOrderResponse>(
    `/orders/franchise/${orderId}`
  );
  return response.data.result;
}

export async function updateFranchiseeOrder(
  orderId: number,
  updateData: UpdateOrderDto
): Promise<OrderData> {
  const response = await api.patch<SingleOrderResponse>(
    `/orders/franchise/${orderId}`,
    updateData
  );
  return response.data.result;
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

export async function getAllOrdersAdmin(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: string;
  sortOrder?: string;
}): Promise<GroupedOrdersResponse["result"]> {
  const response = await api.get<GroupedOrdersResponse>("/orders/admin", {
    params,
  });
  return response.data.result;
}

export async function getOrdersByFranchise(): Promise<any> {
  const response = await api.get("/orders/admin/by-franchise");
  return response.data.result;
}

export async function getOrderByIdAdmin(orderId: number): Promise<OrderData> {
  const response = await api.get<SingleOrderResponse>(
    `/orders/admin/${orderId}`
  );
  return response.data.result;
}

export function getDcPdfUrl(dcPdfPath: string): string {
  if (!dcPdfPath) return "";
  // dcPdfPath is stored as "delivery-challans/filename.pdf"
  // Backend serves static files at /uploads/ prefix
  const baseUrl = api.defaults.baseURL || getApiBaseUrl();
  return `${baseUrl}/uploads/${dcPdfPath}`;
}

export async function regenerateDcPdf(orderId: number): Promise<OrderData> {
  const response = await api.post<SingleOrderResponse>(
    `/orders/admin/${orderId}/regenerate-dc`,
    {}
  );
  return response.data.result;
}

export async function updateOrderAdmin(
  orderId: number,
  updateData: UpdateOrderDto
): Promise<OrderData> {
  const response = await api.patch<SingleOrderResponse>(
    `/orders/admin/${orderId}`,
    updateData
  );
  return response.data.result;
}

export async function verifyOrderAdmin(
  orderId: number,
  status: string = "verify"
): Promise<OrderData> {
  const response = await api.patch<SingleOrderResponse>(
    `/orders/admin/${orderId}/${status}`
  );
  return response.data.result;
}

// Get invoice details
export async function getInvoiceDetails(
  studentIds: number[]
): Promise<InvoiceItem[]> {
  const response = await api.post<InvoiceResponse>("/orders/invoice", {
    studentIds,
  });
  return response.data.result;
}

// Payment related interfaces and functions
export interface InitiateOrderPaymentDto {
  studentIds: number[];
  notes?: string;
}

export interface OrderPaymentResponse {
  orderId: string;
  amount: number;
  currency: string;
  franchiseId: number;
  franchiseName: string;
  paymentType: string;
  key: string;
  studentIds: number[];
  customItems?: CustomOrderItem[];
  notes?: string;
  isZeroAmount?: boolean;
}

export interface VerifyOrderPaymentDto {
  paymentId: string;
  orderId: string;
  signature: string;
}

export interface VerifyOrderPaymentResponse {
  message: string;
  status: string;
  order: OrderData;
}

export interface OrderPaymentInitResponse extends Response {
  result: OrderPaymentResponse;
}

export interface OrderPaymentVerifyResponse extends Response {
  result: VerifyOrderPaymentResponse;
}

// Initiate order payment
export async function initiateOrderPayment(
  paymentData: InitiateOrderPaymentDto
): Promise<OrderPaymentResponse> {
  const response = await api.post<OrderPaymentInitResponse>(
    "/orders/payment/initiate",
    paymentData
  );
  return response.data.result;
}

// Verify order payment
export async function verifyOrderPayment(
  verifyData: VerifyOrderPaymentDto
): Promise<VerifyOrderPaymentResponse> {
  const response = await api.post<OrderPaymentVerifyResponse>(
    "/orders/payment/verify",
    verifyData
  );
  return response.data.result;
}

// Custom order interfaces and functions
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

export interface AvailableItemsResponse extends Response {
  result: StudentAvailableItems[];
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
    orderStatus: OrderStatus;
    orderDate: string;
    inventoryId: number;
    inventoryName: string;
  }>;
}

export interface StudentOrderHistoryResponse extends Response {
  result: StudentOrderHistory;
}

// Initiate custom order payment
export async function initiateCustomOrderPayment(
  orderData: CreateCustomOrderDto
): Promise<OrderPaymentResponse> {
  const response = await api.post<OrderPaymentInitResponse>(
    "/orders/custom/payment/initiate",
    orderData
  );
  return response.data.result;
}

// Get available items for custom order
export async function getAvailableItems(
  studentIds: number[]
): Promise<StudentAvailableItems[]> {
  const response = await api.post<AvailableItemsResponse>(
    "/orders/available-items",
    { studentIds }
  );
  return response.data.result;
}

// Get student order history for their level
export async function getStudentOrderHistory(
  studentId: number
): Promise<StudentOrderHistory> {
  const response = await api.get<StudentOrderHistoryResponse>(
    `/orders/student-order-history/${studentId}`
  );
  return response.data.result;
}

// CI Materials Order interfaces and functions
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

export interface CIMaterialsPreviewResponse extends Response {
  result: CIMaterialsPreview;
}

export async function getCIMaterialsPreview(
  ciId: number
): Promise<CIMaterialsPreview> {
  const response = await api.get<CIMaterialsPreviewResponse>(
    `/orders/ci-materials/preview/${ciId}`
  );
  return response.data.result;
}

export async function createCIMaterialsOrder(
  ciId: number
): Promise<OrderData> {
  const response = await api.post<SingleOrderResponse>(
    `/orders/ci-materials/${ciId}`
  );
  return response.data.result;
}
