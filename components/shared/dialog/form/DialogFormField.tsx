"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { DIALOG_TOKENS } from "../tokens"

export interface DialogFormFieldProps {
  /** htmlFor target; if omitted, label is not focusable to the control */
  id?: string
  label?: React.ReactNode
  required?: boolean
  /** Inline error text under the control. When provided, hint is hidden. */
  error?: React.ReactNode
  /** Helper text under the control */
  hint?: React.ReactNode
  /** Slot rendered between label and control (e.g. extra context badges) */
  meta?: React.ReactNode
  /** When true, label is visually hidden (still announced to screen readers) */
  hideLabel?: boolean
  className?: string
  /** The actual control: Input/Select/Textarea/Controller render result */
  children: React.ReactNode
}

/**
 * Control-agnostic field wrapper. Provides consistent label + asterisk + error/hint layout
 * around any underlying control (Input, Select, Textarea, Controller-rendered field).
 * Does NOT restyle the control itself.
 */
export function DialogFormField({
  id,
  label,
  required,
  error,
  hint,
  meta,
  hideLabel,
  className,
  children,
}: DialogFormFieldProps) {
  const showError = Boolean(error)
  return (
    <div className={cn(DIALOG_TOKENS.fieldWrap, className)}>
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <Label
            htmlFor={id}
            className={cn(DIALOG_TOKENS.fieldLabel, hideLabel && "sr-only")}
          >
            {label}
            {required ? (
              <span className={DIALOG_TOKENS.fieldRequiredMark} aria-hidden>
                *
              </span>
            ) : null}
          </Label>
          {meta ? <div className="text-xs text-muted-foreground">{meta}</div> : null}
        </div>
      ) : null}
      {children}
      {showError ? (
        <p className={DIALOG_TOKENS.fieldError}>{error}</p>
      ) : hint ? (
        <p className={DIALOG_TOKENS.fieldHint}>{hint}</p>
      ) : null}
    </div>
  )
}
