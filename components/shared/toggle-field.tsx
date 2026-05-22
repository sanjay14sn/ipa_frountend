"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export type ToggleFieldVariant = "card" | "inline"
export type ToggleFieldTone = "default" | "primary"

export interface ToggleFieldOption<T extends string = string> {
  value: T
  label: React.ReactNode
  /** Optional helper rendered under the option label when selected. */
  description?: React.ReactNode
  /** Hint shown next to the label even when not selected (e.g. "Recommended"). */
  hint?: React.ReactNode
  disabled?: boolean
}

export interface ToggleFieldProps<T extends string = string> {
  /** Currently selected option value. */
  value: T
  /** Called when the user picks a different option. */
  onValueChange: (value: T) => void

  /** Options to choose from. Two or more. */
  options: ReadonlyArray<ToggleFieldOption<T>>

  /** Optional section header label. */
  label?: React.ReactNode
  /** Optional section description (shown next to label). */
  description?: React.ReactNode
  /** Optional Lucide icon shown next to the section label. */
  icon?: LucideIcon

  /** "card" = bordered, padded section with header + options + selected-description (default). "inline" = bare options row. */
  variant?: ToggleFieldVariant
  /** Card tone. "default" = neutral muted. "primary" = green-tinted. */
  tone?: ToggleFieldTone

  /** Layout for the options. "row" = horizontal (default). "stack" = vertical. */
  orientation?: "row" | "stack"

  /** HTML name for the underlying radio group (auto-generated if omitted). */
  name?: string
  disabled?: boolean
  className?: string
}

/**
 * Common option-picker component. Renders the ENTIRE section — bordered card, header,
 * radio options, and the selected option's description text — so consumers only supply
 * the option list and the value.
 *
 * @example
 *   <ToggleField
 *     icon={User}
 *     label="Student type"
 *     value={existing ? "existing" : "new"}
 *     onValueChange={(v) => setExisting(v === "existing")}
 *     options={[
 *       { value: "new", label: "New student", description: "Brand new registration." },
 *       { value: "existing", label: "Existing student", description: "Already enrolled in your franchise." },
 *     ]}
 *   />
 *
 * @example
 *   // Inline (no card): just radio buttons in a row
 *   <ToggleField
 *     variant="inline"
 *     value={mode}
 *     onValueChange={setMode}
 *     options={[
 *       { value: "active", label: "Active" },
 *       { value: "inactive", label: "Inactive" },
 *     ]}
 *   />
 */
export function ToggleField<T extends string = string>({
  value,
  onValueChange,
  options,
  label,
  description,
  icon: Icon,
  variant = "card",
  tone = "default",
  orientation = "row",
  name,
  disabled,
  className,
}: ToggleFieldProps<T>) {
  const generatedName = React.useId()
  const effectiveName = name ?? `toggle-${generatedName}`
  const selected = options.find((o) => o.value === value)

  const radioItems = (
    <RadioGroup
      name={effectiveName}
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      disabled={disabled}
      className={cn(
        orientation === "row"
          ? "grid-flow-col auto-cols-max gap-6"
          : "gap-2"
      )}
    >
      {options.map((opt) => {
        const itemId = `${effectiveName}-${opt.value}`
        return (
          <div key={opt.value} className="flex items-center gap-2">
            <RadioGroupItem
              id={itemId}
              value={opt.value}
              disabled={opt.disabled}
            />
            <Label
              htmlFor={itemId}
              className={cn(
                "text-sm font-medium leading-none text-card-foreground cursor-pointer",
                (disabled || opt.disabled) && "opacity-60 cursor-not-allowed"
              )}
            >
              {opt.label}
              {opt.hint ? (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {opt.hint}
                </span>
              ) : null}
            </Label>
          </div>
        )
      })}
    </RadioGroup>
  )

  if (variant === "inline") {
    return <div className={cn("font-sans", className)}>{radioItems}</div>
  }

  const toneClass =
    tone === "primary"
      ? "border-primary/20 bg-primary/5"
      : "border-border bg-muted/30"

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 font-sans space-y-3",
        toneClass,
        className
      )}
    >
      {(label || description || Icon) && (
        <div className="flex items-start gap-2">
          {Icon ? (
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          ) : null}
          <div className="space-y-0.5 min-w-0">
            {label ? (
              <div className="text-sm font-medium leading-none text-card-foreground">
                {label}
              </div>
            ) : null}
            {description ? (
              <p className="text-xs leading-snug text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {radioItems}

      {selected?.description ? (
        <p className="text-xs leading-snug text-muted-foreground">
          {selected.description}
        </p>
      ) : null}
    </div>
  )
}
