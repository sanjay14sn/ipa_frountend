"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgreementLifecycleStatus } from "@/services/agreement.service";

interface LifecycleStatusBadgeProps {
  status: AgreementLifecycleStatus;
  className?: string;
}

/**
 * Visual treatment for each lifecycle status.
 *
 * Color rationale:
 *   - Blue   → in-flight / waiting (Pending)
 *   - Amber  → admin done, franchisee action needed (Approved)
 *   - Green  → in force (Valid)
 *   - Orange → temporarily paused (Suspended)
 *   - Red    → action rejected (Rejected)
 *   - Gray   → terminal / inactive (Void, Draft)
 */
const STATUS_STYLES: Record<
  AgreementLifecycleStatus,
  { label: string; classes: string }
> = {
  Pending: {
    label: "Pending",
    classes: "border-transparent bg-blue-100 text-blue-800",
  },
  Draft: {
    label: "Draft",
    classes: "border-transparent bg-gray-100 text-gray-700",
  },
  Approved: {
    label: "Approved",
    classes: "border-transparent bg-amber-100 text-amber-800",
  },
  Valid: {
    label: "Valid",
    classes: "border-transparent bg-green-100 text-green-800",
  },
  Suspended: {
    label: "Suspended",
    classes: "border-transparent bg-orange-100 text-orange-800",
  },
  Void: {
    label: "Void",
    classes: "border-transparent bg-gray-200 text-gray-700",
  },
  Rejected: {
    label: "Rejected",
    classes: "border-transparent bg-red-100 text-red-800",
  },
};

/**
 * Renders the single user-facing agreement lifecycle status. After the
 * refactor this maps 1:1 to `agreement.status`, so the badge is effectively
 * showing the agreement's own status to the user.
 */
export function LifecycleStatusBadge({ status, className }: LifecycleStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.Approved;
  return (
    <Badge className={cn("text-xs font-medium", style.classes, className)}>
      {style.label}
    </Badge>
  );
}
