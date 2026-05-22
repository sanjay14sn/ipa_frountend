"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { DIALOG_TOKENS } from "../tokens"

export interface PickerListProps<T> {
  items: T[]
  getKey: (t: T) => string | number
  isChecked: (t: T) => boolean
  onToggle: (t: T) => void
  /** Custom row renderer; if omitted, item is rendered as a generic PickerListItem via children prop. */
  renderRow: (t: T, checked: boolean) => React.ReactNode
  isLoading?: boolean
  emptyMessage?: React.ReactNode
  /** Max-height utility (e.g. "h-72" / "max-h-96"). Default uses token. */
  heightClass?: string
  className?: string
}

/**
 * Generic checkbox/selectable list. Parent controls selection state and row content.
 * Container handles scroll, borders, and dividers via DIALOG_TOKENS.pickerListWrap.
 */
export function PickerList<T>({
  items,
  getKey,
  isChecked,
  onToggle: _onToggle,
  renderRow,
  isLoading,
  emptyMessage = "No items to display.",
  heightClass,
  className,
}: PickerListProps<T>) {
  const inner = React.useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          Loading…
        </div>
      )
    }
    if (!items.length) {
      return (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )
    }
    return items.map((item) => {
      const key = getKey(item)
      return (
        <React.Fragment key={key}>
          {renderRow(item, isChecked(item))}
        </React.Fragment>
      )
    })
  }, [items, isLoading, emptyMessage, getKey, renderRow, isChecked])

  return (
    <div
      className={cn(
        DIALOG_TOKENS.pickerListWrap,
        heightClass,
        className
      )}
    >
      {inner}
    </div>
  )
}
