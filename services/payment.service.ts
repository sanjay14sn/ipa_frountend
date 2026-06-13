import { api } from "@/lib/axios";
import {
  compactRequestParams,
  normalizePaginatedResult,
  unwrapData,
} from "@/lib/unwrap-api";

enum PaymentStatus {
  PENDING = "Pending",
  COMPLETED = "Completed",
  FAILED = "Failed",
  REFUNDED = "Refunded",
}

export interface PaymentData {
  id: number;
  amount: number;
  status: PaymentStatus | string;
  franchiseName?: string;
  franchiseId?: string | null;
  createdAt?: string;
  agreementId?: number | null;
  receivableItemId?: number | null;
  acquirerData?: Record<string, unknown> | null;
  franchisee?: {
    id?: number;
    name?: string;
    mail?: string;
    phone?: string;
  };
  razorpayOrderId?: string;
  razorpayPaymentId?: string | null;
  type?: string;
  currency?: string;
  subscription?: { id?: number; status?: string; plan?: string };
  method?: string | null;
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
}

interface FranchisePaymentGroup {
  franchiseId: string;
  franchiseName: string;
  payments: PaymentData[];
}

export interface FranchisePaymentSummary {
  franchiseId: string | null;
  franchiseName: string;
  franchiseeId: number | null;
  franchiseeName: string | null;
  franchiseeEmail: string | null;
  totalPayments: number;
  totalCompleted: number;
  totalPending: number;
  totalAmount: number;
}

/** @alias Legacy grouped payments table */
export type GroupedPaymentData = Record<string, PaymentData[]>;

interface VerifyPaymentDto {
  paymentId: string;
  orderId: string;
  signature: string;
}

export async function getPaginatedAdminPayments(
  params: Record<string, unknown>,
): Promise<{
  data: GroupedPaymentData;
  meta: { total: number; totalPages: number };
}> {
  const response = await api.get("/admin/billing/payment", {
    params: compactRequestParams(
      params as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  const result = unwrapData<unknown>(response);
  const normalized = normalizePaginatedResult<Record<string, unknown>>(result);
  const rows = normalized.rows.map((row) => {
    const franchise = (row.franchise ?? null) as
      | { id?: string; name?: string }
      | null;
    const franchisee = (row.franchisee ?? null) as
      | { id?: number; name?: string; email?: string; mail?: string; phone?: string }
      | null;
    return {
      id: Number(row.id),
      amount: Number(row.amount ?? 0),
      status: String(row.status ?? PaymentStatus.PENDING),
      franchiseName: franchise?.name ?? "Unassigned Franchise",
      franchiseId: franchise?.id ?? (row.franchiseId as string | null | undefined) ?? null,
      createdAt: (row.createdAt as string | undefined) ?? undefined,
      agreementId: (row.agreementId as number | null | undefined) ?? null,
      receivableItemId:
        (row.receivableItemId as number | null | undefined) ?? null,
      acquirerData:
        (row.acquirerData as Record<string, unknown> | null | undefined) ?? null,
      franchisee: franchisee
        ? {
            id: franchisee.id,
            name: franchisee.name,
            mail: franchisee.mail ?? franchisee.email,
            phone: franchisee.phone,
          }
        : undefined,
      razorpayOrderId:
        (row.razorpayOrderId as string | undefined) ?? undefined,
      razorpayPaymentId:
        (row.razorpayPaymentId as string | null | undefined) ?? null,
      type: (row.type as string | undefined) ?? undefined,
      currency: (row.currency as string | undefined) ?? "INR",
      subscription: undefined,
      method: (row.method as string | null | undefined) ?? null,
      bank: (row.bank as string | null | undefined) ?? null,
      wallet: (row.wallet as string | null | undefined) ?? null,
      vpa: (row.vpa as string | null | undefined) ?? null,
      email: (row.email as string | null | undefined) ?? null,
      contact: (row.contact as string | null | undefined) ?? null,
      fee: row.fee != null ? Number(row.fee) : null,
      tax: row.tax != null ? Number(row.tax) : null,
    } satisfies PaymentData;
  });
  const { total, limit } = normalized;

  const grouped = rows.reduce<GroupedPaymentData>((acc, row) => {
    const franchiseName = row.franchiseName?.trim() || "Unassigned Franchise";
    if (!acc[franchiseName]) acc[franchiseName] = [];
    acc[franchiseName].push(row);
    return acc;
  }, {});

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit || 20)));
  return { data: grouped, meta: { total, totalPages } };
}

export async function getAdminFranchisePaymentSummaries(
  params: Record<string, unknown>,
): Promise<{
  data: FranchisePaymentSummary[];
  meta: { total: number; totalPages: number };
}> {
  const response = await api.get("/admin/billing/payment/summary", {
    params: compactRequestParams(
      params as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  const result = unwrapData<unknown>(response);
  const normalized = normalizePaginatedResult<Record<string, unknown>>(result);
  const rows = normalized.rows.map((row) => ({
    franchiseId: (row.franchiseId as string | null | undefined) ?? null,
    franchiseName: String(row.franchiseName ?? "Unassigned Franchise"),
    franchiseeId: row.franchiseeId != null ? Number(row.franchiseeId) : null,
    franchiseeName: (row.franchiseeName as string | null | undefined) ?? null,
    franchiseeEmail: (row.franchiseeEmail as string | null | undefined) ?? null,
    totalPayments: Number(row.totalPayments ?? 0),
    totalCompleted: Number(row.totalCompleted ?? 0),
    totalPending: Number(row.totalPending ?? 0),
    totalAmount: Number(row.totalAmount ?? 0),
  } satisfies FranchisePaymentSummary));
  const { total, limit } = normalized;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit || 20)));
  return { data: rows, meta: { total, totalPages } };
}

