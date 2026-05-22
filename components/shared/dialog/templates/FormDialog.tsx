"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { AppDialog, AppDialogBody, type AppDialogProps } from "../AppDialog"
import { AppDialogHeader } from "../AppDialogHeader"
import {
  AppDialogFooter,
  type FooterAction,
} from "../AppDialogFooter"
import { DIALOG_TOKENS } from "../tokens"

export interface FormDialogProps
  extends Pick<
    AppDialogProps,
    "open" | "onOpenChange" | "size" | "maxHeight" | "dismissable" | "hideClose"
  > {
  title: React.ReactNode
  description?: React.ReactNode
  /** Optional small uppercase pill above the title (e.g. "ADMIN ONBOARDING"). */
  headerEyebrow?: React.ReactNode
  /** Optional icon for the header */
  headerIcon?: LucideIcon | React.ReactNode
  /** Optional header status badge */
  headerBadge?: React.ReactNode
  /** Right-aligned header actions */
  headerActions?: React.ReactNode

  /** Form id; primary submit button targets this form via the form= attribute. */
  formId?: string
  /** Submit handler attached to the inner <form> element. Required if you pass children that are form controls. */
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
  /** Disable the primary action while submitting */
  isSubmitting?: boolean
  /** Show loading state on primary action */
  submitLabel?: string
  cancelLabel?: string
  /** Disable primary action (e.g. when validation fails) */
  canSubmit?: boolean
  /** Optional left-side ghost action (e.g. "Save & add another") */
  extraAction?: FooterAction
  /** Hide the footer entirely (rare — only when children render their own actions) */
  hideFooter?: boolean
  /** Padding mode for the dialog. "flush" lets children own layout. */
  padding?: "default" | "flush"
  /** Use a scrollable body region with sticky header/footer (recommended for long forms). */
  scrollBody?: boolean

  className?: string
  /** Class applied to the body region */
  bodyClassName?: string
  children: React.ReactNode
}

/**
 * Standard form dialog: header (title + optional icon + description), scrollable body, footer (cancel + submit).
 * The body content is wrapped in <form id=formId onSubmit=onSubmit> so the footer's submit button works via `form=`.
 */
export function FormDialog({
  open,
  onOpenChange,
  size = "md",
  maxHeight,
  dismissable,
  hideClose,
  title,
  description,
  headerEyebrow,
  headerIcon,
  headerBadge,
  headerActions,
  formId,
  onSubmit,
  isSubmitting,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  canSubmit = true,
  extraAction,
  hideFooter,
  padding = "flush",
  scrollBody = true,
  className,
  bodyClassName,
  children,
}: FormDialogProps) {
  const handleCancel = React.useCallback(() => onOpenChange(false), [onOpenChange])
  const generatedId = React.useId()
  // Auto-generate an id when an onSubmit is provided but no explicit formId — so the footer's submit button can target it.
  const effectiveFormId = formId ?? (onSubmit ? `form-dialog-${generatedId}` : undefined)

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size={size}
      maxHeight={maxHeight}
      dismissable={dismissable}
      hideClose={hideClose}
      padding={padding}
      scrollBody={scrollBody}
      className={className}
    >
      <AppDialogHeader
        title={title}
        description={description}
        eyebrow={headerEyebrow}
        icon={headerIcon}
        badge={headerBadge}
        actions={headerActions}
        sticky={scrollBody}
      />

      <AppDialogBody className={cn(bodyClassName)}>
        {effectiveFormId || onSubmit ? (
          <form id={effectiveFormId} onSubmit={onSubmit} className="space-y-3">
            {children}
          </form>
        ) : (
          <div className="space-y-3">{children}</div>
        )}
      </AppDialogBody>

      {!hideFooter && (
        <AppDialogFooter
          sticky={scrollBody}
          padded
          tertiary={extraAction}
          secondary={{
            label: cancelLabel,
            onClick: handleCancel,
            type: "button",
          }}
          primary={{
            label: submitLabel,
            type: "submit",
            form: effectiveFormId,
            loading: isSubmitting,
            disabled: !canSubmit,
          }}
        />
      )}
    </AppDialog>
  )
}
