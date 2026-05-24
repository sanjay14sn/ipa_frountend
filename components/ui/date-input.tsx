"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateField } from "@mui/x-date-pickers/DateField";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  /** Ignored — MUI DateField uses the format mask as placeholder. Kept for API compatibility. */
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
 * MUI X `DateField` (segmented dd/MM/yyyy typing) styled to match the
 * shadcn/Tailwind theme, with a calendar icon inside the field that opens
 * the shadcn Calendar in a Popover for visual picking.
 *
 * Value in/out is ISO yyyy-mm-dd so existing API contracts are preserved.
 */
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
      className,
      ...aria
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    const dateValue = isoToDate(value);
    const minDate = isoToDate(min) ?? undefined;
    const maxDate = isoToDate(max) ?? undefined;

    const isEmpty = dateValue == null;

    return (
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <div
          ref={ref}
          data-empty={isEmpty || undefined}
          className={cn("date-input-wrapper relative w-full", className)}
        >
          <DateField
            value={dateValue}
            onChange={(newValue: Date | null) => {
              if (newValue && isValid(newValue)) {
                onChange?.(dateToIso(newValue));
              } else if (newValue === null) {
                onChange?.("");
              }
            }}
            format="dd/MM/yyyy"
            minDate={minDate}
            maxDate={maxDate}
            disabled={disabled}
            required={required}
            id={id}
            name={name}
            size="small"
            slotProps={{
              textField: {
                fullWidth: true,
                ...aria,
                sx: {
                  // Root: match shadcn Input shell (h-10, rounded-md, bg).
                  "& .MuiPickersOutlinedInput-root": {
                    height: 40,
                    borderRadius: "calc(0.75rem - 2px)",
                    fontSize: "0.875rem",
                    fontFamily: "inherit",
                    color: "#064e3b",
                    backgroundColor: "#fafafa",
                    paddingRight: "40px",
                    paddingLeft: 0,
                  },
                  // Sections (DD / MM / YYYY) — inner padding mirrors shadcn px-3 py-2.
                  "& .MuiPickersSectionList-root": {
                    padding: "8px 12px",
                  },
                  "& .MuiPickersSectionList-sectionContent, & .MuiPickersSectionList-sectionSeparator":
                    {
                      fontFamily: "inherit",
                    },
                  // Default (unfocused) 1px border matching shadcn border-input.
                  "& .MuiPickersOutlinedInput-notchedOutline": {
                    borderColor: "#e5e7eb",
                    borderWidth: 1,
                  },
                  "&:hover .MuiPickersOutlinedInput-notchedOutline": {
                    borderColor: "#e5e7eb",
                  },
                  // Focused: stay 1px to avoid the visual "thickening".
                  "& .MuiPickersOutlinedInput-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
                    {
                      borderColor: "#064e3b",
                      borderWidth: 1,
                    },
                  "& .Mui-disabled": {
                    opacity: 0.5,
                    cursor: "not-allowed",
                  },
                },
              },
            }}
          />
          {/* Calendar icon overlaying the right side of the input — opens the
              shadcn Calendar popover. */}
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
      </LocalizationProvider>
    );
  },
);
DateInput.displayName = "DateInput";

export { DateInput };
