"use client"

import * as React from "react"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { DIALOG_TOKENS } from "../tokens"

export interface PickerSearchProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  /** Right-aligned summary (e.g. "12 of 50") */
  meta?: React.ReactNode
  /** Disable the input */
  disabled?: boolean
  className?: string
}

/**
 * Search input for picker lists. Renders an icon + input + optional right meta.
 */
export function PickerSearch({
  value,
  onChange,
  placeholder = "Search…",
  meta,
  disabled,
  className,
}: PickerSearchProps) {
  return (
    <div className={cn(DIALOG_TOKENS.pickerSearchWrap, className)}>
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 rounded-lg"
        />
      </div>
      {meta ? (
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {meta}
        </div>
      ) : null}
    </div>
  )
}
