"use client";

import * as React from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { IMask, IMaskInput } from "react-imask";

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
  /** ISO date string (yyyy-mm-dd) */
  value?: string;
  /** Called with ISO date string or "" when cleared */
  onChange?: (value: string) => void;
  /** ISO yyyy-mm-dd lower bound (inclusive) */
  min?: string;
  /** ISO yyyy-mm-dd upper bound (inclusive) */
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

function isoToDisplay(iso?: string): string {
  const d = isoToDate(iso);
  return d ? format(d, DISPLAY_FORMAT) : "";
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
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
      placeholder = "DD/MM/YYYY",
      className,
      "aria-invalid": ariaInvalid,
      "aria-describedby": ariaDescribedby,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    // Masked display string ("DD/MM/YYYY"); kept in sync with the ISO `value`.
    const [display, setDisplay] = React.useState(() => isoToDisplay(value));

    const dateValue = isoToDate(value);
    const minDate = isoToDate(min) ?? undefined;
    const maxDate = isoToDate(max) ?? undefined;

    // Reflect external value changes (form reset, calendar pick) into the input.
    React.useEffect(() => {
      setDisplay(isoToDisplay(value));
    }, [value]);

    const startYear = minDate?.getFullYear() ?? 1950;
    const endYear = maxDate?.getFullYear() ?? 2100;

    // react-imask date mask: strict DD/MM/YYYY with per-segment range checks.
    const blocks = React.useMemo(
      () => ({
        d: { mask: IMask.MaskedRange, from: 1, to: 31, maxLength: 2, autofix: "pad" as const },
        m: { mask: IMask.MaskedRange, from: 1, to: 12, maxLength: 2, autofix: "pad" as const },
        Y: { mask: IMask.MaskedRange, from: startYear, to: endYear, maxLength: 4 },
      }),
      [startYear, endYear],
    );

    function handleAccept(val: string) {
      setDisplay(val);
      if (!val) {
        onChange?.("");
        return;
      }
      if (val.length === DISPLAY_FORMAT.length) {
        const parsed = parse(val, DISPLAY_FORMAT, new Date());
        if (isValid(parsed)) onChange?.(dateToIso(parsed));
      }
    }

    return (
      <div className="relative">
        <IMaskInput
          mask="d{/}`m{/}`Y"
          blocks={blocks}
          value={display}
          unmask={false}
          onAccept={handleAccept}
          inputRef={ref}
          id={id}
          name={name}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          inputMode="numeric"
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-base ring-offset-background",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
        />
        <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              tabIndex={-1}
              aria-label="Open date picker"
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 focus-visible:outline-none"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              selected={dateValue ?? undefined}
              defaultMonth={dateValue ?? maxDate ?? minDate}
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
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);
DateInput.displayName = "DateInput";

export { DateInput };
