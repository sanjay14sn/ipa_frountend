"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DIALOG_TOKENS } from "./tokens"

export type FooterButtonVariant =
  | "default"
  | "outline"
  | "ghost"
  | "destructive"
  | "secondary"

export interface FooterAction {
  label: React.ReactNode
  onClick?: () => void
  type?: "button" | "submit"
  variant?: FooterButtonVariant
  loading?: boolean
  disabled?: boolean
  icon?: LucideIcon
  /** Reference a form id so a submit button can live outside <form>. */
  form?: string
  /** Optional explicit testId / aria */
  testId?: string
}

export interface AppDialogFooterProps {
  primary?: FooterAction
  secondary?: FooterAction
  tertiary?: FooterAction
  /** Free-form content rendered on the far-left (e.g. "Step 2 of 4") */
  leftSlot?: React.ReactNode
  /** Sticky at bottom inside a scrollBody dialog */
  sticky?: boolean
  /** Top divider; default true when sticky. */
  divider?: boolean
  /** Padded mode: when true, adds px-6 py-4 — used outside the AppDialog default padding. */
  padded?: boolean
  className?: string
}

function ActionButton({ action }: { action: FooterAction }) {
  const Icon = action.icon
  return (
    <Button
      type={action.type ?? "button"}
      variant={action.variant ?? "default"}
      onClick={action.onClick}
      disabled={action.disabled || action.loading}
      form={action.form}
      data-testid={action.testId}
      className="rounded-lg"
    >
      {action.loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : Icon ? (
        <Icon className="h-4 w-4" />
      ) : null}
      {action.label}
    </Button>
  )
}

/**
 * Unified dialog footer. Renders up to three actions (tertiary on the far left, secondary + primary on the right)
 * and an optional leftSlot for status copy. Use sticky=true with AppDialog.scrollBody for long-form dialogs.
 */
export function AppDialogFooter({
  primary,
  secondary,
  tertiary,
  leftSlot,
  sticky,
  divider,
  padded,
  className,
}: AppDialogFooterProps) {
  // Always show the top divider unless explicitly turned off — every popup should
  // visually separate footer from body.
  const effectiveDivider = divider ?? true
  const hasLeft = tertiary || leftSlot

  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:items-center font-sans",
        hasLeft ? "sm:justify-between" : "sm:justify-end",
        effectiveDivider && DIALOG_TOKENS.footerBordered,
        sticky && DIALOG_TOKENS.footerSticky,
        padded && DIALOG_TOKENS.footerPadded,
        sticky && !padded && DIALOG_TOKENS.footerPadded,
        className
      )}
    >
      {hasLeft ? (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {tertiary ? <ActionButton action={{ variant: "ghost", ...tertiary }} /> : null}
          {leftSlot}
        </div>
      ) : null}

      {(secondary || primary) && (
        <div className="flex items-center gap-2 sm:gap-3">
          {secondary ? (
            <ActionButton action={{ variant: "outline", ...secondary }} />
          ) : null}
          {primary ? <ActionButton action={{ variant: "default", ...primary }} /> : null}
        </div>
      )}
    </div>
  )
}
