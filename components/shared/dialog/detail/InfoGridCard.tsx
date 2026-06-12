"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { DIALOG_TOKENS } from "../tokens"

export interface InfoGridCardProps {
  label: React.ReactNode
  value: React.ReactNode
  /** Lucide icon rendered next to the label */
  icon?: LucideIcon
  /** Subtle helper text under the value */
  hint?: React.ReactNode
  className?: string
}

/**
 * Single stat tile inside an InfoGrid. Renders an uppercase label and a prominent value.
 * Pattern matches the 4-card info row in Program Agreement / CI Agreement modals.
 */
function InfoGridCard({
  label,
  value,
  icon: Icon,
  hint,
  className,
}: InfoGridCardProps) {
  return (
    <div className={cn(DIALOG_TOKENS.infoCardWrap, className)}>
      <div className={DIALOG_TOKENS.infoCardLabel}>
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        <span>{label}</span>
      </div>
      <div className={DIALOG_TOKENS.infoCardValue}>{value}</div>
      {hint ? (
        <div className="text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  )
}
