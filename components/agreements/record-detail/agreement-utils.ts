import { format, parseISO } from "date-fns";
import { GST_RATE_LABEL, getFranchiseFeePayable } from "@/lib/gst";
import { formatRupees } from "@/lib/currency-utils";
import {
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

export function formatFranchiseFee(
  data: Pick<AgreementScheduleBView, "franchiseFee" | "gstFranchiseFee">,
): string {
  const payable = getFranchiseFeePayable(data.franchiseFee, data.gstFranchiseFee);
  if (payable.inclusive) {
    return `${formatRupees(payable.base)} (GST inclusive)`;
  }
  return `${formatRupees(payable.base)} + ${GST_RATE_LABEL} (${formatRupees(payable.payable)} payable)`;
}

/** Same shape as `formatFranchiseFee` but reads the material-cost GST flag. */
export function formatMaterialCharges(
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

export function paymentStatusTone(status: string | null | undefined) {
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
