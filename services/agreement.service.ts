import { api } from "@/lib/axios";
import {
  compactRequestParams,
  normalizePaginatedResult,
  unwrapData,
} from "@/lib/unwrap-api";

/** Sequelize/plain shape for payment linked to an agreement */
export interface AgreementPaymentDetail {
  id: number;
  subscriptionId: number | null;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amount: number;
  currency: string;
  type: string;
  status: string;
  bank?: string | null;
  wallet?: string | null;
  vpa?: string | null;
  email?: string | null;
  contact?: string | null;
  method?: string | null;
  cardLast4?: string | null;
  cardNetwork?: string | null;
  cardIssuer?: string | null;
  cardType?: string | null;
  fee?: number | null;
  tax?: number | null;
  franchiseeId?: number;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgreementProgramItem {
  id: number;
  name: string;
  AgreementProgram?: { displayOrder: number };
}

export interface AgreementProgramDetail {
  id: number;
  name: string;
  streams?: Array<{
    id: number;
    name: string;
    displayOrder?: number | null;
    levels?: Array<{
      id?: number;
      name?: string | null;
      code?: string | null;
      displayOrder: number;
      durationInMonths: number;
    }>;
  }>;
}

export interface AgreementScheduleBView {
  effectiveDate: string;
  franchiseeName: string;
  franchiseeAddress: string;
  centreName: string;
  centreAddress: string;
  franchiseFee: number;
  gstFranchiseFee: boolean;
  tenureMonths: number;
  kitCost: number;
  materialCost: number;
  gstMaterialCost: boolean;
  gstRoyaltyInclusive: boolean;
  level1: {
    months: number;
    termFees: number;
    franchiseShare: number;
    ciShare: number;
    ipaShare: number;
  };
  level2: {
    months: number;
    termFees: number;
    franchiseShare: number;
    ciShare: number;
    ipaShare: number;
  };
  franchisorSignatory: string;
  presenceWitnessName: string;
  presenceWitnessAddress: string;
}

export interface ReceivableSummaryItem {
  receivableItemId: number;
  label: string;
  kind: "down-payment" | "installment";
  sequenceNumber: number | null;
  amount: number;
  status: "scheduled" | "due" | "overdue" | "paid";
  dueAt: string | null;
  paidAt: string | null;
  paymentId: number | null;
  isInitialPayable: boolean;
  sortOrder: number;
}

export interface ReceivableInstallmentSummary {
  planId: number;
  agreementId: number;
  franchiseId: string;
  franchiseeId: number;
  standing: string;
  holdReason: string | null;
  cycleDay: number;
  shortMonthThresholdDays: number;
  anchorPaidAt: string | null;
  principal: number;
  totals: {
    principal: number;
    downPayment: number;
    installmentPrincipal: number;
    paidAmount: number;
    outstandingAmount: number;
    overdueAmount: number;
    installmentCount: number;
    paidItemCount: number;
    outstandingItemCount: number;
  };
  initialPayableItem: ReceivableSummaryItem | null;
  nextDueItem: ReceivableSummaryItem | null;
  downPayment: ReceivableSummaryItem | null;
  installments: ReceivableSummaryItem[];
  items: ReceivableSummaryItem[];
}

export interface ReceivableCompactSummary {
  hasPlan: boolean;
  planId: number | null;
  agreementId: number | null;
  franchiseId: string | null;
  standing: string | null;
  holdReason: string | null;
  paidAmount: number;
  outstandingAmount: number;
  overdueAmount: number;
  nextDueAt: string | null;
  nextDueAmount: number | null;
  initialPayableLabel: string | null;
}

export interface ReceivableFranchiseeSummary extends ReceivableCompactSummary {
  initialPayableItem: ReceivableSummaryItem | null;
  nextDueItem: ReceivableSummaryItem | null;
  paymentHistoryCount: number;
}

export interface AgreementReceivablesView {
  installmentSummary?:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null;
  paymentSummary?: ReceivableInstallmentSummary | null;
  operationalStanding?: {
    standing: string | null;
    holdReason: string | null;
    restrictedToPaymentPortal?: boolean;
  } | null;
}

export interface AgreementFranchisePayrollRow {
  id: number;
  franchiseFee: number;
  gstFranchiseFee?: boolean;
  gstRoyalty?: boolean;
  gstMaterialCost?: boolean;
  kitCost?: number;
  materialCost?: number;
  monthlyFee?: number;
  royalty?: number;
  installment?: number;
  ciShare?: number;
  franchiseShare?: number;
  dateOfPayment?: string;
  dateOfJoining?: string;
  status?: string;
}

/** Financial & program fields returned on each agreement (ipa-new — terms live on the agreement row). */
export interface AgreementTermsSnapshot {
  programId?: number | null;
  /** Enriched on ipa-new franchise admin list rows */
  programName?: string | null;
  status?: string;
  tenure?: number | null;
  expiresAt?: string | null;
  franchiseFee?: number | null;
  monthlyFee?: number | null;
  materialCost?: number | null;
  kitCost?: number | null;
  royalty?: number | null;
  ciShare?: number | null;
  franchiseShare?: number | null;
  gstFranchiseFee?: boolean | null;
  gstRoyalty?: boolean | null;
  gstMaterialCost?: boolean | null;
  installment?: boolean | null;
}

/**
 * Agreement lifecycle status (post-refactor).
 *
 * The agreement is the SOLE determiner of UI state. ProgramRequest.status is
 * historical record only.
 *
 * - `Draft`     — reserved (not used in standard request approval flow)
 * - `Approved`  — admin approved with all terms filled; awaiting signature + payment
 * - `Valid`     — agreement is fully in force (signed=true AND payment linked)
 * - `Suspended` — admin paused a Valid agreement
 * - `Void`      — permanently cancelled
 *
 * Legacy values still present in older data until migration runs:
 * - `Signed`    — equivalent to `Valid`
 * - `PendingSignature` — equivalent to `Approved`
 * - `Expired`   — collapsed into `Void`
 */
export type AgreementStatus =
  | "Draft"
  | "Approved"
  | "Valid"
  | "Suspended"
  | "Void"
  // legacy values – treated identically to their new equivalents during the
  // migration window; UI code should map these on read
  | "Signed"
  | "PendingSignature"
  | "Expired";

export interface AgreementRecord extends AgreementTermsSnapshot {
  id: number;
  type: string;
  /**
   * True once the franchisee has applied a signature (either via the
   * "Use existing signature" button or by uploading a new one). Independent
   * of `status`: an agreement can be `signed=true, status=Approved` while
   * awaiting payment, and only becomes `Valid` once payment is also linked.
   */
  signed?: boolean;
  dateOfSigning: string | null;
  franchiseId: string | null;
  franchiseeId: number | null;
  paymentId: number | null;
  franchiseeSignature: string | null;
  franchiseeSignedAt: string | null;
  franchiseeSignatureUrl: string | null;
  title: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  referenceCode: string | null;
  createdAt: string;
  updatedAt: string;
  franchise?: {
    id: string;
    name: string;
    city: string;
    state: string;
    status: string;
    address?: string;
    pincode?: string | null;
    type?: string | null;
  } | null;
  franchisee?: {
    id: number;
    name: string;
    mail: string;
    phone: string;
    communicationAddress?: string | null;
  } | null;
  payment?: AgreementPaymentDetail | null;
  program?: AgreementProgramDetail | null;
  programs?: AgreementProgramItem[] | null;
  scheduleB?: AgreementScheduleBView | null;
  receivables?: AgreementReceivablesView | null;
}

export interface CreateAgreementAdminDto {
  type: string;
  franchiseId: string;
  franchiseeId: number;
  programId: number;
  title: string;
  notes?: string;
}

export interface AgreementListParams {
  franchiseId?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  status?: string;
  type?: string;
  programId?: number;
}

/** Pass `franchiseId` string (legacy) or full filter object. */
export async function getAgreementsAdmin(
  opts?: string | AgreementListParams,
): Promise<AgreementRecord[]> {
  const raw: AgreementListParams =
    typeof opts === "string" ? { franchiseId: opts || undefined } : opts ?? {};
  const params: AgreementListParams = {
    page: raw.page ?? 1,
    limit: raw.limit ?? 5000,
    ...raw,
  };
  const response = await api.get("/admin/agreement", {
    params: compactRequestParams(
      params as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  const result = unwrapData<unknown>(response);
  const { rows } = normalizePaginatedResult<AgreementRecord>(result);
  return rows;
}

export async function getAgreementAdmin(id: number): Promise<AgreementRecord> {
  const response = await api.get(`/admin/agreement/${id}`);
  return unwrapData<AgreementRecord>(response);
}

export async function createAgreementAdmin(
  dto: CreateAgreementAdminDto,
): Promise<AgreementRecord> {
  const response = await api.post("/admin/agreement", dto);
  return unwrapData<AgreementRecord>(response);
}

export async function sendAgreementForSignature(
  id: number,
): Promise<AgreementRecord> {
  const response = await api.patch(`/admin/agreement/${id}/send`);
  return unwrapData<AgreementRecord>(response);
}

export async function getAgreementsMine(
  opts?: string | AgreementListParams,
): Promise<AgreementRecord[]> {
  const raw: AgreementListParams =
    typeof opts === "string" ? { franchiseId: opts || undefined } : opts ?? {};
  const params: AgreementListParams = {
    page: raw.page ?? 1,
    limit: raw.limit ?? 5000,
    ...raw,
  };
  const response = await api.get("/agreement", {
    params: compactRequestParams(
      params as Record<string, string | number | boolean | undefined | null>,
    ),
  });
  const result = unwrapData<unknown>(response);
  const { rows } = normalizePaginatedResult<AgreementRecord>(result);
  return rows;
}

export async function getAgreementMine(id: number): Promise<AgreementRecord> {
  const response = await api.get(`/agreement/${id}`);
  return unwrapData<AgreementRecord>(response);
}

export async function getReceivablePlanMine(
  agreementId: number,
): Promise<ReceivableInstallmentSummary | null> {
  const response = await api.get(`/receivables/agreement/${agreementId}/plan`);
  return unwrapData<ReceivableInstallmentSummary | null>(response);
}

/** Multipart: field name `signature` (ipa-new). */
export async function submitFranchiseeSignatureImage(
  agreementId: number,
  file: File,
): Promise<AgreementRecord> {
  const formData = new FormData();
  formData.append("signature", file);
  const response = await api.post(`/agreement/${agreementId}/sign`, formData);
  return unwrapData<AgreementRecord>(response);
}

/**
 * Sign without re-uploading: the backend reuses the franchisee's stored
 * signature (`franchisee.franchiseeSignature`). Sends `useExisting=true` so
 * the controller takes the "no upload required" branch.
 */
export async function submitFranchiseeSignatureWithStored(
  agreementId: number,
): Promise<AgreementRecord> {
  const formData = new FormData();
  formData.append("useExisting", "true");
  const response = await api.post(`/agreement/${agreementId}/sign`, formData);
  return unwrapData<AgreementRecord>(response);
}

// -----------------------------------------------------------------------------
// Admin agreement lifecycle endpoints (post-refactor):
//   - POST /admin/agreement/:id/suspend     Valid → Suspended
//   - POST /admin/agreement/:id/reactivate  Suspended → Valid
//   - POST /admin/agreement/:id/void        any non-terminal → Void
// All three return the updated `AgreementRecord`.
// -----------------------------------------------------------------------------

export async function suspendAgreementAdmin(
  agreementId: number,
  reason?: string,
): Promise<AgreementRecord> {
  const response = await api.post(`/admin/agreement/${agreementId}/suspend`, {
    reason,
  });
  return unwrapData<AgreementRecord>(response);
}

export async function reactivateAgreementAdmin(
  agreementId: number,
): Promise<AgreementRecord> {
  const response = await api.post(
    `/admin/agreement/${agreementId}/reactivate`,
    {},
  );
  return unwrapData<AgreementRecord>(response);
}

export async function voidAgreementAdmin(
  agreementId: number,
  reason?: string,
): Promise<AgreementRecord> {
  const response = await api.post(`/admin/agreement/${agreementId}/void`, {
    reason,
  });
  return unwrapData<AgreementRecord>(response);
}


const DEFAULT_API_PUBLIC_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5500";

function storedSignatureToPublicPath(
  stored: string | null | undefined,
): string | null {
  if (stored == null || String(stored).trim() === "") return null;
  const s = String(stored).trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("data:")) return null;
  const rel = s.replace(/^\/+/, "");
  if (!rel) return null;
  return `/uploads/${rel}`;
}

/**
 * Resolve a renderable URL from a franchisee's `franchiseeSignature` field
 * (raw stored path on the profile). Returns null when no signature exists.
 */
export function franchiseeProfileSignatureSrc(
  storedPath: string | null | undefined,
): string | null {
  const path = storedSignatureToPublicPath(storedPath);
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = DEFAULT_API_PUBLIC_BASE.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** ipa-new: no schedule PDF endpoint yet — noop for type compatibility */
function parseDownloadFilename(contentDisposition: string | undefined): string {
  if (!contentDisposition) return "schedule-b.pdf";
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }
  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }
  return "schedule-b.pdf";
}

async function downloadScheduleBPdf(url: string): Promise<void> {
  const response = await api.get(url, {
    responseType: "blob",
  });
  const blob =
    response.data instanceof Blob
      ? response.data
      : new Blob([response.data], { type: "application/pdf" });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = parseDownloadFilename(
    response.headers["content-disposition"] as string | undefined,
  );
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export async function downloadScheduleBPdfAdmin(
  agreementId: number,
): Promise<void> {
  await downloadScheduleBPdf(`/admin/agreement/${agreementId}/schedule-b-pdf`);
}

export async function downloadScheduleBPdfMine(
  agreementId: number,
): Promise<void> {
  await downloadScheduleBPdf(`/agreement/${agreementId}/schedule-b-pdf`);
}

/**
 * Switcher row lifecycle status. Post-refactor, the agreement IS the
 * lifecycle, so this is mostly a pass-through over `AgreementStatus`. The
 * extra `"Pending"` value represents a Pending program request that doesn't
 * yet have an agreement attached (admin hasn't acted).
 */
export type AgreementLifecycleStatus =
  | "Pending"
  | "Draft"
  | "Approved"
  | "Valid"
  | "Suspended"
  | "Void"
  | "Rejected";

/** One row in the agreement switcher feed (mirrors backend `AgreementSwitcherItem`). */
export interface AgreementSwitcherItem {
  kind: "agreement" | "request";
  agreementId: number | null;
  programRequestId: number | null;
  franchiseId: string;
  programId: number | null;
  programName: string | null;
  programCode: string | null;
  agreementType: "NEW_FRANCHISE" | "NEW_PROGRAM" | "RENEWAL" | null;
  lifecycleStatus: AgreementLifecycleStatus;
  /** True once franchisee has signed (independent of `lifecycleStatus`). */
  signed?: boolean;
  title: string | null;
  tenureMonths: number | null;
  expiresAt: string | null;
  signedAt: string | null;
  createdAt: string | null;
}

/** GET /agreement/switcher — switcher feed for the active franchise. */
export async function getAgreementSwitcherMine(): Promise<AgreementSwitcherItem[]> {
  const response = await api.get("/agreement/switcher");
  return unwrapData<AgreementSwitcherItem[]>(response);
}

/** GET /admin/agreement/franchise/:franchiseId/switcher — admin switcher feed. */
export async function getAgreementSwitcherAdmin(
  franchiseId: string,
): Promise<AgreementSwitcherItem[]> {
  const response = await api.get(
    `/admin/agreement/franchise/${encodeURIComponent(franchiseId)}/switcher`,
  );
  return unwrapData<AgreementSwitcherItem[]>(response);
}

export function agreementSignatureSrc(
  record: Pick<AgreementRecord, "franchiseeSignatureUrl" | "franchiseeSignature">,
): string | null {
  const fromUrl = record.franchiseeSignatureUrl?.trim();
  let path: string | null = null;
  if (fromUrl) {
    path =
      fromUrl.startsWith("http://") || fromUrl.startsWith("https://")
        ? fromUrl
        : fromUrl.startsWith("/")
          ? fromUrl
          : `/${fromUrl}`;
  } else {
    path = storedSignatureToPublicPath(record.franchiseeSignature);
  }
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const base = DEFAULT_API_PUBLIC_BASE.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
