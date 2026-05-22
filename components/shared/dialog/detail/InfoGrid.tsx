"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { DIALOG_TOKENS } from "../tokens"

export interface InfoGridProps {
  /** Number of columns at lg+ breakpoint. Default 4. */
  cols?: 2 | 3 | 4
  className?: string
  children: React.ReactNode
}

const COL_CLASS: Record<2 | 3 | 4, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
}

/**
 * Responsive row of stat tiles. Container for one or more <InfoGridCard /> children.
 * Degrades from N cols → 2 → 1 across breakpoints.
 */
export function InfoGrid({ cols = 4, className, children }: InfoGridProps) {
  return (
    <div
      className={cn(
        "grid",
        COL_CLASS[cols],
        DIALOG_TOKENS.infoGridWrap,
        className
      )}
    >
      {children}
    </div>
  )
}
