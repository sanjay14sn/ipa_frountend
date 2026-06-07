"use client";

import { StatusBadge, type StatusTone } from "@/components/shared";
import type { AgreementLifecycleStatus } from "@/services/agreement.service";

interface LifecycleStatusBadgeProps {
  status: AgreementLifecycleStatus;
  /**
   * The agreement's signed boolean. When `status === 'Approved' && signed`,
   * the badge renders as "Signed · awaiting payment" (success tone) — a
   * derived sub-state representing "signing done, payment is the only gate".
   */
  signed?: boolean;
  className?: string;
}

/**
 * Tone for each lifecycle status:
 *   - info     → in-flight / waiting (Pending)
 *   - warning  → admin done, franchisee action needed (Approved) / paused (Suspended)
 *   - success  → in force (Valid)
 *   - destructive → action rejected (Rejected) / expired (Expired)
 *   - neutral  → terminal / inactive (Void, Draft)
 */
const STATUS_TONE: Record<AgreementLifecycleStatus, StatusTone> = {
  Pending: "info",
  Draft: "neutral",
  Approved: "warning",
  Valid: "success",
  Suspended: "warning",
  Void: "neutral",
  Rejected: "destructive",
  Expired: "destructive",
};

export function LifecycleStatusBadge({
  status,
  signed,
  className,
}: LifecycleStatusBadgeProps) {
  if (status === "Approved" && signed) {
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
      label={status}
      className={className}
    />
  );
}
