"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { DIALOG_TOKENS } from "./tokens"

export type StateTone = "info" | "success" | "warning" | "destructive"

export interface DialogStateMessageProps {
  tone?: StateTone
  icon?: LucideIcon
  title: React.ReactNode
  description?: React.ReactNode
  /** Optional action(s) rendered under the description */
  action?: React.ReactNode
  className?: string
}

/**
 * Inline state message inside a dialog body — used for pending/loading/warning/info states
 * (e.g. "Request Already Pending" in request-franchise-modal).
 */
export function DialogStateMessage({
  tone = "info",
  icon: Icon,
  title,
  description,
  action,
  className,
}: DialogStateMessageProps) {
  return (
    <div
      className={cn(
        DIALOG_TOKENS.stateWrap,
        DIALOG_TOKENS.stateTone[tone],
        className
      )}
      role={tone === "destructive" || tone === "warning" ? "alert" : "status"}
    >
      {Icon ? (
        <Icon className="h-5 w-5 mt-0.5 shrink-0" />
      ) : null}
      <div className="space-y-1 min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        {description ? (
          <div className="text-sm opacity-90">{description}</div>
        ) : null}
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </div>
  )
}
