"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { DIALOG_TOKENS } from "../tokens"

export interface DialogFormGridProps {
  /** Number of columns at sm+ breakpoint. On mobile always 1-col. Default 1. */
  cols?: 1 | 2 | 3
  /** Grid gap. Default "md" = gap-4. */
  gap?: "sm" | "md" | "lg"
  className?: string
  children: React.ReactNode
}

const COL_CLASS: Record<1 | 2 | 3, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
}

const GAP_CLASS: Record<"sm" | "md" | "lg", string> = {
  sm: DIALOG_TOKENS.gridGapSm,
  md: DIALOG_TOKENS.gridGap, // gap-3 — matches the rest of the popup chrome
  lg: DIALOG_TOKENS.gridGapLg,
}

/**
 * Responsive grid container for stacking DialogFormField children.
 * Always single-column on mobile; expands at sm/md per `cols`.
 */
export function DialogFormGrid({
  cols = 1,
  gap = "md",
  className,
  children,
}: DialogFormGridProps) {
  return (
    <div className={cn("grid", COL_CLASS[cols], GAP_CLASS[gap], className)}>
      {children}
    </div>
  )
}
