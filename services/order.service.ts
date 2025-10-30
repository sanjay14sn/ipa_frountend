import axios from "axios";

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

export interface OrderData {
  id: number;
  totalItems?: number;
  totalStudents?: number;
  totalAmount: string | number;
  status: OrderStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Extended fields (may not be present in list view)
  orderNumber?: string;
  franchiseId?: number;
  createdBy?: number;
  updatedBy?: number;
  franchise?: {
    id: number;
    name: string;
  };
  // Detailed view: order items grouped by student
  orderItems?: Record<string, OrderItemData[]>;
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
  id: number;
  name: string;
  totalPrice: string;
  quantity: number;
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

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Franchisee endpoints
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
  const response = await api.get<SingleOrderResponse>(`/orders/franchise/${orderId}`);
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

// Admin endpoints
export async function getAllOrdersAdmin(): Promise<OrderData[]> {
  const response = await api.get<OrdersResponse>("/orders/admin");
  return response.data.result;
}

export async function getOrdersByFranchise(): Promise<any> {
  const response = await api.get("/orders/admin/by-franchise");
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
  notes?: string;
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
