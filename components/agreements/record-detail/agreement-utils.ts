import { parseISO } from "date-fns";
import { formatDate } from "@/lib/date-utils";
import { GST_RATE_LABEL, getFranchiseFeePayable } from "@/lib/gst";
import { formatRupees } from "@/lib/currency-utils";
import {
  type AgreementRecord,
  type AgreementScheduleBView,
  type AgreementStatus,
  type ReceivableCompactSummary,
  type ReceivableFranchiseeSummary,
  type ReceivableInstallmentSummary,
} from "@/services/agreement.service";

// ── Local types ──────────────────────────────────────────────────────────────

export type BadgeTone = "default" | "secondary" | "outline" | "destructive";

// ── Pure helpers ─────────────────────────────────────────────────────────────

export function fmtShortDate(value: string | null | undefined): string {
  // Display formatting goes through the shared formatter (SW-P3);
  // "Jul 15, 2026" became "15 Jul 2026" app-wide with this change.
  if (value == null || value === "") return "-";
  try {
    const d = typeof value === "string" ? parseISO(value) : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return formatDate(d);
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
    case "refunded":
      return "secondary";
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
 * Lifecycle badge for an agreement (statuses are UPPER_SNAKE on the wire):
 *   - `agreement.signed` is the single source of truth for "signed".
 *   - `status === 'ACTIVE'` only after BOTH fully signed AND payment landed.
 * The combo `status='APPROVED' && signed=true` means "signed, awaiting
 * payment" — a real intermediate state rendered distinctly from "Approved".
 */
export function agreementStatusBadge(
  status: AgreementStatus | null | undefined,
  signed: boolean | undefined,
): { label: string; tone: BadgeTone } {
  switch (status) {
    case "ACTIVE":
      return { label: "Active", tone: "default" };
    case "APPROVED":
      return signed
        ? { label: "Signed · awaiting payment", tone: "default" }
        : { label: "Approved · awaiting signature", tone: "secondary" };
    case "SUSPENDED":
      return { label: "Suspended", tone: "secondary" };
    case "EXPIRED":
      return { label: "Expired", tone: "destructive" };
    case "VOID":
      return { label: "Void", tone: "destructive" };
    case "SUPERSEDED":
      return { label: "Superseded", tone: "secondary" };
    case "DRAFT":
      return { label: "Draft", tone: "outline" };
    default:
      return { label: status ?? "-", tone: "secondary" };
  }
}

// ── Action visibility ─────────────────────────────────────────────────────────

export interface AgreementActionVisibility {
  download: boolean;
  manageKitItems: boolean;
  franchiseKitEditor: boolean;
  dispatchKit: boolean;
  /** FRANCHISE kind + ACTIVE + already dispatched — render a disabled "Kit dispatched" pill. */
  kitDispatched: boolean;
  suspend: boolean;
  reactivate: boolean;
  void: boolean;
  renew: boolean;
  /**
   * Details/terms are editable before any signature lands (DRAFT, or APPROVED
   * unsigned); a superadmin may edit at any lifecycle point except
   * SUPERSEDED/VOID — mirrors the backend override on PATCH /admin/agreement/:id.
   */
  editTerms: boolean;
  /**
   * Admin offline collection of the LUMP-SUM fee: a signed APPROVED non-CI
   * agreement with a positive fee and no installment plan (installment fees
   * are recorded per schedule item instead).
   */
  recordFeePayment: boolean;
}

/**
 * Pure predicate for which agreement actions are available, given role + the
 * agreement's status and kind. SUPERSEDED rows are historical — download is
 * the only action they expose. Kept side-effect free for unit tests.
 */
export function getAgreementActionVisibility(
  agreement: Pick<
    AgreementRecord,
    | "kind"
    | "status"
    | "programId"
    | "franchiseId"
    | "materialsDispatched"
    | "receivables"
    | "signed"
    | "fullySigned"
    | "installment"
    | "franchiseFee"
  >,
  role: "admin" | "franchisee",
  opts: { superAdmin?: boolean } = {},
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
      editTerms: false,
      recordFeePayment: false,
    };
  }

  const status = agreement.status;
  const isFranchiseKind = agreement.kind === "FRANCHISE";
  const hasProgram = agreement.programId != null;
  const dispatched = Boolean(agreement.materialsDispatched);

  if (status === "SUPERSEDED") {
    return {
      download: true,
      manageKitItems: false,
      franchiseKitEditor: false,
      dispatchKit: false,
      kitDispatched: false,
      suspend: false,
      reactivate: false,
      void: false,
      renew: false,
      editTerms: false,
      recordFeePayment: false,
    };
  }

  const signed = Boolean(agreement.signed ?? agreement.fullySigned);

  return {
    download: true,
    manageKitItems: hasProgram && status !== "VOID",
    franchiseKitEditor:
      isFranchiseKind && Boolean(agreement.franchiseId) && hasProgram,
    dispatchKit: isFranchiseKind && status === "ACTIVE" && !dispatched,
    kitDispatched: isFranchiseKind && status === "ACTIVE" && dispatched,
    suspend: status === "ACTIVE",
    reactivate: status === "SUSPENDED",
    void:
      status === "DRAFT" ||
      status === "APPROVED" ||
      status === "ACTIVE" ||
      status === "SUSPENDED",
    // EXPIRED renews immediately; ACTIVE/SUSPENDED schedules the renewal, which
    // parks in DRAFT and is promoted the day the current term ends. Admins need
    // to prepare a renewal BEFORE expiry — waiting for the window to close
    // meant the franchisee lost access in the gap.
    renew: status === "EXPIRED" || status === "ACTIVE" || status === "SUSPENDED",
    // CI terms carry the training plan and are managed from the CI flows.
    // Superadmin bypasses the signature gate (SUPERSEDED early-returned above;
    // VOID stays locked — both are terminal on the backend too).
    editTerms:
      agreement.kind !== "CI" &&
      (opts.superAdmin
        ? status !== "VOID"
        : status === "DRAFT" || (status === "APPROVED" && !signed)),
    // "Signed · awaiting payment" — the backend re-validates all of this and
    // additionally rejects agreements that own a receivable plan.
    recordFeePayment:
      agreement.kind !== "CI" &&
      status === "APPROVED" &&
      signed &&
      agreement.installment !== true &&
      Number(agreement.franchiseFee ?? 0) > 0,
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
