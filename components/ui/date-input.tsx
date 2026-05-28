"use client";

import * as React from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const ISO_FORMAT = "yyyy-MM-dd";

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
    const [inputText, setInputText] = React.useState("");

    const dateValue = isoToDate(value);
    const minDate = isoToDate(min) ?? undefined;
    const maxDate = isoToDate(max) ?? undefined;

    // Keep text in sync with external value changes
    React.useEffect(() => {
      setInputText(dateValue ? format(dateValue, "dd/MM/yyyy") : "");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    function handleTyping(e: React.ChangeEvent<HTMLInputElement>) {
      const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
      let formatted = digits;
      if (digits.length > 4) {
        formatted =
          digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
      } else if (digits.length > 2) {
        formatted = digits.slice(0, 2) + "/" + digits.slice(2);
      }
      setInputText(formatted);

      if (digits.length === 8) {
        const parsed = parse(formatted, "dd/MM/yyyy", new Date());
        if (isValid(parsed)) onChange?.(dateToIso(parsed));
      } else if (digits.length === 0) {
        onChange?.("");
      }
    }

    return (
      <div className="relative">
        <input
          ref={ref}
          type="text"
          id={id}
          name={name}
          disabled={disabled}
          required={required}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
          value={inputText}
          onChange={handleTyping}
          placeholder={placeholder}
          maxLength={10}
          inputMode="numeric"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
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
