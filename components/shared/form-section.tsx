"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface FormSectionProps {
  /** Section title rendered in the tinted band at the top of the card. */
  title?: React.ReactNode
  /** Optional subtitle/description below the title (still inside the title band). */
  description?: React.ReactNode
  /** Right-aligned controls in the title band (e.g. "Add item" button). */
  actions?: React.ReactNode
  /** Drop the tinted title band; keep only the card border + body. */
  noTitleBand?: boolean
  /** Padded body? Default true. Pass false for tables / lists that need flush edges. */
  padded?: boolean
  className?: string
  /** Class applied to the body region only. */
  bodyClassName?: string
  children: React.ReactNode
}

/**
 * Bordered card that wraps a logical section of a form or detail view.
 * Header (tinted band) + body. Matches the "Setup Existing Franchise" section card exactly.
 *
 * Works inside popups, on full pages, or anywhere a grouped form/section is needed.
 */
export function FormSection({
  title,
  description,
  actions,
  noTitleBand,
  padded = true,
  className,
  bodyClassName,
  children,
}: FormSectionProps) {
  const showHeader = !noTitleBand && (title || description || actions)
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className
      )}
    >
      {showHeader ? (
        <header className="flex items-start justify-between gap-3 border-b border-border bg-accent/30 px-4 py-2.5 sm:px-5 font-sans">
          <div className="space-y-0.5 min-w-0">
            {title ? (
              <h3 className="text-sm font-medium leading-snug tracking-tight text-card-foreground">
                {title}
              </h3>
            ) : null}
            {description ? (
              <p className="text-xs leading-snug text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          ) : null}
        </header>
      ) : null}
      <div
        className={cn(
          padded && "px-4 py-4 sm:px-5 font-sans",
          bodyClassName
        )}
      >
        {children}
      </div>
    </section>
  )
}
