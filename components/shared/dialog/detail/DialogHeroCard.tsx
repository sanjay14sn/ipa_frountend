"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { DIALOG_TOKENS } from "../tokens"

export type HeroBadgeTone =
  | "success"
  | "pending"
  | "warning"
  | "destructive"
  | "neutral"

export interface DialogHeroCardProps {
  title: React.ReactNode
  description?: React.ReactNode
  status?: { label: React.ReactNode; tone?: HeroBadgeTone }
  /** Right-aligned action (e.g. <Button>Download</Button>) */
  action?: React.ReactNode
  icon?: LucideIcon
  className?: string
  /** Extra content rendered below the title row (e.g. metadata strip) */
  children?: React.ReactNode
}

const TONE_CLASS: Record<HeroBadgeTone, string> = {
  success: "bg-primary text-primary-foreground border-primary",
  pending:
    "bg-amber-100 text-amber-900 border-amber-200",
  warning:
    "bg-amber-100 text-amber-900 border-amber-200",
  destructive: "bg-red-100 text-destructive border-red-200",
  neutral:
    "bg-muted text-card-foreground border-border",
}

/**
 * Hero card placed at the top of a DetailDialog. Bordered card with title + description + optional status badge + action.
 * Matches the existing CIAgreementDetail top-card pattern.
 */
function DialogHeroCard({
  title,
  description,
  status,
  action,
  icon: Icon,
  className,
  children,
}: DialogHeroCardProps) {
  return (
    <div className={cn(DIALOG_TOKENS.heroCardWrap, className)}>
      <div className={DIALOG_TOKENS.heroCardTitleRow}>
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {Icon ? (
              <span className={DIALOG_TOKENS.iconBubble}>
                <Icon className="h-4 w-4" />
              </span>
            ) : null}
            <h3 className={DIALOG_TOKENS.heroCardTitle}>{title}</h3>
            {status ? (
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  TONE_CLASS[status.tone ?? "neutral"]
                )}
              >
                {status.label}
              </Badge>
            ) : null}
          </div>
          {description ? (
            <p className={DIALOG_TOKENS.heroCardDescription}>{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </div>
  )
}
