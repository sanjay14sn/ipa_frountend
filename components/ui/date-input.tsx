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

function dateToDisplay(d: Date | null): string {
  if (!d) return "";
  return format(d, DISPLAY_FORMAT);
}

function displayToIso(display: string): string | null {
  if (!display) return null;
  const d = parse(display, DISPLAY_FORMAT, new Date());
  return isValid(d) ? dateToIso(d) : null;
}

const DateInput = React.forwardRef<HTMLDivElement, DateInputProps>(
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
      placeholder = "dd/mm/yyyy",
      className,
      ...aria
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(
      () => dateToDisplay(isoToDate(value)),
    );

    React.useEffect(() => {
      setInputValue(dateToDisplay(isoToDate(value)));
    }, [value]);

    const dateValue = isoToDate(value);
    const minDate = isoToDate(min) ?? undefined;
    const maxDate = isoToDate(max) ?? undefined;

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value;
      setInputValue(raw);
      const iso = displayToIso(raw);
      if (iso) {
        onChange?.(iso);
      } else if (raw === "") {
        onChange?.("");
      }
    }

    function handleBlur() {
      if (dateValue) setInputValue(dateToDisplay(dateValue));
    }

    return (
      <div
        ref={ref}
        className={cn("date-input-wrapper relative w-full", className)}
      >
        <input
          type="text"
          id={id}
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          {...aria}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            aria["aria-invalid"] && "border-destructive",
          )}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label="Open calendar"
              tabIndex={-1}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
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
      </div>
    );
  },
);
DateInput.displayName = "DateInput";

export { DateInput };
