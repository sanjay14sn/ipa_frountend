"use client";

import { StatusBadge, type StatusTone } from "@/components/shared";
import type { AgreementLifecycleStatus } from "@/services/agreement.service";

interface LifecycleStatusBadgeProps {
  status: AgreementLifecycleStatus;
  className?: string;
}

/**
 * Tone for each lifecycle status:
 *   - info     → in-flight / waiting (Pending)
 *   - warning  → admin done, franchisee action needed (Approved) / paused (Suspended)
 *   - success  → in force (Valid)
 *   - destructive → action rejected (Rejected)
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
};

export function LifecycleStatusBadge({ status, className }: LifecycleStatusBadgeProps) {
  return (
    <StatusBadge
      tone={STATUS_TONE[status] ?? "warning"}
      label={status}
      className={className}
    />
  );
}
