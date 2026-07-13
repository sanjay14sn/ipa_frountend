import { formatCurrencyAmount } from "@/lib/currency-utils";

export type MethodSpecificField = {
  label: string;
  value: string;
};

/** Shape needed for method-specific + acquirer ref fields (admin payments + order payment). */
export type PaymentMethodDetailsInput = {
  method?: string | null;
  vpa?: string | null;
  bank?: string | null;
  wallet?: string | null;
  acquirerData?: Record<string, unknown> | null;
};

export function orderTypeLabel(type?: string | null): string {
  switch ((type ?? "").trim().toUpperCase()) {
    case "STUDENT_LEVEL_REQUEST":
      return "Level Request";
    case "STUDENT_CUSTOM_ORDER":
      return "Custom Order";
    case "CI_TRAINING":
      return "CI Training";
    case "CERTIFICATE_DISPATCH":
      return "Certificate Dispatch";
    case "ID_CARD_DISPATCH":
      return "ID Card Dispatch";
    case "FRANCHISE_KIT":
      return "Franchise Kit";
    default:
      return type ? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Order";
  }
}

export function orderTypeBadgeClass(type?: string | null): string {
  switch ((type ?? "").trim().toUpperCase()) {
    case "STUDENT_LEVEL_REQUEST":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "STUDENT_CUSTOM_ORDER":
      return "bg-violet-100 text-violet-800 border-violet-200";
    case "CI_TRAINING":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "CERTIFICATE_DISPATCH":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "ID_CARD_DISPATCH":
      return "bg-teal-100 text-teal-800 border-teal-200";
    case "FRANCHISE_KIT":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

export function typeLabel(type?: string | null): string {
  switch ((type ?? "").trim().toUpperCase()) {
    case "CI_TRAINING_FEE":
      return "CI Training Fee";
    case "FRANCHISE_FEE":
      return "Franchise Fee";
    case "ORDER_PAYMENT":
      return "Order Payment";
    default:
      return type ? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Payment";
  }
}

export function typeBadgeClass(type?: string | null): string {
  switch ((type ?? "").trim().toUpperCase()) {
    case "CI_TRAINING_FEE":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "FRANCHISE_FEE":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "ORDER_PAYMENT":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

/**
 * Human label for an agreement's kind + origin ("FRANCHISE" + "RENEWAL" →
 * "Franchise Renewal"). The old `type` column (NEW_FRANCHISE/…) is gone.
 */
export function agreementTypeLabel(
  kind?: string | null,
  origin?: string | null,
): string {
  const kindLabel = (() => {
    switch ((kind ?? "").trim().toUpperCase()) {
      case "FRANCHISE":
        return "Franchise";
      case "PROGRAM":
        return "Program";
      case "CI":
        return "CI";
      default:
        return kind
          ? kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
          : "Agreement";
    }
  })();
  return (origin ?? "").trim().toUpperCase() === "RENEWAL"
    ? `${kindLabel} Renewal`
    : kindLabel;
}

export function agreementTypeBadgeClass(
  kind?: string | null,
  origin?: string | null,
): string {
  const isRenewal = (origin ?? "").trim().toUpperCase() === "RENEWAL";
  switch (isRenewal ? "RENEWAL" : (kind ?? "").trim().toUpperCase()) {
    case "RENEWAL":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "FRANCHISE":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "PROGRAM":
      return "bg-violet-100 text-violet-800 border-violet-200";
    case "CI":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function normalizeMethod(method?: string | null): string {
  return (method ?? "").trim().toLowerCase();
}

export function methodBadgeClass(method?: string | null): string {
  switch (normalizeMethod(method)) {
    case "card":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "upi":
      return "bg-green-100 text-green-800 border-green-200";
    case "netbanking":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "wallet":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "paylater":
      return "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200";
    case "emi":
      return "bg-teal-100 text-teal-800 border-teal-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

export function methodLabel(method?: string | null) {
  const value = normalizeMethod(method);
  if (!value) return "N/A";
  switch (value) {
    case "netbanking":
      return "Netbanking";
    case "paylater":
      return "Pay Later";
    default:
      return value.charAt(0).toUpperCase() + value.slice(1);
  }
}

export function formatPaymentDateTime(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN");
}

/** @deprecated Use formatRupees / formatCurrencyAmount from lib/currency-utils. */
export const formatRsAmount = formatCurrencyAmount;

function boolToYesNo(value?: boolean) {
  if (value == null) return "N/A";
  return value ? "Yes" : "No";
}

export function getMethodSpecificFields(
  payment: PaymentMethodDetailsInput,
): MethodSpecificField[] {
  const method = normalizeMethod(payment.method);
  const card = payment.acquirerData?.card as
    | {
        last4?: string;
        network?: string;
        type?: string;
        issuer?: string;
        international?: boolean;
        emi?: boolean;
      }
    | undefined;
  const acquirerRefs =
    (payment.acquirerData?.razorpayAcquirerData as Record<string, unknown>) ??
    undefined;

  const fields: MethodSpecificField[] = [];

  if (method === "card") {
    if (card?.last4) fields.push({ label: "Card Last 4", value: `**** ${card.last4}` });
    if (card?.network) fields.push({ label: "Card Network", value: card.network });
    if (card?.type) fields.push({ label: "Card Type", value: card.type });
    if (card?.issuer) fields.push({ label: "Card Issuer", value: card.issuer });
    if (card?.international != null) fields.push({ label: "International", value: boolToYesNo(card.international) });
    if (card?.emi != null) fields.push({ label: "EMI", value: boolToYesNo(card.emi) });
  } else if (method === "upi") {
    if (payment.vpa) fields.push({ label: "UPI VPA", value: payment.vpa });
  } else if (method === "netbanking") {
    if (payment.bank) fields.push({ label: "Bank Code", value: payment.bank });
  } else if (method === "wallet") {
    if (payment.wallet) fields.push({ label: "Wallet", value: payment.wallet });
  } else {
    if (payment.vpa) fields.push({ label: "UPI VPA", value: payment.vpa });
    if (payment.bank) fields.push({ label: "Bank Code", value: payment.bank });
    if (payment.wallet) fields.push({ label: "Wallet", value: payment.wallet });
  }

  if (acquirerRefs) {
    Object.entries(acquirerRefs).forEach(([key, value]) => {
      const display = String(value ?? "").trim();
      if (!display) return;
      fields.push({
        label: `Acquirer ${key.replaceAll("_", " ")}`,
        value: display,
      });
    });
  }

  return fields;
}
