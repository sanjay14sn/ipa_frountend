"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { DIALOG_TOKENS } from "../tokens"

export interface DialogSectionProps {
  title?: React.ReactNode
  description?: React.ReactNode
  /** Right-aligned controls in the header row (e.g. "Add item" button) */
  actions?: React.ReactNode
  /** Render a top divider + extra spacing — used between stacked sections */
  divider?: boolean
  className?: string
  children: React.ReactNode
}

/**
 * Titled section wrapper inside a dialog body. Provides a consistent
 * (optional) title row and a content area beneath it.
 */
function DialogSection({
  title,
  description,
  actions,
  divider,
  className,
  children,
}: DialogSectionProps) {
  return (
    <section
      className={cn(
        DIALOG_TOKENS.sectionWrap,
        divider && DIALOG_TOKENS.sectionDivider,
        className
      )}
    >
      {(title || description || actions) && (
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            {title ? (
              <h3 className={DIALOG_TOKENS.sectionTitle}>{title}</h3>
            ) : null}
            {description ? (
              <p className={DIALOG_TOKENS.sectionDescription}>{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          ) : null}
        </header>
      )}
      {children}
    </section>
  )
}
