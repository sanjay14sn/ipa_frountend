import { format, parseISO } from "date-fns";
import { GST_RATE_LABEL, getFranchiseFeePayable } from "@/lib/gst";
import { formatRupees } from "@/lib/currency-utils";
import {
  type AgreementRecord,
  type AgreementScheduleBView,
  type ReceivableCompactSummary,
  type ReceivableFranchiseeSummary,
  type ReceivableInstallmentSummary,
} from "@/services/agreement.service";

// ── Local types ──────────────────────────────────────────────────────────────

export type BadgeTone = "default" | "secondary" | "outline" | "destructive";

// ── Pure helpers ─────────────────────────────────────────────────────────────

export function fmtShortDate(value: string | null | undefined): string {
  if (value == null || value === "") return "-";
  try {
    const d = typeof value === "string" ? parseISO(value) : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return format(d, "PP");
  } catch {
    return String(value);
  }
}

function formatFranchiseFee(
  data: Pick<AgreementScheduleBView, "franchiseFee" | "gstFranchiseFee">,
): string {
  const payable = getFranchiseFeePayable(data.franchiseFee, data.gstFranchiseFee);
  if (payable.inclusive) {
    return `${formatRupees(payable.base)} (GST inclusive)`;
  }
  return `${formatRupees(payable.base)} + ${GST_RATE_LABEL} (${formatRupees(payable.payable)} payable)`;
}

/** Same shape as `formatFranchiseFee` but reads the material-cost GST flag. */
function formatMaterialCharges(
  data: Pick<AgreementScheduleBView, "materialCost" | "gstMaterialCost">,
): string {
  const inclusive = data.gstMaterialCost !== false;
  if (inclusive) {
    return `${formatRupees(data.materialCost)} (GST inclusive)`;
  }
  const payable = getFranchiseFeePayable(data.materialCost, false);
  return `${formatRupees(payable.base)} + ${GST_RATE_LABEL} (${formatRupees(payable.payable)} payable)`;
}

export function prettifyToken(value: string | null | undefined): string {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function paymentStatusTone(status: string | null | undefined) {
  switch ((status ?? "").toLowerCase()) {
    case "completed":
    case "captured":
    case "paid":
      return "default";
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}

export function isFullInstallmentSummary(
  summary:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null
    | undefined,
): summary is ReceivableInstallmentSummary {
  return Boolean(summary && "items" in summary && Array.isArray(summary.items));
}

export function hasReceivablePlan(
  summary:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null
    | undefined,
): boolean {
  if (!summary) return false;
  return !("hasPlan" in summary) || Boolean(summary.hasPlan);
}

/**
 * Lifecycle badge for an agreement. The new contract (post-refactor):
 *   - `agreement.signed` is the single source of truth for "signed".
 *   - `agreement.status === 'Valid'` only after BOTH signed AND payment-linked.
 * The combo `status='Approved' && signed=true` means "signed, awaiting payment"
 * — a real intermediate state that was previously rendered as plain "Approved".
 */
export function agreementStatusBadge(
  status: string | null | undefined,
  signed: boolean | undefined,
): { label: string; tone: BadgeTone } {
  switch (status) {
    case "Valid":
    case "Signed": // legacy alias — same tone
      return { label: "Valid", tone: "default" };
    case "Approved":
    case "PendingSignature": // legacy alias — same family
      return signed
        ? { label: "Signed · awaiting payment", tone: "default" }
        : { label: "Approved · awaiting signature", tone: "secondary" };
    case "Suspended":
      return { label: "Suspended", tone: "secondary" };
    case "Void":
    case "Expired":
      return { label: "Void", tone: "destructive" };
    case "Draft":
      return { label: "Draft", tone: "outline" };
    default:
      return { label: status ?? "-", tone: "secondary" };
  }
}

// ── Status normalization + action visibility ─────────────────────────────────

export type NormalizedAgreementStatus =
  | "Draft"
  | "Approved"
  | "Valid"
  | "Suspended"
  | "Expired"
  | "Void";

/**
 * Collapse backend status aliases to a canonical set for UI logic.
 * `Signed`→`Valid`, `PendingSignature`→`Approved`. `Expired` is kept DISTINCT
 * from `Void` because expired agreements are still renewable. Unknown values
 * fall through unchanged so action predicates simply match nothing.
 */
export function normalizeStatus(
  status: string | null | undefined,
): NormalizedAgreementStatus {
  switch (status) {
    case "Valid":
    case "Signed":
      return "Valid";
    case "Approved":
    case "PendingSignature":
      return "Approved";
    case "Suspended":
      return "Suspended";
    case "Expired":
      return "Expired";
    case "Void":
      return "Void";
    case "Draft":
      return "Draft";
    default:
      return (status ?? "Draft") as NormalizedAgreementStatus;
  }
}

export interface AgreementActionVisibility {
  download: boolean;
  manageKitItems: boolean;
  franchiseKitEditor: boolean;
  dispatchKit: boolean;
  /** NEW_FRANCHISE + Valid + already dispatched — render a disabled "Kit dispatched" pill. */
  kitDispatched: boolean;
  suspend: boolean;
  reactivate: boolean;
  void: boolean;
  renew: boolean;
}

/**
 * Pure predicate for which agreement actions are available, given role + the
 * agreement's normalized status and type. Kept side-effect free for unit tests.
 */
export function getAgreementActionVisibility(
  agreement: Pick<
    AgreementRecord,
    | "type"
    | "status"
    | "programId"
    | "franchiseId"
    | "materialsDispatched"
    | "receivables"
  >,
  role: "admin" | "franchisee",
): AgreementActionVisibility {
  if (role !== "admin") {
    return {
      download: agreementOutstandingEmi(agreement as AgreementRecord) <= 0,
      manageKitItems: false,
      franchiseKitEditor: false,
      dispatchKit: false,
      kitDispatched: false,
      suspend: false,
      reactivate: false,
      void: false,
      renew: false,
    };
  }

  const status = normalizeStatus(agreement.status);
  const isNewFranchise = agreement.type === "NEW_FRANCHISE";
  const hasProgram = agreement.programId != null;
  const dispatched = Boolean(agreement.materialsDispatched);

  return {
    download: true,
    manageKitItems: hasProgram && status !== "Void",
    franchiseKitEditor:
      isNewFranchise && Boolean(agreement.franchiseId) && hasProgram,
    dispatchKit: isNewFranchise && status === "Valid" && !dispatched,
    kitDispatched: isNewFranchise && status === "Valid" && dispatched,
    suspend: status === "Valid",
    reactivate: status === "Suspended",
    void:
      status === "Draft" ||
      status === "Approved" ||
      status === "Valid" ||
      status === "Suspended",
    renew: status === "Expired",
  };
}

/**
 * Outstanding EMI (payable, i.e. principal + GST when available) for one
 * agreement. Guards both receivable summary shapes: the full
 * `ReceivableInstallmentSummary` nests totals under `totals`, while the
 * compact/franchisee summaries expose the figures at the top level.
 */
export function agreementOutstandingEmi(agreement: AgreementRecord): number {
  const summary = agreement.receivables?.installmentSummary;
  if (!summary) return 0;
  if (isFullInstallmentSummary(summary)) {
    return (
      summary.totals.payableOutstandingAmount ??
      summary.totals.outstandingAmount ??
      0
    );
  }
  return summary.payableOutstandingAmount ?? summary.outstandingAmount ?? 0;
}
