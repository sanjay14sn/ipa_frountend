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

    return (
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <div
          ref={ref}
          className={cn("relative w-full", className)}
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
                  // Match shadcn Input: h-10, rounded-md (10px), border #e5e7eb,
                  // ring #064e3b on focus, placeholder muted #6b7280.
                  "& .MuiOutlinedInput-root": {
                    height: 40,
                    borderRadius: "calc(0.75rem - 2px)",
                    fontSize: "0.875rem",
                    fontFamily: "inherit",
                    color: "#064e3b",
                    backgroundColor: "#fafafa",
                    paddingRight: "40px", // space for the calendar icon
                  },
                  "& .MuiOutlinedInput-input": {
                    padding: "8px 12px",
                    fontFamily: "inherit",
                  },
                  // Mute the unfilled format mask sections (DD / MM / YYYY).
                  "& .MuiPickersInputBase-sectionContent[data-placeholder='true'], & .MuiPickersInputBase-sectionsContainer:not(:focus-within) .MuiPickersInputBase-sectionContent":
                    {
                      color: "inherit",
                    },
                  "& .MuiPickersSectionList-root .MuiPickersSectionList-sectionContent:empty + .MuiPickersSectionList-sectionContent, & .MuiPickersOutlinedInput-sectionsContainer .MuiPickersInputBase-sectionContent":
                    {
                      color: "inherit",
                    },
                  "& .MuiPickersInputBase-root.MuiPickersOutlinedInput-root:not(.Mui-focused):not(.MuiPickersInputBase-adornedStart) .MuiPickersInputBase-sectionsContainer":
                    {
                      color: "inherit",
                    },
                  // Default (unfocused) border colour.
                  "& .MuiOutlinedInput-notchedOutline, & .MuiPickersOutlinedInput-notchedOutline":
                    {
                      borderColor: "#e5e7eb",
                      borderWidth: 1,
                    },
                  // Hover state.
                  "&:hover .MuiOutlinedInput-notchedOutline, &:hover .MuiPickersOutlinedInput-notchedOutline":
                    {
                      borderColor: "#e5e7eb",
                    },
                  // Focused: brand-green ring + offset matching shadcn focus-visible.
                  "& .Mui-focused .MuiOutlinedInput-notchedOutline, & .Mui-focused .MuiPickersOutlinedInput-notchedOutline":
                    {
                      borderColor: "#064e3b",
                      borderWidth: 2,
                    },
                  // Disabled state.
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
