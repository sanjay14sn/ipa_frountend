"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { AlertTriangle, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { DIALOG_TOKENS } from "../tokens"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  /** "default" = brand-green action. "destructive" = red action + warning icon by default. */
  variant?: "default" | "destructive"
  confirmLabel?: string
  cancelLabel?: string
  /** Override the auto-icon (AlertTriangle for destructive) */
  icon?: LucideIcon | null
  onConfirm: () => void | Promise<void>
  isConfirming?: boolean
  /** Disable the confirm button (e.g. additional validation pending) */
  disabled?: boolean
}

/**
 * Confirmation dialog. Built on shadcn AlertDialog (no close X — user must explicitly confirm or cancel).
 * Use destructive variant for irreversible actions; the icon defaults to AlertTriangle.
 *
 * Matches the unified popup chrome: header + body + footer separated by border lines.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  variant = "default",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  icon,
  onConfirm,
  isConfirming,
  disabled,
}: ConfirmDialogProps) {
  const ResolvedIcon =
    icon === undefined ? (variant === "destructive" ? AlertTriangle : null) : icon

  const tone = variant === "destructive" ? "destructive" : "primary"

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault()
    await onConfirm()
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl overflow-hidden p-0 font-sans">
        {/* Header */}
        <div className="border-b border-border px-4 py-4 sm:px-5 flex flex-col space-y-1.5">
          {ResolvedIcon ? (
            <div
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-xl",
                tone === "destructive"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
              )}
            >
              <ResolvedIcon className="h-4 w-4" />
            </div>
          ) : null}
          <AlertDialogTitle className={DIALOG_TOKENS.titleClass}>
            {title}
          </AlertDialogTitle>
          {description ? (
            <AlertDialogDescription className={DIALOG_TOKENS.descriptionClass}>
              {description}
            </AlertDialogDescription>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3 sm:px-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel className="mt-0 rounded-lg" disabled={isConfirming}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={disabled || isConfirming}
            className={cn(
              buttonVariants({
                variant: variant === "destructive" ? "destructive" : "default",
              }),
              "rounded-lg"
            )}
          >
            {isConfirming ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
