"use client"

import * as React from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { DIALOG_TOKENS } from "../tokens"

export interface PickerPendingPanelProps<T> {
  items: T[]
  /** Render a single pending row. Caller controls layout including the remove affordance if not using onRemove. */
  renderRow?: (t: T, index: number) => React.ReactNode
  /** Optional fallback row renderer when renderRow is omitted (uses getLabel + onRemove). */
  getLabel?: (t: T) => React.ReactNode
  /** When set, renders a small X button per row that calls this. */
  onRemove?: (t: T, index: number) => void
  /** Section title. Defaults to "Pending changes". */
  title?: React.ReactNode
  /** Hide when no pending items. Default true. */
  hideWhenEmpty?: boolean
  className?: string
}

/**
 * Pending-selections preview panel. Sits between the picker list and the save action.
 * Shows the in-flight changes so the user can review before committing.
 */
export function PickerPendingPanel<T>({
  items,
  renderRow,
  getLabel,
  onRemove,
  title = "Pending changes",
  hideWhenEmpty = true,
  className,
}: PickerPendingPanelProps<T>) {
  if (hideWhenEmpty && items.length === 0) return null
  return (
    <div className={cn(DIALOG_TOKENS.pickerPendingWrap, className)}>
      <div className="flex items-center justify-between">
        <div className={DIALOG_TOKENS.pickerPendingTitle}>{title}</div>
        <div className="text-xs text-muted-foreground">
          {items.length} item{items.length === 1 ? "" : "s"}
        </div>
      </div>
      <div className="space-y-1.5">
        {items.length === 0 ? (
          <div className="text-xs text-muted-foreground italic">
            No pending changes.
          </div>
        ) : (
          items.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2 rounded-md bg-card px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                {renderRow
                  ? renderRow(item, i)
                  : getLabel
                  ? getLabel(item)
                  : null}
              </div>
              {onRemove ? (
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-primary transition-colors shrink-0"
                  onClick={() => onRemove(item, i)}
                  aria-label="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
