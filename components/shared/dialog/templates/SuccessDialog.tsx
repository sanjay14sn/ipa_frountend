"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { CheckCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AppDialog } from "../AppDialog"
import {
  AppDialogTitle,
  AppDialogDescription,
} from "../AppDialog"
import { DIALOG_TOKENS } from "../tokens"

export interface SuccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  /** Override the default CheckCircle */
  icon?: LucideIcon
  /** Primary action label; defaults to "Close" */
  actionLabel?: string
  /** Called when the primary action is clicked. Defaults to closing the dialog. */
  onAction?: () => void
  /** Optional secondary action e.g. "View details" */
  secondaryAction?: { label: string; onClick: () => void }
  /** Render extra content between the description and the action */
  children?: React.ReactNode
}

/**
 * Celebratory success dialog. Centered green-bubble icon + title + description + a single primary action.
 * Extracted from the previously duplicated success-state blocks in request-franchise / request-programs / franchise-application.
 */
export function SuccessDialog({
  open,
  onOpenChange,
  title,
  description,
  icon: IconProp,
  actionLabel = "Close",
  onAction,
  secondaryAction,
  children,
}: SuccessDialogProps) {
  const Icon = IconProp ?? CheckCircle
  const handleAction = () => {
    if (onAction) onAction()
    else onOpenChange(false)
  }
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      padding="default"
    >
      <div className="flex flex-col items-center text-center space-y-3 px-2 py-2">
        <div className={DIALOG_TOKENS.iconBubbleSuccess}>
          <Icon className="h-9 w-9" />
        </div>
        <AppDialogTitle className="text-2xl font-semibold leading-tight tracking-tight text-card-foreground text-center">
          {title}
        </AppDialogTitle>
        {description ? (
          <AppDialogDescription className="text-center">
            {description}
          </AppDialogDescription>
        ) : null}
        {children}
        <div className="flex w-full flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          {secondaryAction ? (
            <Button
              variant="outline"
              className="rounded-lg sm:w-auto"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          ) : null}
          <Button
            className="rounded-lg w-full sm:w-auto"
            onClick={handleAction}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </AppDialog>
  )
}
