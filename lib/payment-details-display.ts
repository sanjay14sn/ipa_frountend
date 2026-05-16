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

export function normalizeMethod(method?: string | null): string {
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

export function formatRsAmount(value?: number | null, currency = "INR") {
  if (value == null || Number.isNaN(Number(value))) return "N/A";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `Rs. ${Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

export function boolToYesNo(value?: boolean) {
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
    fields.push({ label: "Card Last 4", value: card?.last4 ? `**** ${card.last4}` : "N/A" });
    fields.push({ label: "Card Network", value: card?.network || "N/A" });
    fields.push({ label: "Card Type", value: card?.type || "N/A" });
    fields.push({ label: "Card Issuer", value: card?.issuer || "N/A" });
    fields.push({ label: "International", value: boolToYesNo(card?.international) });
    fields.push({ label: "EMI", value: boolToYesNo(card?.emi) });
  } else if (method === "upi") {
    fields.push({ label: "UPI VPA", value: payment.vpa || "N/A" });
  } else if (method === "netbanking") {
    fields.push({ label: "Bank Code", value: payment.bank || "N/A" });
  } else if (method === "wallet") {
    fields.push({ label: "Wallet", value: payment.wallet || "N/A" });
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

  if (fields.length === 0) {
    fields.push({ label: "Method details", value: "N/A" });
  }

  return fields;
}
