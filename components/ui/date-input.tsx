"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const DISPLAY_FORMAT = "dd/MM/yyyy";
const ISO_FORMAT = "yyyy-MM-dd";

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

function isoToDate(iso: string | undefined | null): Date | undefined {
  if (!iso) return undefined;
  const d = parse(iso, ISO_FORMAT, new Date());
  return isValid(d) ? d : undefined;
}

function dateToIso(d: Date): string {
  return format(d, ISO_FORMAT);
}

/**
 * Drop-in replacement for `<Input type="date" />`.
 *
 * Built on react-day-picker (via shadcn Calendar) so it looks and behaves like
 * a proper date picker: the trigger button shows the selected date in
 * dd/MM/yyyy and clicking it opens the calendar. The underlying value stays as
 * ISO yyyy-mm-dd so existing service/API contracts keep working.
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
      placeholder,
      className,
      ...aria
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    const selected = isoToDate(value);
    const minDate = isoToDate(min);
    const maxDate = isoToDate(max);

    const display = selected ? format(selected, DISPLAY_FORMAT) : "";
    const placeholderText = placeholder ?? "dd/mm/yyyy";

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-required={required || undefined}
            className={cn(
              "h-10 w-full justify-start px-3 font-normal",
              !display && "text-muted-foreground",
              className,
            )}
            {...aria}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
            <span className="truncate">{display || placeholderText}</span>
          </Button>
        </PopoverTrigger>
        {/* Hidden input keeps native form submission / required validation working. */}
        <input
          type="hidden"
          name={name}
          value={value ?? ""}
          required={required}
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected ?? maxDate ?? minDate}
            captionLayout="dropdown"
            startMonth={new Date(1950, 0)}
            endMonth={new Date(2100, 11)}
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
              if (!d) {
                onChange?.("");
              } else {
                onChange?.(dateToIso(d));
              }
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
