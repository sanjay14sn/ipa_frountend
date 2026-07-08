import { api } from "@/lib/axios";
import {
  compactRequestParams,
  normalizePaginatedResult,
  unwrapData,
} from "@/lib/unwrap-api";
import type { AgreementRecord } from "@/services/agreement.service";
import { RAZORPAY_KEY_ID } from "@/lib/config";

export interface Response {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
}

export interface Franchisee {
  name: string;
  dob: Date;
  bloodGroup: string;
  communicationAddress: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  mail: string;
  education: string;
  occupation: string;
  reference: string;
  refreshToken: string;
  password?: string;
}

export interface Franchise {
  name: string;
  type: string;
  status: string;
  assignedAdminId?: number | null;
  assignedAt?: string | null;
  assignedByAdminId?: number | null;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  franchiseeId: number;
  /** Single-select program chosen during application. */
  programIds?: number[];
}

export interface FranchiseResponse {
  id: string;
  code?: string | null;
  name: string;
  type: string;
  /** Application-review status only (Pending/Approved/Rejected). */
  status: string;
  /** Derived: count of in-force (Valid) agreements, excluding CI agreements. */
  validAgreementsCount?: number;
  /** Derived: true when the franchise has at least one valid agreement. */
  isOperational?: boolean;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  /** ipa-new: agreements nested on franchise in admin list/detail */
  agreements?: AgreementRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface FranchiseeResponse {
  id: number;
  name: string;
  dob: Date;
  bloodGroup: string;
  communicationAddress: string;
  phone: string;
  mail: string;
  education: string;
  occupation: string;
  reference: string;
  createdAt?: string;
  updatedAt?: string;
}

/** GET /admin/franchise/:id — pending application detail for payroll setup */
export interface FranchiseProgramRequestRow {
  id: number;
  franchiseId: string;
  programId: number;
  status: string;
  program: { id: number; name: string };
}

export interface FranchiseApplicationDetail {
  franchise: FranchiseResponse;
  franchisee?: FranchiseeResponse;
  agreements?: AgreementRecord[];
  programRequest?: unknown;
  programRequests?: FranchiseProgramRequestRow[];
  payroll?: FranchisePayrollResponse | null;
  selectedProgram?: {
    id: number;
    name: string;
  } | null;
}

export interface FranchisePayrollResponse {
  id: number;
  franchiseFee: number;
  dateOfPayment: Date;
  dateOfJoining: Date;
  monthlyFee: number;
  ciShare: number;
  franchiseShare: number;
  royalty: number;
  kitCost: number;
  materialCost: number;
  installment: number;
  programId: number;
  gstFranchiseFee?: boolean;
  gstRoyalty?: boolean;
  gstMaterialCost?: boolean;
  program?: {
    id: number;
    name: string;
  };
}

export interface FranchiseeApplication {
  franchisee: Franchisee;
  franchise: Franchise;
}

export interface PendingFranchise extends Response {
  result: FranchiseeApplication[];
}

export interface FranchiseData extends FranchiseResponse {
  franchisee: FranchiseeResponse;
  franchisePayroll?: FranchisePayrollResponse;
}

export interface FranchisesResponse extends Response {
  result: FranchiseData[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedFranchisesResponse {
  data: FranchiseData[];
  meta: PaginationMeta;
}

/** Admin grouped list: franchisee → franchises → agreements (ipa-new). */
export interface FranchiseWithAgreements extends FranchiseResponse {
  agreements: AgreementRecord[];
}

export interface FranchiseeGroupedItem {
  franchisee: FranchiseeResponse;
  franchises: FranchiseWithAgreements[];
}

export interface PaginatedFranchiseeGroupedResponse {
  data: FranchiseeGroupedItem[];
  meta: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  program?: string;
  sortBy?: string;
  sortOrder?: string;
}

/** Body fields for ipa-new `SetFranchiseTermsDto` (per program). */
export interface ProgramPayrollRequest {
  programId: number;
  franchiseFee: number;
  kitCost: number;
  materialCost: number;
  monthlyFee: number;
  ciShare: number;
  franchiseShare: number;
  royalty: number;
  installment: boolean;
  tenure: number;
  installmentMonths?: number;
  downPaymentAmount?: number | null;
  gstFranchiseFee?: boolean;
  gstRoyalty?: boolean;
  gstMaterialCost?: boolean;
}

export interface CreatePayrollRequest {
  programPayroll?: ProgramPayrollRequest;
  programPayrolls?: ProgramPayrollRequest[];
}

function toPlain<T extends object>(
  row: T | { get?: (opts?: { plain?: boolean }) => T },
): T {
  const r = row as { get?: (opts?: { plain?: boolean }) => T };
  if (r?.get && typeof r.get === "function") return r.get({ plain: true });
  return row as T;
}

function coerceAgreementArray(raw: unknown): AgreementRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((a) => toPlain(a as object)) as AgreementRecord[];
}

/** Backend may return `{ franchise, franchisee }` or a flat franchise row. */
function mapFranchiseRowToFranchiseData(row: unknown): FranchiseData {
  const r = row as Record<string, unknown>;
  if (r?.franchise != null) {
    const f = toPlain(r.franchise as object) as FranchiseResponse;
    const fe = r.franchisee
      ? normalizeFranchiseeResponse(
          toPlain(r.franchisee as object) as Record<string, unknown>,
        )
      : ({} as FranchiseeResponse);
    const agreements = coerceAgreementArray(
      f.agreements ?? (r as { agreements?: unknown }).agreements,
    );
    return { ...f, franchisee: fe, agreements };
  }
  const flat = toPlain(row as object) as FranchiseData;
  return {
    ...flat,
    agreements: coerceAgreementArray(flat.agreements),
  };
}

function normalizeFranchiseeResponse(
  raw: Record<string, unknown>,
): FranchiseeResponse {
  const plain = toPlain(raw as object) as FranchiseeResponse & {
    email?: string;
  };
  const mail =
    (plain as { mail?: string }).mail ??
    plain.email ??
    "";
  return { ...plain, mail } as FranchiseeResponse;
}

function mapGroupedRow(row: unknown): FranchiseeGroupedItem {
  const r = row as Record<string, unknown>;
  const feRaw = r.franchisee as Record<string, unknown>;
  const franchisee = normalizeFranchiseeResponse(feRaw);
  const franchisesRaw = (r.franchises ?? []) as unknown[];
  const franchises: FranchiseWithAgreements[] = franchisesRaw.map((f) => {
    const plain = toPlain(f as object) as Record<string, unknown>;
    const agreements = (plain.agreements as unknown[] | undefined)?.map((a) =>
      toPlain(a as object),
    ) as AgreementRecord[];
    const { agreements: _a, ...rest } = plain;
    return {
      ...(rest as unknown as FranchiseResponse),
      agreements: agreements ?? [],
    };
  });
  return { franchisee, franchises };
}

function formatDobForApi(d: Date | string): string {
  if (d instanceof Date) {
    return d.toISOString().slice(0, 10);
  }
  if (typeof d === "string" && d.length >= 10) {
    return d.slice(0, 10);
  }
  return String(d);
}

/** Public franchise application (no auth). ipa-new: POST /franchisee/apply */
export async function applyFranchisee(application: FranchiseeApplication) {
  const fe = application.franchisee;
  const f = application.franchise;
  const response = await api.post("/franchisee/apply", {
    franchisee: {
      name: fe.name,
      dob: formatDobForApi(fe.dob),
      bloodGroup: fe.bloodGroup || undefined,
      communicationAddress: fe.communicationAddress || undefined,
      city: fe.city || undefined,
      state: fe.state || undefined,
      pincode: fe.pincode || undefined,
      phone: fe.phone,
      mail: fe.mail,
      education: fe.education || undefined,
      occupation: fe.occupation || undefined,
      reference: fe.reference || undefined,
    },
    franchise: {
      name: f.name,
      type: f.type,
      city: f.city,
      state: f.state ?? "",
      address: f.address,
      pincode: f.pincode,
      programIds: f.programIds?.[0] != null ? [f.programIds[0]] : [],
    },
  });
  return response;
}

/* ============================================================
   Admin one-shot "Setup Existing Franchise"
   Backed by POST /admin/franchise/setup-existing in ipa-new.
   ============================================================ */

export type PaymentMode =
  | "cash"
  | "upi"
  | "bank-transfer"
  | "razorpay"
  | "cheque"
  | "other";

export interface SetupPriorPaymentMatch {
  kind: "down-payment" | "installment" | "agreement-fee";
  sequenceNumber?: number;
}

export interface SetupPriorPayment {
  amount: number;
  paidAt: string; // ISO date
  mode: PaymentMode;
  reference?: string;
  matches: SetupPriorPaymentMatch;
}

/**
 * Historical payment received for the agreement that is NOT matched to a
 * specific receivable item — used by the Paid/Unpaid setup flow.
 */
export interface SetupAdvancePayment {
  amount: number;
  paidAt: string; // ISO date
  mode: PaymentMode;
  reference?: string;
}

export interface SetupProgramTerms {
  franchiseFee: number;
  kitCost: number;
  materialCost: number;
  monthlyFee: number;
  ciShare: number;
  franchiseShare: number;
  royalty: number;
  gstFranchiseFee: boolean;
  gstRoyalty: boolean;
  gstMaterialCost: boolean;
  tenure: number;
}

export interface SetupProgram {
  programId: number;
  terms: SetupProgramTerms;
  signedAt: string;
  installmentEnabled: boolean;
  /** Present when installmentEnabled === false. */
  lumpSum?: { enabled: false; lumpSumPayment?: SetupPriorPayment };
  /** Present when installmentEnabled === true. */
  emi?: {
    enabled: true;
    downPaymentAmount: number;
    installmentMonths: number;
    priorPayments: SetupPriorPayment[];
    /**
     * Optional explicit due date (yyyy-mm-dd) of the first receivable item.
     * Subsequent items are scheduled at monthly intervals from this date.
     */
    firstDueDate?: string;
  };
  /**
   * Already-received payments recorded against the agreement with no
   * receivable item matching. The backend computes receivable plan principal
   * as `franchiseFee - sum(advancePayments) - emi.downPaymentAmount`.
   */
  advancePayments?: SetupAdvancePayment[];
}

export interface SetupExistingFranchisePayload {
  franchisee:
    | { mode: "existing"; franchiseeId: number }
    | {
        mode: "new";
        newFranchisee: {
          name: string;
          dob: string;
          bloodGroup?: string;
          communicationAddress: string;
          city: string;
          state: string;
          pincode: string;
          phone: string;
          email: string;
          education?: string;
          occupation?: string;
          reference?: string;
        };
      };
  franchise: {
    name: string;
    type: string;
    city: string;
    state: string;
    address?: string;
    pincode?: string;
  };
  programs: SetupProgram[];
}

export interface SetupExistingFranchiseResponse {
  franchiseeId: number;
  franchiseId: string;
  agreementIds: number[];
  receivablePlanIds: number[];
}

/** Admin one-shot: create franchise + agreements + EMI + prior payments. */
export async function setupExistingFranchise(
  payload: SetupExistingFranchisePayload,
): Promise<SetupExistingFranchiseResponse> {
  const response = await api.post("/admin/franchise-setup/existing", payload);
  return unwrapData<SetupExistingFranchiseResponse>(response);
}

/**
 * Legacy entry point preserved for the existing CreateFranchiseDialog.
 * Maps the old single-step "create + then set payroll" call shape onto the
 * new one-shot endpoint by composing a SetupExistingFranchisePayload from
 * the franchisee + franchise inputs. Per-program terms are NOT included
 * here — callers should call `setupExistingFranchise` directly.
 */
async function createFranchiseeByAdmin(
  application: FranchiseeApplication,
): Promise<{
  result: { franchise: FranchiseResponse; franchisee: FranchiseeResponse };
}> {
  throw new Error(
    "createFranchiseeByAdmin is deprecated — call setupExistingFranchise() with full payload (franchisee + franchise + per-program terms).",
  );
  // Intentionally throws: callers should migrate to setupExistingFranchise.
  // Keeping the symbol so existing imports don't break at compile time.
  void application;
}

/** Admin: pending applications only (used by dashboard cards). */
export async function getPendingFranchise(
  params?: PaginationParams,
): Promise<FranchisesResponse> {
  const merged: PaginationParams = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 10_000,
    ...params,
    status: params?.status ?? 'Pending',
  };
  const response = await api.get("/admin/franchise/applications", {
    params: compactRequestParams(
      merged as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  const result = unwrapData<unknown>(response);
  const { rows } = normalizePaginatedResult<unknown>(result);
  const list = rows.map((row) => {
    const fd = mapFranchiseRowToFranchiseData(row);
    return {
      ...fd,
      franchisee: fd.franchisee ?? ({} as FranchiseeResponse),
    } as FranchiseData;
  });
  return { result: list } as FranchisesResponse;
}

/** Admin: all franchises. */
export async function getAllFranchise(
  params?: PaginationParams,
): Promise<FranchisesResponse> {
  const merged: PaginationParams = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 10_000,
    ...params,
  };
  const response = await api.get("/admin/franchise/all", {
    params: compactRequestParams(
      merged as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  const result = unwrapData<unknown>(response);
  const { rows } = normalizePaginatedResult<unknown>(result);
  const list = rows.map((row) => mapFranchiseRowToFranchiseData(row));
  return { result: list } as FranchisesResponse;
}

/** Server-side pagination + filters via ipa-new `ListQueryDto`. */
export async function getFranchiseApplicationDetail(
  franchiseId: string,
): Promise<FranchiseApplicationDetail> {
  const response = await api.get(`/admin/franchise/${franchiseId}`);
  const raw = unwrapData<FranchiseApplicationDetail>(response);
  const agreements = Array.isArray(raw.agreements) ? raw.agreements : [];
  const firstAgreement = agreements[0];
  const selectedProgramId =
    firstAgreement?.programId ??
    raw.programRequests?.[0]?.programId;
  const selectedProgramName =
    firstAgreement?.programName ??
    firstAgreement?.program?.name ??
    firstAgreement?.programs?.[0]?.name ??
    raw.programRequests?.[0]?.program?.name ??
    (selectedProgramId != null ? `Program #${selectedProgramId}` : undefined);

  return {
    ...raw,
    agreements,
    selectedProgram:
      selectedProgramId != null
        ? {
            id: selectedProgramId,
            name: selectedProgramName ?? `Program #${selectedProgramId}`,
          }
        : null,
  };
}

/** Assigned inventory lines (starting kit) per franchise. ipa-new: GET /inventory/franchise/:id/starting-kits */
export interface FranchiseStartingKitRow {
  id: number;
  programId: number;
  programName: string;
  inventoryId: number;
  itemName: string;
  sku: string | null;
  quantity: number;
  status: string;
  assignedAt: string;
  dispatchedAt: string | null;
}

export async function getFranchiseStartingKits(
  franchiseId: string,
): Promise<FranchiseStartingKitRow[]> {
  const response = await api.get(
    `/inventory/franchise/${franchiseId}/starting-kits`,
  );
  const data = unwrapData<unknown>(response);
  return Array.isArray(data) ? (data as FranchiseStartingKitRow[]) : [];
}

/** Lightweight type used for dropdown pickers. */
export interface FranchiseeOption {
  id: number;
  name: string;
  mail: string;
}

/** Fetch all franchisees (id + name + email only) for dropdown pickers. */
export async function listAllFranchisees(): Promise<FranchiseeOption[]> {
  const response = await api.get("/admin/franchise-setup/franchisees");
  const rows = unwrapData<{ id: number; name: string; email: string }[]>(response);
  return rows.map((r) => ({ id: r.id, name: r.name, mail: r.email }));
}

/** Admin: franchisees with nested franchises and agreements (ipa-new). */
export async function getPaginatedFranchiseesGrouped(
  params: PaginationParams,
): Promise<PaginatedFranchiseeGroupedResponse> {
  const response = await api.get("/admin/franchise/by-franchisee", {
    params: compactRequestParams({
      page: params.page,
      limit: params.limit,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    } as Record<string, string | number | boolean | undefined | null>),
  });
  const result = unwrapData<unknown>(response);
  const { rows: raw, total, page, limit } =
    normalizePaginatedResult<unknown>(result);
  const data = raw.map((row) => mapGroupedRow(row));
  const lim = limit || 20;
  const totalPages = Math.ceil(total / lim) || 1;
  const pageNum = page || 1;
  return {
    data,
    meta: {
      total,
      page: pageNum,
      limit: lim,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1,
    },
  };
}

export async function getPaginatedFranchises(
  params: PaginationParams,
): Promise<PaginatedFranchisesResponse> {
  const status =
    params.status != null &&
    params.status !== "" &&
    params.status !== "all"
      ? params.status
      : undefined;
  const response = await api.get("/admin/franchise/all", {
    params: compactRequestParams({
      page: params.page,
      limit: params.limit,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      status,
      type: params.type,
      program: params.program,
    } as Record<string, string | number | boolean | undefined | null>),
  });
  const result = unwrapData<unknown>(response);
  const { rows: raw, total, page, limit } = normalizePaginatedResult<unknown>(result);
  const data = raw.map((row) => mapFranchiseRowToFranchiseData(row));
  const lim = limit || 20;
  const totalPages = Math.ceil(total / lim) || 1;
  const pageNum = page || 1;
  return {
    data,
    meta: {
      total,
      page: pageNum,
      limit: lim,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1,
    },
  };
}

export async function getPaginatedFranchiseApplications(
  params: PaginationParams,
): Promise<PaginatedFranchisesResponse> {
  const status =
    params.status != null &&
    params.status !== '' &&
    params.status !== 'all'
      ? params.status
      : undefined;
  const response = await api.get("/admin/franchise/applications", {
    params: compactRequestParams({
      page: params.page,
      limit: params.limit,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      status,
      type: params.type,
      program: params.program,
    } as Record<string, string | number | boolean | undefined | null>),
  });
  const result = unwrapData<unknown>(response);
  const { rows: raw, total, page, limit } =
    normalizePaginatedResult<unknown>(result);
  const data = raw.map((row) => mapFranchiseRowToFranchiseData(row));
  const lim = limit || 20;
  const totalPages = Math.ceil(total / lim) || 1;
  const pageNum = page || 1;
  return {
    data,
    meta: {
      total,
      page: pageNum,
      limit: lim,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1,
    },
  };
}

/** Set payroll terms — ipa-new: one POST per program in the payload. */
export async function createPayrollDetails(
  id: string,
  payrollDetails: CreatePayrollRequest,
) {
  const row =
    payrollDetails.programPayroll ?? payrollDetails.programPayrolls?.[0];
  if (!row?.programId) {
    throw new Error("A single selected program is required");
  }
  const response = await api.post(`/admin/franchise/${id}/set-terms`, {
    programId: row.programId,
    franchiseFee: row.franchiseFee,
    monthlyFee: row.monthlyFee,
    royalty: row.royalty,
    materialCost: row.materialCost,
    kitCost: row.kitCost,
    ciShare: row.ciShare,
    franchiseShare: row.franchiseShare,
    gstFranchiseFee: row.gstFranchiseFee ?? false,
    gstRoyalty: row.gstRoyalty ?? false,
    gstMaterialCost: row.gstMaterialCost ?? false,
    installment: Boolean(row.installment),
    installmentMonths: Math.max(1, Math.floor(Number(row.installmentMonths) || 0)),
    downPaymentAmount: Number(row.downPaymentAmount) || 0,
    tenure: Math.max(1, Math.floor(Number(row.tenure) || 12)),
  });
  return unwrapData(response);
}

async function updatePayrollDetails(
  _id: number,
  _payrollDetails: Partial<ProgramPayrollRequest>,
) {
  throw new Error("updatePayrollDetails is not supported in ipa-new — use set-terms");
}

async function onboardingPayment(_franchiseId: string) {
  throw new Error("onboardingPayment is not supported in ipa-new");
}

async function updateFranchiseStatus(
  _franchiseId: string,
  _dto: { status: "Approved" | "Rejected" | "Pending" },
) {
  throw new Error("Use approveFranchiseAdmin or rejectFranchiseAdmin");
}

export async function approveFranchiseAdmin(
  franchiseId: string,
  programId?: number,
) {
  const response = await api.post(`/admin/franchise/${franchiseId}/approve`, {
    programId,
  });
  return unwrapData(response);
}

export async function rejectFranchise(franchiseId: string, reason: string) {
  const response = await api.post(`/admin/franchise/${franchiseId}/reject`, {
    reason,
  });
  return unwrapData(response);
}

export async function resendFranchiseeCredentials(franchiseId: string) {
  const response = await api.post(
    `/admin/franchise/${franchiseId}/resend-credentials`,
  );
  return unwrapData(response);
}

export interface VerifyPaymentDto {
  paymentId: string;
  orderId: string;
  signature: string;
}

export interface PaymentOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  franchiseId: string;
  franchiseName: string;
  paymentType: string;
  key: string;
  isZeroAmount?: boolean;
}

export interface PaymentVerificationResponse {
  ok?: boolean;
  message?: string;
  status?: string;
}

async function initiateFranchiseFeePayment(
  _franchiseId: string,
  _amount: number,
): Promise<PaymentOrderResponse> {
  throw new Error(
    "Direct franchise fee payment is not available. Please sign the agreement and use the agreement payment flow.",
  );
}

/** Amount and payment type come from the agreement row; SPA sends only agreementId. */
export async function initiateAgreementFeePayment(
  agreementId: number,
): Promise<PaymentOrderResponse> {
  const response = await api.post(`/billing/payment/initiate-agreement`, {
    agreementId,
  });
  const raw = unwrapData(response) as Record<string, unknown>;
  const key =
    String(raw.keyId ?? raw.razorpayKeyId ?? "").trim() ||
    RAZORPAY_KEY_ID;
  return {
    orderId: String(raw.razorpayOrderId ?? raw.orderId ?? ""),
    amount: Number(raw.amount ?? 0),
    currency: "INR",
    franchiseId: String(raw.franchiseId ?? ""),
    franchiseName: String(raw.franchiseName ?? ""),
    paymentType: String(raw.paymentType ?? raw.type ?? "FRANCHISE_FEE"),
    key,
    isZeroAmount: Boolean(raw.isZeroAmount),
  };
}

export async function initiateReceivableItemPayment(
  agreementId: number,
): Promise<PaymentOrderResponse> {
  const response = await api.post(`/billing/payment/initiate-receivable-item`, {
    agreementId,
  });
  const raw = unwrapData(response) as Record<string, unknown>;
  const key =
    String(raw.keyId ?? raw.razorpayKeyId ?? "").trim() ||
    RAZORPAY_KEY_ID;
  return {
    orderId: String(raw.razorpayOrderId ?? raw.orderId ?? ""),
    amount: Number(raw.amount ?? 0),
    currency: "INR",
    franchiseId: String(raw.franchiseId ?? ""),
    franchiseName: String(raw.franchiseName ?? ""),
    paymentType: String(raw.paymentType ?? raw.type ?? "FRANCHISE_FEE"),
    key,
    isZeroAmount: Boolean(raw.isZeroAmount),
  };
}

export async function verifyFranchiseFeePayment(
  paymentData: VerifyPaymentDto,
): Promise<PaymentVerificationResponse> {
  const response = await api.post(`/billing/payment/verify`, {
    razorpayOrderId: paymentData.orderId,
    razorpayPaymentId: paymentData.paymentId,
    signature: paymentData.signature,
  });
  return unwrapData<PaymentVerificationResponse>(response);
}
