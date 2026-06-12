"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { DIALOG_TOKENS } from "../tokens"

export interface PickerListItemProps {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  title: React.ReactNode
  subtitle?: React.ReactNode
  meta?: React.ReactNode
  /** Right-aligned slot (e.g. quantity input, status badge) */
  trailing?: React.ReactNode
  disabled?: boolean
  className?: string
}

/**
 * Single selectable row in a PickerList. Renders a checkbox + title/subtitle + optional trailing slot.
 */
function PickerListItem({
  checked,
  onCheckedChange,
  title,
  subtitle,
  meta,
  trailing,
  disabled,
  className,
}: PickerListItemProps) {
  return (
    <label
      className={cn(
        DIALOG_TOKENS.pickerListItem,
        disabled && "opacity-60 cursor-not-allowed",
        !disabled && "cursor-pointer",
        className
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(Boolean(v))}
        disabled={disabled}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-card-foreground truncate">
            {title}
          </div>
          {meta ? (
            <span className="text-xs text-muted-foreground shrink-0">{meta}</span>
          ) : null}
        </div>
        {subtitle ? (
          <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
        ) : null}
      </div>
      {trailing ? (
        <div className="shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
          {trailing}
        </div>
      ) : null}
    </label>
  )
}
