"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateField } from "@mui/x-date-pickers/DateField";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
 * Date input built on MUI X DateField (segmented dd/MM/yyyy typing — day,
 * month and year are independent input slots) combined with the shadcn
 * Calendar in a Popover for visual picking.
 *
 * - Type into the field: day slot → arrow/slash → month slot → year slot.
 * - Click the calendar icon: opens the shadcn Calendar to pick a date.
 * - Value in/out stays ISO yyyy-mm-dd so existing API contracts are preserved.
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
          className={cn("flex w-full items-center gap-1", className)}
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
                  // Match shadcn input look (h-10, rounded-md, border-input).
                  "& .MuiOutlinedInput-root": {
                    height: 40,
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontFamily: "inherit",
                    backgroundColor: "hsl(var(--background))",
                    color: "hsl(var(--foreground))",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "hsl(var(--input))",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "hsl(var(--input))",
                  },
                  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                    {
                      borderColor: "hsl(var(--ring))",
                      borderWidth: 1,
                    },
                },
              },
            }}
          />
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={disabled}
                aria-label="Open calendar"
                className="h-10 w-10 shrink-0"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
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
