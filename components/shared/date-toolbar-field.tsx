"use client";

import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";

export interface DateToolbarFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * The standard toolbar date control for list filter bars (promoted from
 * procurement-utils — a move, not a redesign).
 */
export function DateToolbarField({
  label,
  value,
  onChange,
}: DateToolbarFieldProps) {
  return (
    <div data-testid="date-toolbar-field" className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <DateInput
        value={value}
        onChange={(v) => onChange(v)}
        className="w-full min-w-[170px] sm:w-[170px]"
      />
    </div>
  );
}
