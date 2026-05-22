"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { AppDialog, AppDialogBody, type AppDialogProps } from "../AppDialog"
import { AppDialogHeader } from "../AppDialogHeader"
import { AppDialogFooter } from "../AppDialogFooter"
import { PickerSearch } from "../picker/PickerSearch"
import { PickerList } from "../picker/PickerList"
import { DIALOG_TOKENS } from "../tokens"

export interface PickerDialogProps<T>
  extends Pick<
    AppDialogProps,
    "open" | "onOpenChange" | "size" | "maxHeight" | "dismissable" | "hideClose"
  > {
  /** Render as a floating dialog (default) or as an inline panel (no portal, no overlay). */
  as?: "dialog" | "panel"

  title?: React.ReactNode
  description?: React.ReactNode
  headerEyebrow?: React.ReactNode
  headerIcon?: LucideIcon | React.ReactNode

  /** Items to pick from */
  items: T[]
  isLoading?: boolean
  /** Search state */
  search: { value: string; onChange: (v: string) => void; placeholder?: string; meta?: React.ReactNode }
  getKey: (t: T) => string | number
  isChecked: (t: T) => boolean
  onToggle: (t: T) => void
  renderRow: (t: T, checked: boolean) => React.ReactNode

  /** Optional content above the list (e.g. order dropdown, scope chips) */
  toolbar?: React.ReactNode
  /** Pending-summary panel above the footer */
  pendingPanel?: React.ReactNode

  /** Final action */
  onConfirm: () => void | Promise<void>
  isConfirming?: boolean
  confirmLabel?: string
  cancelLabel?: string
  /** Disable confirm when there's nothing to save */
  hasChanges?: boolean
  /** Hide the footer entirely (caller provides save button elsewhere) */
  hideFooter?: boolean

  emptyMessage?: React.ReactNode
  /** Override the list height utility class. Default uses pickerListWrap's built-in. */
  listHeightClass?: string

  className?: string
  bodyClassName?: string
}

/**
 * Search + checkbox-list + pending-panel picker. Works as a dialog (default) or inline panel (`as="panel"`).
 * In panel mode renders a plain div shell (no portal, no overlay) so it can be embedded in pages like inventory.
 */
export function PickerDialog<T>({
  as = "dialog",
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
  items,
  isLoading,
  search,
  getKey,
  isChecked,
  onToggle,
  renderRow,
  toolbar,
  pendingPanel,
  onConfirm,
  isConfirming,
  confirmLabel = "Save",
  cancelLabel = "Cancel",
  hasChanges = true,
  hideFooter,
  emptyMessage,
  listHeightClass,
  className,
  bodyClassName,
}: PickerDialogProps<T>) {
  const body = (
    <>
      <PickerSearch
        value={search.value}
        onChange={search.onChange}
        placeholder={search.placeholder}
        meta={search.meta}
      />
      {toolbar}
      <PickerList
        items={items}
        getKey={getKey}
        isChecked={isChecked}
        onToggle={onToggle}
        renderRow={renderRow}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        heightClass={listHeightClass}
      />
      {pendingPanel}
    </>
  )

  if (as === "panel") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-border bg-card p-4 space-y-3",
          className
        )}
      >
        {(title || description) && (
          <header className="space-y-1">
            {title ? (
              <h3 className={DIALOG_TOKENS.sectionTitle}>{title}</h3>
            ) : null}
            {description ? (
              <p className={DIALOG_TOKENS.sectionDescription}>{description}</p>
            ) : null}
          </header>
        )}
        <div className={cn("space-y-3", bodyClassName)}>{body}</div>
        {!hideFooter ? (
          <AppDialogFooter
            primary={{
              label: confirmLabel,
              onClick: onConfirm,
              loading: isConfirming,
              disabled: !hasChanges,
            }}
          />
        ) : null}
      </div>
    )
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size={size}
      maxHeight={maxHeight}
      dismissable={dismissable}
      hideClose={hideClose}
      padding="flush"
      scrollBody
      className={className}
    >
      {(title || description) && (
        <AppDialogHeader
          title={title ?? ""}
          description={description}
          eyebrow={headerEyebrow}
          icon={headerIcon}
          sticky
        />
      )}
      <AppDialogBody className={cn("space-y-3", bodyClassName)}>{body}</AppDialogBody>
      {!hideFooter ? (
        <AppDialogFooter
          sticky
          padded
          secondary={{
            label: cancelLabel,
            onClick: () => onOpenChange(false),
          }}
          primary={{
            label: confirmLabel,
            onClick: onConfirm,
            loading: isConfirming,
            disabled: !hasChanges,
          }}
        />
      ) : null}
    </AppDialog>
  )
}
