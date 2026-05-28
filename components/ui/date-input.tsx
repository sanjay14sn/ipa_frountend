"use client";

import * as React from "react";
import { format, isValid, parse } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { cn } from "@/lib/utils";

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

const TriggerInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
      "ring-offset-background placeholder:text-muted-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TriggerInput.displayName = "TriggerInput";

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
    const dateValue = isoToDate(value);
    const minDate = isoToDate(min) ?? undefined;
    const maxDate = isoToDate(max) ?? undefined;

    return (
      <DatePicker
        selected={dateValue}
        onChange={(date: Date | null) =>
          onChange?.(date ? dateToIso(date) : "")
        }
        dateFormat="dd/MM/yyyy"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        minDate={minDate}
        maxDate={maxDate}
        yearDropdownItemNumber={100}
        scrollableYearDropdown
        placeholderText={placeholder}
        disabled={disabled}
        wrapperClassName="w-full"
        popperClassName="z-[200]"
        customInput={
          <TriggerInput
            ref={ref}
            id={id}
            name={name}
            required={required}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedby}
            className={className}
          />
        }
      />
    );
  },
);
DateInput.displayName = "DateInput";

export { DateInput };
