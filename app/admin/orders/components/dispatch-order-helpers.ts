import type { DispatchOrderItemAdmin } from "@/services/order.service";

export function dispatchLevelLabel(d: DispatchOrderItemAdmin): string {
  const code = d.levelCode?.trim();
  const name = d.levelName?.trim();
  if (code && name && code !== name) return `${code} — ${name}`;
  return code || name || "—";
}

/** Orders that ship certificates/IDs only (no material invoice). */
export function isStandaloneDispatchOrderType(orderType: string): boolean {
  return (
    orderType === "CERTIFICATE_DISPATCH" ||
    orderType === "ID_CARD_DISPATCH"
  );
}
