"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type StatusTone =
  | "success"
  | "warning"
  | "destructive"
  | "neutral"
  | "info";

const toneClasses: Record<StatusTone, { pill: string; dot: string }> = {
  success: {
    pill: "bg-success-soft text-success-soft-foreground hover:bg-success-soft",
    dot: "bg-success",
  },
  warning: {
    pill: "bg-warning-soft text-warning-soft-foreground hover:bg-warning-soft",
    dot: "bg-warning",
  },
  destructive: {
    pill: "bg-destructive-soft text-destructive-soft-foreground hover:bg-destructive-soft",
    dot: "bg-destructive",
  },
  neutral: {
    pill: "bg-muted text-muted-foreground hover:bg-muted",
    dot: "bg-muted-foreground",
  },
  info: {
    pill: "bg-info-soft text-info-soft-foreground hover:bg-info-soft",
    dot: "bg-info",
  },
};

const LABEL_TONE_MAP: Record<string, StatusTone> = {
  // success
  active: "success",
  approved: "success",
  completed: "success",
  complete: "success",
  verified: "success",
  paid: "success",
  issued: "success",
  fulfilled: "success",
  success: "success",
  delivered: "success",
  passed: "success",
  enrolled: "success",
  signed: "success",
  granted: "success",
  ready: "success",
  valid: "success",
  received: "success",
  // warning
  pending: "warning",
  "in progress": "warning",
  "in training": "warning",
  processing: "warning",
  waiting: "warning",
  draft: "warning",
  "in review": "warning",
  review: "warning",
  hold: "warning",
  partial: "warning",
  requested: "warning",
  "at risk": "warning",
  "partially received": "warning",
  "pending signature": "warning",
  // destructive
  rejected: "destructive",
  suspended: "destructive",
  failed: "destructive",
  canceled: "destructive",
  cancelled: "destructive",
  blocked: "destructive",
  expired: "destructive",
  unpaid: "destructive",
  overdue: "destructive",
  invalidated: "destructive",
  // neutral
  inactive: "neutral",
  void: "neutral",
  archived: "neutral",
  closed: "neutral",
  none: "neutral",
  unknown: "neutral",
  refunded: "neutral",
  waived: "neutral",
  "not issued": "neutral",
  // info
  submitted: "info",
  new: "info",
  open: "info",
  extended: "info",
  reactivated: "info",
  confirmed: "info",
  "ready to ship": "info",
  // Deliberate remap (CMP-06): shipped = in transit = info; delivered stays success.
  shipped: "info",
};

/**
 * Resolve a raw status label to its tone: trim → lowercase → overrides →
 * LABEL_TONE_MAP → "neutral".
 */
export function resolveStatusTone(
  label: string,
  overrides?: Record<string, StatusTone>,
): StatusTone {
  const normalized = label.trim().toLowerCase();
  return overrides?.[normalized] ?? LABEL_TONE_MAP[normalized] ?? "neutral";
}

/**
 * Normalize enum-style values for display: underscores and camelCase
 * boundaries → spaces ("READY_TO_SHIP" → "ready to ship",
 * "PendingSignature" → "pending signature"). StatusBadge's own
 * capitalization normalizes casing at render.
 */
export function formatStatusLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  showDot?: boolean;
  className?: string;
}

function toCapitalized(raw: string): string {
  // Normalize input like "PAID", "backordered", "in progress" to "Paid",
  // "Backordered", "In Progress" so every status pill across the app reads
  // the same way regardless of the upstream casing.
  return raw
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word.length === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join(" ");
}

interface OnFileBadgeProps {
  label?: string;
  className?: string;
}

/**
 * Soft success outline pill used for "attached / captured / uploaded" cues
 * (signatures on file, document captured, etc.). Distinct from full status —
 * this is for binary "present vs absent" indicators inside detail cards.
 */
export function OnFileBadge({ label = "On file", className }: OnFileBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-success/20 bg-success-soft py-0 text-[10px] text-success-soft-foreground",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      {label}
    </Badge>
  );
}

export function StatusBadge({
  label,
  tone,
  showDot = true,
  className,
}: StatusBadgeProps) {
  const resolvedTone: StatusTone = tone ?? resolveStatusTone(label);
  const styles = toneClasses[resolvedTone];
  return (
    <Badge
      className={cn(
        // Locked-in dimensions so every status badge across the app sits at the
        // same height (h-6), padding, font weight, and line-height — no matter
        // which tone or label length is rendered. Labels are normalized to
        // Capitalized Case (first letter of each word) for visual uniformity.
        "inline-flex h-6 items-center justify-center gap-1 rounded-full border-0 px-2.5 text-xs font-normal leading-none",
        styles.pill,
        className,
      )}
    >
      {showDot ? (
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", styles.dot)} />
      ) : null}
      <span className="leading-none">{toCapitalized(label)}</span>
    </Badge>
  );
}
