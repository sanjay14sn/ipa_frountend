"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { DIALOG_TOKENS } from "../tokens"

export interface DialogProgressCardProps {
  title: React.ReactNode
  /** 0..100 */
  value: number
  /** Right-aligned percentage label override; defaults to `${Math.round(value)}%` */
  valueLabel?: React.ReactNode
  /** Single-line summary below the bar (e.g. "3 of 5 levels complete") */
  summary?: React.ReactNode
  /** Render extra content under the bar (e.g. paid/outstanding metadata) */
  children?: React.ReactNode
  variant?: "primary" | "success"
  className?: string
}

/**
 * Progress card used in detail dialogs (training progress, EMI progress, etc).
 * Uses shadcn Progress with brand-green fill.
 */
export function DialogProgressCard({
  title,
  value,
  valueLabel,
  summary,
  children,
  className,
}: DialogProgressCardProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={cn(DIALOG_TOKENS.progressCardWrap, className)}>
      <div className={DIALOG_TOKENS.progressCardTitleRow}>
        <div className="text-sm font-semibold text-card-foreground min-w-0 truncate">
          {title}
        </div>
        <div className="text-sm font-semibold text-primary shrink-0">
          {valueLabel ?? `${Math.round(clamped)}%`}
        </div>
      </div>
      <Progress value={clamped} className="h-2" />
      {summary ? (
        <div className="text-xs text-muted-foreground">{summary}</div>
      ) : null}
      {children}
    </div>
  )
}
