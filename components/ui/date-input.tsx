"use client";

import * as React from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { cn } from "@/lib/utils";
import { dpYears, renderDpHeader } from "@/components/ui/date-picker-header";

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

function assignRef(ref: React.Ref<HTMLInputElement> | undefined, node: HTMLInputElement | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(node);
  else (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
}

/**
 * Styled text input handed to react-datepicker via `customInput`. It mirrors
 * the shared shadcn `Input` so the date field is visually identical to every
 * other form field (height, border, focus ring), with room for the trailing
 * calendar icon (`pr-10`).
 *
 * react-datepicker injects its own ref through `inputRef` (see `customInputRef`
 * below); we merge it with the consumer-forwarded `ref` so both reach the DOM.
 */
const FieldInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & { inputRef?: React.Ref<HTMLInputElement> }
>(({ className, inputRef, ...props }, ref) => {
  const setRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      assignRef(ref, node);
      assignRef(inputRef, node);
    },
    [ref, inputRef],
  );
  return (
    <input
      ref={setRef}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-base ring-offset-background",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
});
FieldInput.displayName = "DateFieldInput";

/**
 * Date field backed by `react-datepicker`. Accepts/emits ISO `yyyy-MM-dd`
 * strings, displays/parses `DD/MM/YYYY`, and supports both keyboard entry and
 * a themed calendar popup. The popup is intentionally not portalled so it stays
 * inside any surrounding Radix dialog's DOM (and never dismisses it).
 */
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
    const selected = isoToDate(value);
    const minDate = isoToDate(min) ?? undefined;
    const maxDate = isoToDate(max) ?? undefined;

    const startYear = minDate?.getFullYear() ?? 1950;
    const endYear = maxDate?.getFullYear() ?? 2100;
    const years = React.useMemo(
      () => dpYears(startYear, endYear),
      [startYear, endYear],
    );

    return (
      <div className="dp-field relative">
        <DatePicker
          selected={selected}
          onChange={(d: Date | null) =>
            onChange?.(d && isValid(d) ? dateToIso(d) : "")
          }
          dateFormat="dd/MM/yyyy"
          placeholderText={placeholder}
          minDate={minDate}
          maxDate={maxDate}
          openToDate={selected ?? maxDate ?? minDate ?? undefined}
          disabled={disabled}
          required={required}
          id={id}
          name={name}
          showPopperArrow={false}
          popperClassName="dp-theme"
          customInputRef="inputRef"
          renderCustomHeader={renderDpHeader(years)}
          customInput={
            <FieldInput
              ref={ref}
              className={className}
              aria-invalid={ariaInvalid}
              aria-describedby={ariaDescribedby}
            />
          }
        />
        <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
      </div>
    );
  },
);
DateInput.displayName = "DateInput";

export { DateInput };