export async function getAdminFranchisePayments(
  franchiseId: string,
  params: Record<string, unknown>,
): Promise<{
  data: PaymentData[];
  meta: { total: number; totalPages: number };
}> {
  const response = await api.get("/admin/billing/payment", {
    params: compactRequestParams({
      ...(params as Record<string, string | number | boolean | undefined | null>),
      franchiseId,
    }),
  });
  const result = unwrapData<unknown>(response);
  const normalized = normalizePaginatedResult<Record<string, unknown>>(result);
  const rows = normalized.rows.map((row) => {
    const franchise = (row.franchise ?? null) as
      | { id?: string; name?: string }
      | null;
    const franchisee = (row.franchisee ?? null) as
      | { id?: number; name?: string; email?: string; mail?: string; phone?: string }
      | null;
    return {
      id: Number(row.id),
      amount: Number(row.amount ?? 0),
      status: String(row.status ?? PaymentStatus.PENDING),
      franchiseName: franchise?.name ?? "Unassigned Franchise",
      franchiseId: franchise?.id ?? (row.franchiseId as string | null | undefined) ?? null,
      createdAt: (row.createdAt as string | undefined) ?? undefined,
      agreementId: (row.agreementId as number | null | undefined) ?? null,
      receivableItemId: (row.receivableItemId as number | null | undefined) ?? null,
      acquirerData: (row.acquirerData as Record<string, unknown> | null | undefined) ?? null,
      franchisee: franchisee
        ? {
            id: franchisee.id,
            name: franchisee.name,
            mail: franchisee.mail ?? franchisee.email,
            phone: franchisee.phone,
          }
        : undefined,
      razorpayOrderId: (row.razorpayOrderId as string | undefined) ?? undefined,
      razorpayPaymentId: (row.razorpayPaymentId as string | null | undefined) ?? null,
      type: (row.type as string | undefined) ?? undefined,
      currency: (row.currency as string | undefined) ?? "INR",
      subscription: undefined,
      method: (row.method as string | null | undefined) ?? null,
      bank: (row.bank as string | null | undefined) ?? null,
      wallet: (row.wallet as string | null | undefined) ?? null,
      vpa: (row.vpa as string | null | undefined) ?? null,
      email: (row.email as string | null | undefined) ?? null,
      contact: (row.contact as string | null | undefined) ?? null,
      fee: row.fee != null ? Number(row.fee) : null,
      tax: row.tax != null ? Number(row.tax) : null,
    } satisfies PaymentData;
  });
  const { total, limit } = normalized;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit || 10)));
  return { data: rows, meta: { total, totalPages } };
}

/** Razorpay checkout bootstrap (legacy franchisee CI flows) */
interface CITrainingPaymentOrderResponse {
  key: string;
  amount: number;
  currency: string;
  orderId: string;
  message?: string;
}

async function initiateCITrainingPayment(
  ciId: number,
): Promise<CITrainingPaymentOrderResponse> {
  const response = await api.post("/billing/payment/initiate", {
    type: "CI_TRAINING_FEE",
    ciId,
  });
  const raw = unwrapData(response) as Record<string, unknown>;
  return {
    key: String(raw.keyId ?? raw.key ?? ""),
    amount: Number(raw.amount ?? 0),
    currency: String(raw.currency ?? "INR"),
    orderId: String(raw.razorpayOrderId ?? raw.orderId ?? ""),
    message: raw.message != null ? String(raw.message) : undefined,
  };
}

async function verifyCITrainingPayment(data: VerifyPaymentDto) {
  const response = await api.post("/billing/payment/verify", {
    razorpayOrderId: data.orderId,
    razorpayPaymentId: data.paymentId,
    signature: data.signature,
  });
  return unwrapData(response);
}

async function initiateMultiLevelCITrainingPayment(
  ciId: number,
  body: { trainingLevelIds: number[] },
): Promise<CITrainingPaymentOrderResponse> {
  const response = await api.post("/billing/payment/initiate", {
    type: "CI_TRAINING_FEE",
    ciId,
    trainingLevelIds: body.trainingLevelIds,
  });
  const raw = unwrapData(response) as Record<string, unknown>;
  return {
    key: String(raw.keyId ?? raw.key ?? ""),
    amount: Number(raw.amount ?? 0),
    currency: String(raw.currency ?? "INR"),
    orderId: String(raw.razorpayOrderId ?? raw.orderId ?? ""),
    message: raw.message != null ? String(raw.message) : undefined,
  };
}

async function verifyMultiLevelCITrainingPayment(data: VerifyPaymentDto) {
  return verifyCITrainingPayment(data);
}
