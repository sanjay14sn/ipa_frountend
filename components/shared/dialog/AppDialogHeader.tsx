"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { DIALOG_TOKENS } from "./tokens"
import { AppDialogTitle, AppDialogDescription } from "./AppDialog"

export interface AppDialogHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  /** Optional small uppercase pill badge above the title, e.g. "ADMIN ONBOARDING". */
  eyebrow?: React.ReactNode
  /** Icon (Lucide component or arbitrary node). Rendered in a rounded square next to the title. */
  icon?: LucideIcon | React.ReactNode
  /** Status chip rendered after the title (e.g. "PENDING"). */
  badge?: React.ReactNode
  /** Right-aligned controls next to title (e.g. download button). */
  actions?: React.ReactNode
  /** Render a bottom divider. Default true. */
  divider?: boolean
  /** Sticky-top behavior. Pair with AppDialog scrollBody=true. */
  sticky?: boolean
  className?: string
}

function isComponentIcon(value: unknown): value is LucideIcon {
  return (
    typeof value === "function" ||
    (typeof value === "object" && value !== null && "render" in (value as object))
  )
}

/**
 * Unified popup header. One style used by every popup in the app:
 *   - Optional uppercase eyebrow pill at top
 *   - Title row: icon in rounded square + title (text-2xl) + optional badge + right-aligned actions
 *   - Description below (text-sm muted, max-w-3xl)
 *   - Bottom divider, left-aligned, padded `px-4 py-5 sm:px-5`
 *
 * Matches the "Setup Existing Franchise" reference exactly so every popup looks the same.
 */
export function AppDialogHeader({
  title,
  description,
  eyebrow,
  icon,
  badge,
  actions,
  divider = true,
  sticky,
  className,
}: AppDialogHeaderProps) {
  const Icon = isComponentIcon(icon) ? (icon as LucideIcon) : null
  const customIconNode: React.ReactNode =
    !Icon && icon ? (icon as React.ReactNode) : null

  return (
    <div
      className={cn(
        "shrink-0",
        DIALOG_TOKENS.headerWrap,
        DIALOG_TOKENS.headerPadded,
        divider && DIALOG_TOKENS.headerBordered,
        sticky && "sticky top-0 z-10 bg-card",
        className
      )}
    >
      {eyebrow ? <span className={DIALOG_TOKENS.eyebrowClass}>{eyebrow}</span> : null}

      <div className="flex items-start justify-between gap-3">
        <AppDialogTitle className={DIALOG_TOKENS.titleClass}>
          {Icon ? (
            <span className={DIALOG_TOKENS.iconBubble}>
              <Icon className="h-4 w-4" />
            </span>
          ) : customIconNode ? (
            <span className={DIALOG_TOKENS.iconBubble}>{customIconNode}</span>
          ) : null}
          <span className="min-w-0 truncate">{title}</span>
          {badge ? <span className="shrink-0">{badge}</span> : null}
        </AppDialogTitle>
        {actions ? (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        ) : null}
      </div>

      {description ? (
        <AppDialogDescription className={DIALOG_TOKENS.descriptionClass}>
          {description}
        </AppDialogDescription>
      ) : null}
    </div>
  )
}
