"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const ISO_FORMAT = "yyyy-MM-dd";
const DISPLAY_FORMAT = "dd/MM/yyyy";

export interface DateInputProps {
  /** ISO date string (yyyy-mm-dd) — matches native input[type=date] value semantics. */
  value?: string;
  /** Called with an ISO date string (yyyy-mm-dd) or "" when cleared. */
  onChange?: (value: string) => void;
  /** ISO yyyy-mm-dd lower bound (inclusive). */
  min?: string;
  /** ISO yyyy-mm-dd upper bound (inclusive). */
  max?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

function isoToDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = parse(iso, ISO_FORMAT, new Date());
  return isValid(d) ? d : null;
}

function dateToIso(d: Date): string {
  return format(d, ISO_FORMAT);
}

/**
 * Shadcn date picker: a trigger button that shows the selected date and opens
 * a Calendar popover for picking. Value in/out is ISO yyyy-mm-dd.
 */
const DateInput = React.forwardRef<HTMLButtonElement, DateInputProps>(
  (
    {
      value,
      onChange,
      min,
      max,
      id,
      name,
      disabled,
      required,
      placeholder = "DD / MM / YYYY",
      className,
      "aria-invalid": ariaInvalid,
      "aria-describedby": ariaDescribedby,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    const dateValue = isoToDate(value);
    const minDate = isoToDate(min) ?? undefined;
    const maxDate = isoToDate(max) ?? undefined;

    return (
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            type="button"
            id={id}
            name={name}
            disabled={disabled}
            aria-required={required}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedby}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              !dateValue && "text-muted-foreground",
              className,
            )}
          >
            <span className="truncate">
              {dateValue ? format(dateValue, "dd/MM/yyyy") : placeholder}
            </span>
            <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateValue ?? undefined}
            defaultMonth={dateValue ?? maxDate ?? minDate}
            captionLayout="dropdown"
            startMonth={minDate ?? new Date(1950, 0)}
            endMonth={maxDate ?? new Date(2100, 11)}
            disabled={
              minDate || maxDate
                ? (d: Date) => {
                    if (minDate && d < minDate) return true;
                    if (maxDate && d > maxDate) return true;
                    return false;
                  }
                : undefined
            }
            onSelect={(d: Date | undefined) => {
              if (!d) return;
              onChange?.(dateToIso(d));
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  },
);
DateInput.displayName = "DateInput";

export { DateInput };
