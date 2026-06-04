/**
 * lib/constants/status.ts — Franchise lifecycle status values.
 *
 * Using these constants rather than inline strings prevents typos and makes
 * exhaustive switches easier to write.
 */

/**
 * Franchise application-review status values. Operational standing
 * (whether the franchise is "live") is NO LONGER a franchise status — it is
 * derived from agreements; use `isFranchiseOperational` from `lib/auth` for that.
 */
export const FranchiseStatus = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
} as const;

export type FranchiseStatusValue =
  (typeof FranchiseStatus)[keyof typeof FranchiseStatus];

/** Returns true when the franchise still needs admin approval. */
export function isFranchisePending(
  status: string | undefined | null,
): boolean {
  return status === FranchiseStatus.PENDING;
}

// ---------------------------------------------------------------------------
// Order status
// ---------------------------------------------------------------------------

export const OrderStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
} as const;

export type OrderStatusValue = (typeof OrderStatus)[keyof typeof OrderStatus];

// ---------------------------------------------------------------------------
// Agreement lifecycle status (post-refactor)
// ---------------------------------------------------------------------------

export const AgreementStatus = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  VALID: "Valid",
  SUSPENDED: "Suspended",
  VOID: "Void",
} as const;

export type AgreementStatusValue =
  (typeof AgreementStatus)[keyof typeof AgreementStatus];
