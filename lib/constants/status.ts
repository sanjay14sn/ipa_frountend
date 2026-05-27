/**
 * lib/constants/status.ts — Franchise lifecycle status values.
 *
 * Using these constants rather than inline strings prevents typos and makes
 * exhaustive switches easier to write.
 */

export const FranchiseStatus = {
  ACTIVE: "Active",
  PENDING: "Pending",
  SUSPENDED: "Suspended",
  VOID: "Void",
} as const;

export type FranchiseStatusValue =
  (typeof FranchiseStatus)[keyof typeof FranchiseStatus];

/** Returns true when the franchise has completed onboarding and is live. */
export function isFranchiseActive(status: string | undefined | null): boolean {
  return status === FranchiseStatus.ACTIVE;
}

/** Returns true when the franchise needs to complete onboarding/signing. */
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
