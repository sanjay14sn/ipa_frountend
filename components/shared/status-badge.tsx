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
    pill: "bg-primary text-primary-foreground hover:bg-primary",
    dot: "bg-primary-foreground",
  },
  warning: {
    pill: "bg-amber-100 text-amber-900 hover:bg-amber-100",
    dot: "bg-amber-500",
  },
  destructive: {
    pill: "bg-red-100 text-red-900 hover:bg-red-100",
    dot: "bg-red-500",
  },
  neutral: {
    pill: "bg-muted text-muted-foreground hover:bg-muted",
    dot: "bg-muted-foreground",
  },
  info: {
    pill: "bg-sky-100 text-sky-900 hover:bg-sky-100",
    dot: "bg-sky-500",
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
  shipped: "success",
  issued: "success",
  fulfilled: "success",
  success: "success",
  delivered: "success",
  passed: "success",
  enrolled: "success",
  signed: "success",
  granted: "success",
  ready: "success",
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
  // neutral
  inactive: "neutral",
  archived: "neutral",
  closed: "neutral",
  none: "neutral",
  unknown: "neutral",
  // info
  submitted: "info",
  new: "info",
  open: "info",
};

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

export function StatusBadge({
  label,
  tone,
  showDot = true,
  className,
}: StatusBadgeProps) {
  const resolvedTone: StatusTone =
    tone ?? LABEL_TONE_MAP[label.trim().toLowerCase()] ?? "neutral";
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
