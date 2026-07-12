"use client";

import { StatusBadge, type StatusTone } from "@/components/shared";
import type { AgreementLifecycleStatus } from "@/services/agreement.service";

interface LifecycleStatusBadgeProps {
  status: AgreementLifecycleStatus;
  /**
   * The agreement's signed boolean. When `status === 'APPROVED' && signed`,
   * the badge renders as "Signed · awaiting payment" (success tone) — a
   * derived sub-state representing "signing done, payment is the only gate".
   */
  signed?: boolean;
  className?: string;
}

/**
 * Tone for each lifecycle status (UPPER_SNAKE agreement statuses + the
 * request-only "Pending"):
 *   - info     → in-flight / waiting (Pending)
 *   - warning  → admin done, franchisee action needed (APPROVED) / paused (SUSPENDED)
 *   - success  → in force (ACTIVE)
 *   - destructive → expired (EXPIRED)
 *   - neutral  → terminal / historical / inactive (VOID, SUPERSEDED, DRAFT)
 */
const STATUS_TONE: Record<AgreementLifecycleStatus, StatusTone> = {
  Pending: "info",
  DRAFT: "neutral",
  APPROVED: "warning",
  ACTIVE: "success",
  SUSPENDED: "warning",
  VOID: "neutral",
  EXPIRED: "destructive",
  SUPERSEDED: "neutral",
};

/** Prettified label per status ("ACTIVE" → "Active"; "Pending" unchanged). */
const STATUS_LABEL: Record<AgreementLifecycleStatus, string> = {
  Pending: "Pending",
  DRAFT: "Draft",
  APPROVED: "Approved",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  VOID: "Void",
  EXPIRED: "Expired",
  SUPERSEDED: "Superseded",
};

export function LifecycleStatusBadge({
  status,
  signed,
  className,
}: LifecycleStatusBadgeProps) {
  if (status === "APPROVED" && signed) {
    return (
      <StatusBadge
        tone="success"
        label="Signed · awaiting payment"
        className={className}
      />
    );
  }
  return (
    <StatusBadge
      tone={STATUS_TONE[status] ?? "warning"}
      label={STATUS_LABEL[status] ?? status}
      className={className}
    />
  );
}
