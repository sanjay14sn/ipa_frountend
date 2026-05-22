"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { Plus, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AppDialog, AppDialogBody, type AppDialogProps } from "../AppDialog"
import { AppDialogHeader } from "../AppDialogHeader"
import { AppDialogFooter } from "../AppDialogFooter"
import { DIALOG_TOKENS } from "../tokens"

export interface MappingDialogProps<TOption, TRow>
  extends Pick<
    AppDialogProps,
    "open" | "onOpenChange" | "size" | "maxHeight" | "dismissable" | "hideClose"
  > {
  as?: "dialog" | "panel"

  title?: React.ReactNode
  description?: React.ReactNode
  headerEyebrow?: React.ReactNode
  headerIcon?: LucideIcon | React.ReactNode

  /** Picker control rendered above the rows. Caller owns the combobox/dropdown UI;
   * this slot just composes it in the consistent location. */
  picker: React.ReactNode

  /** Currently selected rows (could be drafts pending save) */
  rows: TRow[]
  /** Renderer for a single row (caller controls qty/cost/lead-time inputs) */
  renderRow: (row: TRow, index: number) => React.ReactNode
  getRowKey?: (row: TRow, index: number) => string | number
  /** When set, renders a default trash-button column. Otherwise caller handles via renderRow. */
  onRemoveRow?: (row: TRow, index: number) => void

  /** Optional content above the rows table */
  summary?: React.ReactNode
  emptyMessage?: React.ReactNode

  /** Save action */
  onSave: () => void | Promise<void>
  isSaving?: boolean
  saveLabel?: string
  cancelLabel?: string
  hasChanges?: boolean
  hideFooter?: boolean

  className?: string
  bodyClassName?: string
  /** Hide section titles if you want compact rendering inside another shell */
  hideHeader?: boolean
}

/**
 * Combobox + selected-rows-table editor used for many-to-many mappings (kit items, supplier sourcing, etc.).
 * Caller supplies the picker control (a Command/Popover combo, a Select, etc.) and the row renderer.
 */
export function MappingDialog<TOption, TRow>({
  as = "dialog",
  open,
  onOpenChange,
  size = "lg",
  maxHeight,
  dismissable,
  hideClose,
  title,
  description,
  headerEyebrow,
  headerIcon,
  picker,
  rows,
  renderRow,
  getRowKey,
  onRemoveRow,
  summary,
  emptyMessage = "No items added yet.",
  onSave,
  isSaving,
  saveLabel = "Save changes",
  cancelLabel = "Cancel",
  hasChanges = true,
  hideFooter,
  className,
  bodyClassName,
  hideHeader,
}: MappingDialogProps<TOption, TRow>) {
  const rowsBody = (
    <div className="rounded-lg border border-border bg-card divide-y divide-border max-h-80 overflow-y-auto scrollbar-green">
      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        rows.map((row, i) => (
          <div
            key={getRowKey ? getRowKey(row, i) : i}
            className="flex items-center gap-3 px-3 py-2.5"
          >
            <div className="flex-1 min-w-0">{renderRow(row, i)}</div>
            {onRemoveRow ? (
              <button
                type="button"
                className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
                onClick={() => onRemoveRow(row, i)}
                aria-label="Remove row"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ))
      )}
    </div>
  )

  const body = (
    <>
      {summary}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Plus className="h-3.5 w-3.5" />
          <span>Add item</span>
        </div>
        {picker}
      </div>
      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Selected ({rows.length})
        </div>
        {rowsBody}
      </div>
    </>
  )

  if (as === "panel") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-border bg-card p-4 space-y-4",
          className
        )}
      >
        {!hideHeader && (title || description) ? (
          <header className="space-y-1">
            {title ? (
              <h3 className={DIALOG_TOKENS.sectionTitle}>{title}</h3>
            ) : null}
            {description ? (
              <p className={DIALOG_TOKENS.sectionDescription}>{description}</p>
            ) : null}
          </header>
        ) : null}
        <div className={cn("space-y-4", bodyClassName)}>{body}</div>
        {!hideFooter ? (
          <AppDialogFooter
            primary={{
              label: saveLabel,
              onClick: onSave,
              loading: isSaving,
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
      <AppDialogBody className={cn("space-y-4", bodyClassName)}>{body}</AppDialogBody>
      {!hideFooter ? (
        <AppDialogFooter
          sticky
          padded
          secondary={{
            label: cancelLabel,
            onClick: () => onOpenChange(false),
          }}
          primary={{
            label: saveLabel,
            onClick: onSave,
            loading: isSaving,
            disabled: !hasChanges,
          }}
        />
      ) : null}
    </AppDialog>
  )
}
